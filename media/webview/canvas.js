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

    // How many pixels from each edge counts as "at the wall/floor/ceiling"
    const SURFACE_MARGIN = 4;

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

            _drawRotated(x, y, frameWidth, frameHeight, rotation, () => {
                if (mirror) { ctx.scale(-1, 1); }
                ctx.drawImage(
                    this._drawSource,
                    col * this._srcFrameW, row * this._srcFrameH, this._srcFrameW, this._srcFrameH,
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
    // own timer — drawImage() captures whichever frame is current at each tick.
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
    // Mascot
    // -------------------------------------------------------------------------

    class Mascot {
        constructor(definition, name) {
            this.name     = name || '';
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

            switch (this.surface) {
                case Surface.FLOOR:
                    this.x += SPEED * dir;
                    if (this.x <= SURFACE_MARGIN) {
                        this.x = SURFACE_MARGIN;
                        this._transitionToSurface(Surface.LEFT_WALL, MoveDir.POSITIVE);
                    } else if (this.x + fw >= canvas.width - SURFACE_MARGIN) {
                        this.x = canvas.width - fw - SURFACE_MARGIN;
                        this._transitionToSurface(Surface.RIGHT_WALL, MoveDir.NEGATIVE);
                    }
                    break;

                case Surface.LEFT_WALL:
                    this.y -= SPEED * dir;
                    if (this.y <= SURFACE_MARGIN) {
                        this.y = SURFACE_MARGIN;
                        this._transitionToSurface(Surface.CEILING, MoveDir.POSITIVE);
                    } else if (this.y + fh >= canvas.height - SURFACE_MARGIN) {
                        this.y = canvas.height - fh - SURFACE_MARGIN;
                        this._transitionToSurface(Surface.FLOOR, MoveDir.POSITIVE);
                    }
                    break;

                case Surface.CEILING:
                    this.x += SPEED * dir;
                    if (this.x + fw >= canvas.width - SURFACE_MARGIN) {
                        this.x = canvas.width - fw - SURFACE_MARGIN;
                        this._transitionToSurface(Surface.RIGHT_WALL, MoveDir.POSITIVE);
                    } else if (this.x <= SURFACE_MARGIN) {
                        this.x = SURFACE_MARGIN;
                        this._transitionToSurface(Surface.LEFT_WALL, MoveDir.NEGATIVE);
                    }
                    break;

                case Surface.RIGHT_WALL:
                    this.y += SPEED * dir;
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

        draw() {
            const x = Math.round(this.x);
            const y = Math.round(this.y);

            this.renderer.draw(x, y, this._spriteState(), this.frame, this._rotation());

            if (this.name && this.surface === Surface.FLOOR) {
                _drawName(this.name, x + this.renderer.frameWidth / 2, y - 6);
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
            m.draw();
        }

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // -------------------------------------------------------------------------
    // Badge strip
    // -------------------------------------------------------------------------

    function renderBadges(badges, profileUrl) {
        badgeStrip.innerHTML = '';
        if (badges.length === 0) { return; }

        for (const badge of badges) {
            const link = document.createElement('a');
            link.href = badge.badgeUrl || profileUrl;
            link.title = `${badge.name} — ${badge.issuerName}`;
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
                const { mascot, count, name } = event.data;
                for (let i = 0; i < (count ?? 1); i++) {
                    mascots.push(new Mascot(mascot, name));
                }
                break;
            }
            case 'removeAllPets':
                mascots.length = 0;
                break;
            case 'updateBadges':
                renderBadges(event.data.badges ?? [], event.data.profileUrl ?? '');
                break;
        }
    });

    vscode.postMessage({ command: 'ready' });
})();
