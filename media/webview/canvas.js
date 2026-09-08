(function () {
    'use strict';

    const vscode = acquireVsCodeApi();
    const canvas = document.getElementById('petCanvas');
    const ctx = canvas.getContext('2d');
    const badgeStrip = document.getElementById('badge-strip');
    const script = document.currentScript;

    const SPEED = parseFloat(script.dataset.speed ?? '2');
    const ANIMATION_FPS = 8;
    const FRAME_MS = 1000 / ANIMATION_FPS;
    const INTERACTION_EMOTE_URI = script.dataset.interactionEmote || null;

    // How many pixels from each edge counts as "at the wall/floor/ceiling"
    const SURFACE_MARGIN = 4;

    // Click-reaction bounce
    const REACT_DURATION = 350;
    const REACT_BOUNCE_HEIGHT = 8;

    // Pet-to-pet proximity interaction
    const INTERACTION_DISTANCE = 40;
    const INTERACTION_CHANCE = 0.5;

    const mascots = [];
    let lastTick = 0;

    // -------------------------------------------------------------------------
    // Canvas sizing
    // -------------------------------------------------------------------------

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - (badgeStrip.offsetHeight || 0);
        for (const m of mascots) { m.clampToSurface(); }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // -------------------------------------------------------------------------
    // Surface and movement state
    // -------------------------------------------------------------------------

    const Surface = Object.freeze({
        FLOOR:       'floor',
        LEFT_WALL:   'leftWall',
        CEILING:     'ceiling',
        RIGHT_WALL:  'rightWall'
    });

    // Which direction along a surface (the "forward" direction for that surface)
    const MoveDir = Object.freeze({
        POSITIVE: 1,   // right on floor/ceiling, up on walls
        NEGATIVE: -1
    });

    const PetState = Object.freeze({
        IDLE:  'idle',
        WALK:  'walk',
        CLIMB: 'climb'
    });

    // Sprite facing keys sent to the renderer
    const SpriteState = Object.freeze({
        IDLE:       'idle',
        WALK_RIGHT: 'walkRight',
        WALK_LEFT:  'walkLeft'
    });

    // -------------------------------------------------------------------------
    // Renderers
    // -------------------------------------------------------------------------

    class PngSheetRenderer {
        constructor(config) {
            this.config = config;
            this._mirrorLeft = config.rows.walkLeft === undefined;
            this._srcFrameW  = null;
            this._srcFrameH  = null;
            this._drawSource = null; // offscreen canvas when tinted, else raw Image

            this.img = new Image();
            this.img.src = config.src;
            this.ready = false;
            this.img.onload = () => {
                const rowCount = Math.max(
                    config.rows.idle      ?? 0,
                    config.rows.walkRight ?? 0,
                    config.rows.walkLeft  ?? 0
                ) + 1;
                this._srcFrameW = this.img.naturalWidth  / config.framesPerRow;
                this._srcFrameH = this.img.naturalHeight / rowCount;

                if (config.tintable && config.tintColor) {
                    this._drawSource = _applyChromaTint(
                        this.img,
                        config.chromaColor ?? '#FF00FF',
                        config.tintColor
                    );
                } else {
                    this._drawSource = this.img;
                }

                this.ready = true;
            };
        }

        draw(x, y, spriteState, frame, rotation) {
            if (!this.ready) { return; }
            const { frameWidth, frameHeight, framesPerRow, rows } = this.config;

            let sourceState = spriteState;
            let mirror = false;
            if (spriteState === SpriteState.WALK_LEFT && this._mirrorLeft) {
                sourceState = SpriteState.WALK_RIGHT;
                mirror = true;
            }

            const row = rows[sourceState] ?? 0;
            const col = frame % framesPerRow;
            const pad = this.config.framePadding ?? 0;

            _drawRotated(x, y, frameWidth, frameHeight, rotation, () => {
                if (mirror) { ctx.scale(-1, 1); }
                ctx.drawImage(
                    this._drawSource,
                    col * this._srcFrameW + pad, row * this._srcFrameH + pad,
                    this._srcFrameW - pad * 2, this._srcFrameH - pad * 2,
                    -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight
                );
            });
        }

        get frameWidth()  { return this.config.frameWidth; }
        get frameHeight() { return this.config.frameHeight; }
    }

    class SvgFramesRenderer {
        constructor(config) {
            this.config = config;
            this._frames = {};
            this._mirrorLeft = config.frames.walkLeft.length === 0;

            const load = src => {
                const img = new Image();
                img.src = src;
                img._ready = false;
                img.onload = () => { img._ready = true; };
                return img;
            };

            this._frames[SpriteState.IDLE]       = config.frames.idle.map(load);
            this._frames[SpriteState.WALK_RIGHT]  = config.frames.walkRight.map(load);
            this._frames[SpriteState.WALK_LEFT]   = this._mirrorLeft
                ? this._frames[SpriteState.WALK_RIGHT]
                : config.frames.walkLeft.map(load);
        }

        draw(x, y, spriteState, frame, rotation) {
            const frames = this._frames[spriteState] ?? this._frames[SpriteState.IDLE];
            if (!frames || frames.length === 0) { return; }
            const img = frames[frame % frames.length];
            if (!img._ready) { return; }

            const { frameWidth, frameHeight } = this.config;
            const mirror = spriteState === SpriteState.WALK_LEFT && this._mirrorLeft;

            _drawRotated(x, y, frameWidth, frameHeight, rotation, () => {
                if (mirror) {
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
                } else {
                    ctx.drawImage(img, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
                }
            });
        }

        get frameWidth()  { return this.config.frameWidth; }
        get frameHeight() { return this.config.frameHeight; }
    }

    // -------------------------------------------------------------------------
    // GIF renderer
    // Loads one animated GIF per state. The browser advances GIF frames on its
    // own timer; drawImage() captures whichever frame is current at each tick.
    // No frame math needed; the GIF just plays itself.
    // -------------------------------------------------------------------------

    class GifRenderer {
        constructor(config) {
            this.config = config;
            this._mirrorLeft = !config.frames.walkLeft;

            const load = src => {
                const img = new Image();
                img.src = src;
                img._ready = false;
                img.onload = () => { img._ready = true; };
                return img;
            };

            this._idle      = load(config.frames.idle);
            this._walkRight = load(config.frames.walkRight);
            this._walkLeft  = this._mirrorLeft
                ? this._walkRight
                : load(config.frames.walkLeft);
        }

        draw(x, y, spriteState, _frame, rotation) {
            let img, mirror = false;

            if (spriteState === SpriteState.IDLE) {
                img = this._idle;
            } else if (spriteState === SpriteState.WALK_RIGHT) {
                img = this._walkRight;
            } else {
                img = this._walkLeft;
                mirror = this._mirrorLeft;
            }

            if (!img || !img._ready) { return; }

            const { frameWidth, frameHeight } = this.config;
            _drawRotated(x, y, frameWidth, frameHeight, rotation, () => {
                if (mirror) { ctx.scale(-1, 1); }
                ctx.drawImage(img, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
            });
        }

        get frameWidth()  { return this.config.frameWidth; }
        get frameHeight() { return this.config.frameHeight; }
    }

    // Pixel-swap chroma tint: replaces all pixels matching chromaHex (within
    // tolerance) with tintHex. Returns an offscreen canvas ready for drawImage.
    function _applyChromaTint(img, chromaHex, tintHex) {
        const offscreen = document.createElement('canvas');
        offscreen.width  = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const octx = offscreen.getContext('2d');
        octx.drawImage(img, 0, 0);

        const imageData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
        const d = imageData.data;

        const cr = parseInt(chromaHex.slice(1, 3), 16);
        const cg = parseInt(chromaHex.slice(3, 5), 16);
        const cb = parseInt(chromaHex.slice(5, 7), 16);
        const tr = parseInt(tintHex.slice(1, 3), 16);
        const tg = parseInt(tintHex.slice(3, 5), 16);
        const tb = parseInt(tintHex.slice(5, 7), 16);
        const TOLERANCE = 150;

        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 10) { continue; } // skip fully transparent pixels
            const dr = d[i]     - cr;
            const dg = d[i + 1] - cg;
            const db = d[i + 2] - cb;
            if ((dr * dr + dg * dg + db * db) < TOLERANCE * TOLERANCE) {
                d[i]     = tr;
                d[i + 1] = tg;
                d[i + 2] = tb;
            }
        }

        octx.putImageData(imageData, 0, 0);
        return offscreen;
    }

    // Draw centred on (x, y) with a rotation in radians
    function _drawRotated(x, y, w, h, rotation, drawFn) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(rotation);
        drawFn();
        ctx.restore();
    }

    // -------------------------------------------------------------------------
    // Sign: a badge/logo held above the mascot. Drawn in the mascot's local
    // (pre-rotation) coordinate space, so it rotates along with the mascot on
    // walls and ceiling, same as a physically held object would.
    // -------------------------------------------------------------------------

    const SIGN_WIDTH  = 48;
    const SIGN_HEIGHT = 55;
    const SIGN_GAP    = 12;

    class SignRenderer {
        constructor(sign) {
            this.ready = false;
            this.linkUrl = sign.linkUrl || null;
            this._loaded = 0;

            const onLoad = () => {
                this._loaded++;
                if (this._loaded === 2) { this.ready = true; }
            };

            this._template = new Image();
            this._template.onload = onLoad;
            this._template.src = sign.templateUri;

            this._badge = new Image();
            this._badge.onload = onLoad;
            this._badge.src = sign.badgeImageUri;
        }

        // Called from inside the mascot's rotated transform: (0, 0) is the
        // mascot's own center, so this positions the sign relative to that.
        draw(frameHeight) {
            if (!this.ready) { return; }

            const x = -SIGN_WIDTH / 2;
            const y = -frameHeight / 2 - SIGN_HEIGHT - SIGN_GAP;

            ctx.drawImage(this._template, x, y, SIGN_WIDTH, SIGN_HEIGHT);

            // Centered inside the square body, with real padding on every side
            const badgeSize = SIGN_WIDTH * 0.7;
            const badgeX = x + SIGN_WIDTH / 2 - badgeSize / 2;
            const badgeY = y + SIGN_HEIGHT * 0.4375 - badgeSize / 2;
            ctx.drawImage(this._badge, badgeX, badgeY, badgeSize, badgeSize);
        }

        // (localX, localY) are already in the mascot's local, pre-rotation
        // coordinate space (same space draw() renders into).
        hitTest(localX, localY, frameHeight) {
            if (!this.ready) { return false; }
            const left   = -SIGN_WIDTH / 2;
            const right  = SIGN_WIDTH / 2;
            const bottom = -frameHeight / 2 - SIGN_GAP;
            const top    = bottom - SIGN_HEIGHT;
            return localX >= left && localX <= right && localY >= top && localY <= bottom;
        }
    }

    // -------------------------------------------------------------------------
    // Emote: a brief reaction icon shown above the head, e.g. on click.
    // Deliberately independent of SignRenderer: emotes are transient and
    // single-image, signs are persistent and template+badge composited.
    // -------------------------------------------------------------------------

    const EMOTE_SIZE     = 40;
    const EMOTE_GAP      = 12;
    const EMOTE_DURATION = 1800;

    class EmoteRenderer {
        constructor(imageUri) {
            this.ready = false;
            this._img = new Image();
            this._img.onload = () => { this.ready = true; };
            this._img.src = imageUri;
        }

        // Called from inside the mascot's rotated transform: (0, 0) is the
        // mascot's own center, so this positions the emote relative to that.
        draw(frameHeight) {
            if (!this.ready) { return; }
            const x = -EMOTE_SIZE / 2;
            const y = -frameHeight / 2 - EMOTE_SIZE - EMOTE_GAP;
            ctx.drawImage(this._img, x, y, EMOTE_SIZE, EMOTE_SIZE);
        }
    }

    // -------------------------------------------------------------------------
    // Mascot
    // -------------------------------------------------------------------------

    class Mascot {
        constructor(definition, opts = {}) {
            const { name, sign, id, speedMultiplier, clickEmote, clickEmoteEnabled } = opts;
            this.id       = id || null;
            this.name     = name || '';
            this.speedMultiplier = speedMultiplier || 1;
            this.signRenderer  = sign ? new SignRenderer(sign) : null;
            this.emoteRenderer = clickEmote ? new EmoteRenderer(clickEmote) : null;
            this.clickEmoteEnabled = clickEmoteEnabled !== false;
            this.emoteUntil = 0;

            // Pet-to-pet interaction emote, deliberately separate from the
            // personal click emote above, so the two never overwrite each other.
            this._interactionEmoteRenderer = null;
            this.interactionEmoteUntil = 0;
            this._eventEmoteRenderer = null;
            this.eventEmoteUntil = 0;
            this._greetedNeighbor = false;
            const sprite = definition.sprite;
            if (sprite.type === 'png-sheet') {
                this.renderer = new PngSheetRenderer(sprite);
            } else if (sprite.type === 'gif') {
                this.renderer = new GifRenderer(sprite);
            } else {
                this.renderer = new SvgFramesRenderer(sprite);
            }

            const fw = this.renderer.frameWidth;
            const fh = this.renderer.frameHeight;

            // Start on the floor at a random x
            this.surface  = Surface.FLOOR;
            this.moveDir  = MoveDir.POSITIVE;
            this.petState = PetState.IDLE;

            // (x, y) is always the top-left of the bounding box
            this.x = Math.random() * Math.max(0, canvas.width - fw);
            this.y = canvas.height - fh - SURFACE_MARGIN;

            this.frame       = 0;
            this.lastFrameAt = 0;
            this.idleElapsed = 0;
            this.idleDuration = _randomIdleDuration();
            this.reactUntil = 0;
        }

        /** Triggers a brief "noticed" bounce, e.g. in response to a click. */
        react(now) {
            this.reactUntil = now + REACT_DURATION;
        }

        /** Shows this pet's click emote briefly, if it has one and it's enabled. */
        showEmote(now) {
            if (this.emoteRenderer && this.clickEmoteEnabled) {
                this.emoteUntil = now + EMOTE_DURATION;
            }
        }

        /** Shows a shared pet-to-pet interaction emote briefly, and pauses
         *  this pet (holding its idle pose) for exactly as long as it's shown. */
        showInteractionEmote(now, renderer) {
            this._interactionEmoteRenderer = renderer;
            this.interactionEmoteUntil = now + EMOTE_DURATION;
            this.petState = PetState.IDLE;
            this.idleElapsed = 0;
            this.idleDuration = EMOTE_DURATION;
        }

        /** Shows an event-triggered emote from the extension host. This is
         *  independent of the pet's personal click emote choice. */
        showEventEmote(now, renderer) {
            this._eventEmoteRenderer = renderer;
            this.eventEmoteUntil = now + EMOTE_DURATION;
        }

        // Converts a canvas point into this mascot's local, pre-rotation
        // coordinate space, the same space its sprite and sign are drawn in.
        _toLocalPoint(px, py) {
            const fw = this.renderer.frameWidth;
            const fh = this.renderer.frameHeight;
            const cx = this.x + fw / 2;
            const cy = this.y + fh / 2;
            const rotation = this._rotation();
            const dx = px - cx;
            const dy = py - cy;
            const cos = Math.cos(-rotation);
            const sin = Math.sin(-rotation);
            return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
        }

        // Returns 'sign', 'body', or null
        hitTest(px, py) {
            const local = this._toLocalPoint(px, py);
            const fw = this.renderer.frameWidth;
            const fh = this.renderer.frameHeight;

            if (this.signRenderer && this.signRenderer.hitTest(local.x, local.y, fh)) {
                return 'sign';
            }

            if (local.x >= -fw / 2 && local.x <= fw / 2 && local.y >= -fh / 2 && local.y <= fh / 2) {
                return 'body';
            }

            return null;
        }

        update(now, deltaMs) {
            // Advance animation frame
            if (now - this.lastFrameAt >= FRAME_MS) {
                this.frame++;
                this.lastFrameAt = now;
            }

            if (this.petState === PetState.IDLE) {
                this.idleElapsed += deltaMs;
                if (this.idleElapsed >= this.idleDuration) {
                    this.moveDir  = Math.random() < 0.5 ? MoveDir.POSITIVE : MoveDir.NEGATIVE;
                    this.petState = PetState.WALK;
                    this.idleElapsed = 0;
                    this.idleDuration = _randomIdleDuration();
                    this.frame = 0;
                }
                return;
            }

            this._move();
        }

        _move() {
            const fw = this.renderer.frameWidth;
            const fh = this.renderer.frameHeight;
            const dir = this.moveDir;
            const speed = SPEED * this.speedMultiplier;

            switch (this.surface) {
                case Surface.FLOOR:
                    this.x += speed * dir;
                    if (this.x <= SURFACE_MARGIN) {
                        this.x = SURFACE_MARGIN;
                        this._transitionToSurface(Surface.LEFT_WALL, MoveDir.POSITIVE);
                    } else if (this.x + fw >= canvas.width - SURFACE_MARGIN) {
                        this.x = canvas.width - fw - SURFACE_MARGIN;
                        this._transitionToSurface(Surface.RIGHT_WALL, MoveDir.NEGATIVE);
                    }
                    break;

                case Surface.LEFT_WALL:
                    this.y -= speed * dir;
                    if (this.y <= SURFACE_MARGIN) {
                        this.y = SURFACE_MARGIN;
                        this._transitionToSurface(Surface.CEILING, MoveDir.POSITIVE);
                    } else if (this.y + fh >= canvas.height - SURFACE_MARGIN) {
                        this.y = canvas.height - fh - SURFACE_MARGIN;
                        this._transitionToSurface(Surface.FLOOR, MoveDir.POSITIVE);
                    }
                    break;

                case Surface.CEILING:
                    this.x += speed * dir;
                    if (this.x + fw >= canvas.width - SURFACE_MARGIN) {
                        this.x = canvas.width - fw - SURFACE_MARGIN;
                        this._transitionToSurface(Surface.RIGHT_WALL, MoveDir.POSITIVE);
                    } else if (this.x <= SURFACE_MARGIN) {
                        this.x = SURFACE_MARGIN;
                        this._transitionToSurface(Surface.LEFT_WALL, MoveDir.NEGATIVE);
                    }
                    break;

                case Surface.RIGHT_WALL:
                    this.y += speed * dir;
                    if (this.y + fh >= canvas.height - SURFACE_MARGIN) {
                        this.y = canvas.height - fh - SURFACE_MARGIN;
                        this._transitionToSurface(Surface.FLOOR, MoveDir.NEGATIVE);
                    } else if (this.y <= SURFACE_MARGIN) {
                        this.y = SURFACE_MARGIN;
                        this._transitionToSurface(Surface.CEILING, MoveDir.NEGATIVE);
                    }
                    break;
            }
        }

        _transitionToSurface(newSurface, newDir) {
            this.surface  = newSurface;
            this.moveDir  = newDir;
            this.frame    = 0;
            if (Math.random() < 0.15) { this.petState = PetState.IDLE; }
            this._snapToSurface();
        }

        _snapToSurface() {
            const fw = this.renderer.frameWidth;
            const fh = this.renderer.frameHeight;
            switch (this.surface) {
                case Surface.FLOOR:      this.y = canvas.height - fh - SURFACE_MARGIN; break;
                case Surface.CEILING:    this.y = SURFACE_MARGIN; break;
                case Surface.LEFT_WALL:  this.x = SURFACE_MARGIN; break;
                case Surface.RIGHT_WALL: this.x = canvas.width - fw - SURFACE_MARGIN; break;
            }
        }

        clampToSurface() {
            this._snapToSurface();
        }

        // Feet point toward the surface, head away.
        // LEFT_WALL:  +π/2 → feet point left  (toward wall), head points right
        // RIGHT_WALL: -π/2 → feet point right (toward wall), head points left
        // CEILING:     π   → feet point up    (toward ceiling), head points down
        _rotation() {
            switch (this.surface) {
                case Surface.LEFT_WALL:  return  Math.PI / 2;
                case Surface.RIGHT_WALL: return -Math.PI / 2;
                case Surface.CEILING:    return  Math.PI;
                default:                 return  0;
            }
        }

        _spriteState() {
            if (this.petState === PetState.IDLE) { return SpriteState.IDLE; }
            // On walls and ceiling the rotation inverts the apparent walk direction
            switch (this.surface) {
                case Surface.LEFT_WALL:
                case Surface.RIGHT_WALL:
                case Surface.CEILING:
                    return this.moveDir === MoveDir.POSITIVE
                        ? SpriteState.WALK_LEFT
                        : SpriteState.WALK_RIGHT;
                default:
                    return this.moveDir === MoveDir.POSITIVE
                        ? SpriteState.WALK_RIGHT
                        : SpriteState.WALK_LEFT;
            }
        }

        draw(now) {
            let x = Math.round(this.x);
            let y = Math.round(this.y);

            const rotation = this._rotation();

            if (this.reactUntil && now < this.reactUntil) {
                const progress = 1 - (this.reactUntil - now) / REACT_DURATION;
                const bounce = Math.sin(progress * Math.PI) * REACT_BOUNCE_HEIGHT;
                // Bounce in the mascot's own "away from the surface" direction,
                // rotated into whatever world-space direction that is right now.
                x += Math.round(bounce * Math.sin(rotation));
                y -= Math.round(bounce * Math.cos(rotation));
            }
            this.renderer.draw(x, y, this._spriteState(), this.frame, rotation);

            if (this.name && this.surface === Surface.FLOOR) {
                _drawName(this.name, x + this.renderer.frameWidth / 2, y - 6);
            }

            // Precedence for the above-head slot: pet interaction > VS Code
            // event > click emote > sign. Each one resumes automatically once
            // whichever is ahead of it expires, no explicit restore needed.
            const fw = this.renderer.frameWidth;
            const fh = this.renderer.frameHeight;

            if (this._interactionEmoteRenderer && now < this.interactionEmoteUntil) {
                _drawRotated(x, y, fw, fh, rotation, () => {
                    this._interactionEmoteRenderer.draw(fh);
                });
            } else if (this._eventEmoteRenderer && now < this.eventEmoteUntil) {
                _drawRotated(x, y, fw, fh, rotation, () => {
                    this._eventEmoteRenderer.draw(fh);
                });
            } else if (this.emoteRenderer && now < this.emoteUntil) {
                _drawRotated(x, y, fw, fh, rotation, () => {
                    this.emoteRenderer.draw(fh);
                });
            } else if (this.signRenderer) {
                _drawRotated(x, y, fw, fh, rotation, () => {
                    this.signRenderer.draw(fh);
                });
            }
        }
    }

    function _randomIdleDuration() {
        return 800 + Math.random() * 1500;
    }

    function _drawName(name, cx, y) {
        ctx.save();
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillText(name, cx + 1, y + 1);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(name, cx, y);
        ctx.restore();
    }

    // -------------------------------------------------------------------------
    // Render loop
    // -------------------------------------------------------------------------

    function tick(now) {
        const delta = lastTick === 0 ? 16 : now - lastTick;
        lastTick = now;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const m of mascots) {
            m.update(now, delta);
        }
        _checkPetInteractions(now);
        for (const m of mascots) {
            m.draw(now);
        }

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // -------------------------------------------------------------------------
    // Pet-to-pet proximity interactions, reuses the Emote system, no new
    // sprite frames needed. Good enough for a handful of pets; with several
    // clustered together the "already greeted" tracking can be imprecise,
    // acceptable for an occasional flourish rather than core logic.
    // -------------------------------------------------------------------------

    let _interactionEmoteRenderer = null;
    const _eventEmoteRenderers = new Map();

    function _getInteractionEmoteRenderer() {
        if (!INTERACTION_EMOTE_URI) { return null; }
        if (!_interactionEmoteRenderer) {
            _interactionEmoteRenderer = new EmoteRenderer(INTERACTION_EMOTE_URI);
        }
        return _interactionEmoteRenderer;
    }

    function _getEventEmoteRenderer(imageUri) {
        if (!imageUri) { return null; }
        if (!_eventEmoteRenderers.has(imageUri)) {
            _eventEmoteRenderers.set(imageUri, new EmoteRenderer(imageUri));
        }
        return _eventEmoteRenderers.get(imageUri);
    }

    function _eventTargets(target, id) {
        if (id) {
            const found = mascots.find(m => m.id === id);
            return found ? [found] : [];
        }
        if (target === 'all') { return mascots; }
        if (mascots.length === 0) { return []; }
        return [mascots[Math.floor(Math.random() * mascots.length)]];
    }

    function _showEventEmote(eventData) {
        const renderer = _getEventEmoteRenderer(eventData.emote);
        if (!renderer) { return; }

        const now = performance.now();
        for (const m of _eventTargets(eventData.target, eventData.id)) {
            m.showEventEmote(now, renderer);
            if (eventData.bounce !== false) {
                m.react(now);
            }
        }
    }

    function _checkPetInteractions(now) {
        const renderer = _getInteractionEmoteRenderer();
        if (!renderer) { return; }

        for (let i = 0; i < mascots.length; i++) {
            const a = mascots[i];
            if (a.surface !== Surface.FLOOR) { continue; }

            for (let j = i + 1; j < mascots.length; j++) {
                const b = mascots[j];
                if (b.surface !== Surface.FLOOR) { continue; }

                const centerA = a.x + a.renderer.frameWidth / 2;
                const centerB = b.x + b.renderer.frameWidth / 2;
                const near = Math.abs(centerA - centerB) < INTERACTION_DISTANCE;

                if (near && !a._greetedNeighbor && !b._greetedNeighbor) {
                    if (Math.random() < INTERACTION_CHANCE) {
                        a.showInteractionEmote(now, renderer);
                        b.showInteractionEmote(now, renderer);
                        a.react(now);
                        b.react(now);
                    }
                    a._greetedNeighbor = true;
                    b._greetedNeighbor = true;
                } else if (!near) {
                    a._greetedNeighbor = false;
                    b._greetedNeighbor = false;
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Click handling: hit-test topmost-first, react to a body click, open the
    // badge's link (if any) on a sign click.
    // -------------------------------------------------------------------------

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        for (let i = mascots.length - 1; i >= 0; i--) {
            const m = mascots[i];
            const hit = m.hitTest(clickX, clickY);
            if (!hit) { continue; }

            const now = performance.now();

            if (hit === 'sign' && m.signRenderer.linkUrl) {
                vscode.postMessage({ command: 'openLink', url: m.signRenderer.linkUrl });
            }

            if (hit === 'body') {
                m.showEmote(now);
            }

            m.react(now);
            break;
        }
    });

    // -------------------------------------------------------------------------
    // Badge strip
    // -------------------------------------------------------------------------

    function renderBadges(badges, profileUrl) {
        badgeStrip.innerHTML = '';
        if (badges.length === 0) { return; }

        for (const badge of badges) {
            const link = document.createElement('a');
            link.href = badge.badgeUrl || profileUrl;
            link.title = `${badge.name} (${badge.issuerName})`;
            link.setAttribute('aria-label', badge.name);

            const img = document.createElement('img');
            img.src = badge.imageUrl;
            img.alt = badge.name;
            img.className = 'badge-icon';

            link.appendChild(img);
            badgeStrip.appendChild(link);
        }

        resizeCanvas();
    }

    // -------------------------------------------------------------------------
    // Messages from extension host
    // -------------------------------------------------------------------------

    window.addEventListener('message', (event) => {
        const { command } = event.data;
        switch (command) {
            case 'spawnPets': {
                const { mascot, count, name, sign, ids, speedMultiplier, clickEmote, clickEmoteEnabled } = event.data;
                for (let i = 0; i < (count ?? 1); i++) {
                    mascots.push(new Mascot(mascot, {
                        name,
                        sign,
                        id: ids ? ids[i] : undefined,
                        speedMultiplier,
                        clickEmote,
                        clickEmoteEnabled
                    }));
                }
                break;
            }
            case 'removeAllPets':
                mascots.length = 0;
                break;
            case 'removePet': {
                const index = mascots.findIndex(m => m.id === event.data.id);
                if (index !== -1) { mascots.splice(index, 1); }
                break;
            }
            case 'updatePet': {
                const target = mascots.find(m => m.id === event.data.id);
                if (target && typeof event.data.speedMultiplier === 'number') {
                    target.speedMultiplier = event.data.speedMultiplier;
                }
                break;
            }
            case 'showEmote':
                _showEventEmote(event.data);
                break;
            case 'updateBadges':
                renderBadges(event.data.badges ?? [], event.data.profileUrl ?? '');
                break;
        }
    });

    vscode.postMessage({ command: 'ready' });
})();
