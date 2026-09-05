import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { MascotDefinition, SavedPet, SpriteConfig } from './mascots/types';
import { MascotRegistry } from './mascots/MascotRegistry';
import { BadgeRegistry } from './mascots/BadgeRegistry';
import { EmoteRegistry } from './mascots/EmoteRegistry';
import { ThemeManager } from './themes/ThemeManager';
import { CredlyService } from './credly/CredlyService';

interface ResolvedSign {
    templateUri: string;
    badgeImageUri: string;
    linkUrl?: string;
}

interface SpawnOptions {
    name?: string;
    tintColor?: string;
    signBadgeId?: string;
    clickEmoteId?: string;
}

export type EventReactionId =
    | 'fileSaved'
    | 'taskSucceeded'
    | 'taskFailed'
    | 'terminalOpened'
    | 'debugStarted'
    | 'debugStopped';

type EmoteTarget = 'all' | 'random';

interface EventReactionConfig {
    enabled: boolean;
    emoteId: string;
    target: EmoteTarget;
    bounce: boolean;
}

type EventReactionOverrides = Partial<Record<EventReactionId, Partial<EventReactionConfig>>>;

const EVENT_REACTION_DEFAULTS: Record<EventReactionId, EventReactionConfig> = {
    fileSaved:      { enabled: true, emoteId: 'sparkle',  target: 'random', bounce: true },
    taskSucceeded:  { enabled: true, emoteId: 'checkmark', target: 'random', bounce: true },
    taskFailed:     { enabled: true, emoteId: 'x-mark',    target: 'random', bounce: true },
    terminalOpened: { enabled: true, emoteId: 'terminal',  target: 'random', bounce: true },
    debugStarted:   { enabled: true, emoteId: 'bug',       target: 'random', bounce: true },
    debugStopped:   { enabled: true, emoteId: 'stop',      target: 'random', bounce: false }
} as const;

const BADGE_FEATURES_ENABLED = false;

export class PetViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'pnpPets.petView';

    private _view?: vscode.WebviewView;
    private _activePets: SavedPet[] = [];
    private readonly _savedPetsKey = 'pnpPets.savedPets';

    constructor(private readonly _context: vscode.ExtensionContext) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._context.extensionUri, 'media')
            ]
        };

        webviewView.webview.html = this._buildHtml();

        webviewView.webview.onDidReceiveMessage(
            async (msg: { command: string }) => this._handleMessage(msg)
        );
    }

    /** Spawns pets from settings — used on panel load and config change. */
    public spawnPets() {
        if (!this._view) { return; }

        const config = vscode.workspace.getConfiguration('pnpPets');
        const mascotId = config.get<string>('mascot', 'parker');
        const count = config.get<number>('petCount', 1);
        const mascot = MascotRegistry.get(mascotId);

        if (!mascot) {
            vscode.window.showWarningMessage(
                `Mascot "${mascotId}" not found. Check your pnpPets.mascot setting.`
            );
            return;
        }

        const tintColor = mascot.sprite.type === 'png-sheet' && mascot.sprite.tintable
            ? mascot.sprite.defaultTintColor ?? '#7B48CC'
            : undefined;

        this._postSpawn(mascot, count, { tintColor });
    }

    /** Interactive spawn — QuickPick mascot, optional name, add one at a time. */
    public async spawnInteractive() {
        const all = MascotRegistry.getAll();

        const picked = await vscode.window.showQuickPick(
            all.map(m => ({
                label: m.name,
                description: m.description,
                detail: m.tags.map(t => `#${t}`).join('  '),
                mascot: m
            })),
            { placeHolder: 'Choose a mascot to add' }
        );

        if (!picked) { return; }

        let tintColor: string | undefined;
        if (picked.mascot.sprite.type === 'png-sheet' && picked.mascot.sprite.tintable) {
            const result = await _pickTintColor();
            if (result === undefined) { return; }   // user pressed Escape — cancel spawn
            tintColor = result ?? undefined;         // null (no tint) → leave tintColor unset
        }

        let signBadgeId: string | undefined;
        if (BADGE_FEATURES_ENABLED && BadgeRegistry.getAll().length > 0) {
            const result = await _pickSign();
            if (result === undefined) { return; }    // user pressed Escape — cancel spawn
            signBadgeId = result ?? undefined;       // null (no sign) → leave signBadgeId unset
        }

        let clickEmoteId: string | undefined;
        if (EmoteRegistry.getAll().length > 0) {
            const result = await _pickClickEmote();
            if (result === undefined) { return; }     // user pressed Escape — cancel spawn
            clickEmoteId = result ?? undefined;       // null (none) → leave clickEmoteId unset
        }

        const name = await vscode.window.showInputBox({
            prompt: 'Give your pet a name (optional)',
            placeHolder: randomPetName(picked.mascot.name),
            value: randomPetName(picked.mascot.name)
        });

        if (name === undefined) { return; }  // user pressed Escape

        this._postSpawn(picked.mascot, 1, {
            name: name || randomPetName(picked.mascot.name),
            tintColor,
            signBadgeId,
            clickEmoteId
        });
    }

    private _postSpawn(mascot: MascotDefinition, count: number, opts: SpawnOptions = {}) {
        const { name, tintColor, signBadgeId, clickEmoteId } = opts;
        const ids = Array.from({ length: count ?? 1 }, () => crypto.randomUUID());

        this._view?.webview.postMessage({
            command: 'spawnPets',
            mascot: this._resolveUris(mascot, tintColor),
            sign: this._resolveSign(signBadgeId),
            clickEmote: this._resolveEmoteUri(clickEmoteId),
            clickEmoteEnabled: true,
            count,
            name,
            ids
        });

        for (const id of ids) {
            this._activePets.push({
                id, mascotId: mascot.id, name: name ?? '', tintColor, signBadgeId, clickEmoteId
            });
        }
        this._persistActivePets();
    }

    public removeAllPets() {
        this._view?.webview.postMessage({ command: 'removeAllPets' });
        this._activePets = [];
        this._persistActivePets();
    }

    /** QuickPick one active pet, then remove just that one. */
    public async removePetInteractive() {
        const pet = await this._pickActivePet('Choose a pet to remove');
        if (!pet) { return; }

        this._view?.webview.postMessage({ command: 'removePet', id: pet.id });
        this._activePets = this._activePets.filter(p => p.id !== pet.id);
        this._persistActivePets();
    }

    /** QuickPick one active pet, then a new speed, applied live without respawning. */
    public async adjustPetSpeedInteractive() {
        const pet = await this._pickActivePet('Choose a pet to speed up or slow down');
        if (!pet) { return; }

        const picked = await vscode.window.showQuickPick(SPEED_PRESETS, {
            placeHolder: 'Pick a new speed for this pet'
        });
        if (!picked) { return; }

        pet.speedMultiplier = picked.multiplier;
        this._view?.webview.postMessage({
            command: 'updatePet',
            id: pet.id,
            speedMultiplier: picked.multiplier
        });
        this._persistActivePets();
    }

    /** Shows a QuickPick of currently active pets; returns the matching SavedPet. */
    private async _pickActivePet(placeHolder: string): Promise<SavedPet | undefined> {
        if (this._activePets.length === 0) {
            vscode.window.showInformationMessage('No pets are currently active.');
            return undefined;
        }

        const picked = await vscode.window.showQuickPick(
            this._activePets.map(pet => ({
                label: pet.name || MascotRegistry.get(pet.mascotId)?.name || pet.mascotId,
                description: MascotRegistry.get(pet.mascotId)?.name ?? pet.mascotId,
                pet
            })),
            { placeHolder }
        );

        return picked?.pet;
    }

    public async refreshBadges(username: string) {
        if (!BADGE_FEATURES_ENABLED || !this._view) { return; }
        const badges = await CredlyService.fetchBadges(username);
        const profileUrl = CredlyService.getProfileUrl(username);
        this._view.webview.postMessage({ command: 'updateBadges', badges, profileUrl });
    }

    public showEventReaction(reactionId: EventReactionId) {
        const config = vscode.workspace.getConfiguration('pnpPets');
        if (!config.get<boolean>('enableEventReactions', true)) { return; }

        const reaction = getEventReactionConfig(config, reactionId);
        if (!reaction.enabled) { return; }
        if (!this._view || !reaction) { return; }

        const emoteUri = this._resolveEmoteUri(reaction.emoteId);
        if (!emoteUri) { return; }

        this._view.webview.postMessage({
            command: 'showEmote',
            emote: emoteUri,
            source: 'event',
            target: reaction.target,
            bounce: reaction.bounce
        });
    }

    public onConfigChanged() {
        if (!this._view) { return; }
        this._view.webview.html = this._buildHtml();
    }

    private async _handleMessage(msg: { command: string }) {
        switch (msg.command) {
            case 'ready': {
                // Webview just (re)started — reset in-memory tracking then restore
                this._activePets = [];
                const config = vscode.workspace.getConfiguration('pnpPets');

                if (config.get<boolean>('persistPets', true)) {
                    const saved = this._context.globalState.get<SavedPet[]>(this._savedPetsKey, []);
                    if (saved.length > 0) {
                        for (const pet of saved) {
                            const mascot = MascotRegistry.get(pet.mascotId);
                            if (!mascot) { continue; } // mascot was removed — skip it
                            this._view?.webview.postMessage({
                                command: 'spawnPets',
                                mascot: this._resolveUris(mascot, pet.tintColor),
                                sign: this._resolveSign(pet.signBadgeId),
                                clickEmote: this._resolveEmoteUri(pet.clickEmoteId),
                                clickEmoteEnabled: pet.clickEmoteEnabled !== false,
                                count: 1,
                                name: pet.name,
                                ids: [pet.id],
                                ...(pet.speedMultiplier ? { speedMultiplier: pet.speedMultiplier } : {})
                            });
                            this._activePets.push(pet);
                        }
                        // Re-save in case any missing mascots were pruned
                        this._persistActivePets();
                    } else {
                        this.spawnPets();
                    }
                } else {
                    this.spawnPets();
                }

                break;
            }
            case 'requestSpawn':
                this.spawnInteractive();
                break;
            case 'requestRemoveAll':
                this.removeAllPets();
                break;
            case 'openLink': {
                const url = (msg as { url?: unknown }).url;
                if (typeof url === 'string') {
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
                break;
            }
        }
    }

    private _resolveUris(mascot: MascotDefinition, tintColor?: string): MascotDefinition {
        const sprite = mascot.sprite;
        let resolvedSprite: SpriteConfig;

        if (sprite.type === 'png-sheet') {
            resolvedSprite = {
                ...sprite,
                src: this._petUri(sprite.src),
                ...(tintColor ? { tintColor } : {})
            };
        } else if (sprite.type === 'svg-frames') {
            resolvedSprite = {
                ...sprite,
                frames: {
                    idle: sprite.frames.idle.map(f => this._petUri(f)),
                    walkRight: sprite.frames.walkRight.map(f => this._petUri(f)),
                    walkLeft: sprite.frames.walkLeft.map(f => this._petUri(f))
                }
            };
        } else {
            resolvedSprite = {
                ...sprite,
                frames: {
                    idle: this._petUri(sprite.frames.idle),
                    walkRight: this._petUri(sprite.frames.walkRight),
                    ...(sprite.frames.walkLeft && {
                        walkLeft: this._petUri(sprite.frames.walkLeft)
                    })
                }
            };
        }

        return { ...mascot, sprite: resolvedSprite };
    }

    private _resolveSign(signBadgeId?: string): ResolvedSign | undefined {
        if (!BADGE_FEATURES_ENABLED) { return undefined; }
        if (!signBadgeId) { return undefined; }
        const badge = BadgeRegistry.get(signBadgeId);
        if (!badge) { return undefined; } // badge was removed — skip it

        return {
            templateUri: this._mediaUri('signs/speech-bubble.svg'),
            badgeImageUri: this._mediaUri(`badges/${badge.imageFile}`),
            ...(badge.linkUrl ? { linkUrl: badge.linkUrl } : {})
        };
    }

    /** Resolves any emote ID to its media URI. Used for both per-pet click
     *  emotes and the shared pet-to-pet interaction emote. */
    private _resolveEmoteUri(emoteId?: string): string | undefined {
        if (!emoteId) { return undefined; }
        const emote = EmoteRegistry.get(emoteId);
        if (!emote) { return undefined; } // emote was removed — skip it
        return this._mediaUri(`emotes/${emote.imageFile}`);
    }

    private _persistActivePets() {
        const config = vscode.workspace.getConfiguration('pnpPets');
        if (config.get<boolean>('persistPets', true)) {
            this._context.globalState.update(this._savedPetsKey, this._activePets);
        }
    }

    private _petUri(filename: string): string {
        return this._mediaUri(`pets/${filename}`);
    }

    private _mediaUri(relativePath: string): string {
        return this._view!.webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', relativePath)
        ).toString();
    }

    private _buildHtml(): string {
        if (!this._view) { return ''; }

        const webview = this._view.webview;
        const config = vscode.workspace.getConfiguration('pnpPets');
        const themeSetting = config.get<string>('theme', 'auto');
        const speed = config.get<number>('speed', 2);

        const activeTheme = themeSetting === 'auto'
            ? (ThemeManager.getAutoTheme() ?? ThemeManager.getById('default')!)
            : (ThemeManager.getById(themeSetting) ?? ThemeManager.getById('default')!);

        const uri = (file: string) =>
            webview.asWebviewUri(
                vscode.Uri.joinPath(this._context.extensionUri, 'media', file)
            ).toString();

        // Hardcoded to the "heart" sample emote for now — pet-to-pet interactions
        // aren't user-configurable yet, so there's no setting to read this from.
        const interactionEmoteUri = this._resolveEmoteUri('heart') ?? '';

        const nonce = generateNonce();

        const csp = [
            `default-src 'none'`,
            `img-src ${webview.cspSource} https:`,
            `style-src ${webview.cspSource} 'nonce-${nonce}'`,
            `script-src 'nonce-${nonce}'`
        ].join('; ');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${uri('webview/style.css')}">
    <style nonce="${nonce}">body { background: ${activeTheme.background}; }</style>
    <title>PnP Community Pets</title>
</head>
<body>
    <canvas id="petCanvas"></canvas>
    <div id="badge-strip" aria-label="Community badges"></div>
    <script nonce="${nonce}"
            src="${uri('webview/canvas.js')}"
            data-speed="${speed}"
            data-theme="${activeTheme.id}"
            data-interaction-emote="${interactionEmoteUri}"></script>
</body>
</html>`;
    }
}

function generateNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getEventReactionConfig(
    config: vscode.WorkspaceConfiguration,
    reactionId: EventReactionId
): EventReactionConfig {
    const defaults = EVENT_REACTION_DEFAULTS[reactionId];
    const overrides = config.get<EventReactionOverrides>('eventReactions', {});
    const override = overrides[reactionId] ?? {};
    const settingPrefix = `eventReactions.${reactionId}`;

    return {
        enabled: getConfiguredSetting<boolean>(config, `${settingPrefix}.enabled`)
            ?? (typeof override.enabled === 'boolean' ? override.enabled : defaults.enabled),
        emoteId: getConfiguredSetting<string>(config, `${settingPrefix}.emoteId`)
            ?? (typeof override.emoteId === 'string' && override.emoteId.length > 0
                ? override.emoteId
                : defaults.emoteId),
        target: getConfiguredSetting<EmoteTarget>(config, `${settingPrefix}.target`)
            ?? (override.target === 'all' || override.target === 'random'
                ? override.target
                : defaults.target),
        bounce: getConfiguredSetting<boolean>(config, `${settingPrefix}.bounce`)
            ?? (typeof override.bounce === 'boolean' ? override.bounce : defaults.bounce)
    };
}

function getConfiguredSetting<T>(config: vscode.WorkspaceConfiguration, key: string): T | undefined {
    const inspected = config.inspect<T>(key);
    return inspected?.workspaceFolderValue
        ?? inspected?.workspaceValue
        ?? inspected?.globalValue
        ?? inspected?.workspaceFolderLanguageValue
        ?? inspected?.workspaceLanguageValue
        ?? inspected?.globalLanguageValue;
}

const PET_NAME_PREFIXES = ['Sir', 'Lady', 'Captain', 'Dr.', 'Professor', 'Agent'];
const PET_NAME_ADJECTIVES = ['Fluffy', 'Spiky', 'Snappy', 'Zippy', 'Wobbly', 'Grumpy', 'Dizzy'];

function randomPetName(mascotName: string): string {
    const prefix = PET_NAME_PREFIXES[Math.floor(Math.random() * PET_NAME_PREFIXES.length)];
    const adj    = PET_NAME_ADJECTIVES[Math.floor(Math.random() * PET_NAME_ADJECTIVES.length)];
    return `${prefix} ${adj} ${mascotName}`;
}

const SPEED_PRESETS = [
    { label: 'Very slow',  description: '0.4x', multiplier: 0.4 },
    { label: 'Slow',       description: '0.7x', multiplier: 0.7 },
    { label: 'Normal',     description: '1x (default)', multiplier: 1 },
    { label: 'Fast',       description: '1.5x', multiplier: 1.5 },
    { label: 'Very fast',  description: '2.5x', multiplier: 2.5 }
];

const TINT_PRESETS = [
    { label: 'No tint',     description: 'Spawn with original colors',  color: 'NONE' },
    { label: 'Purple',      description: '#7B48CC', color: '#7B48CC' },
    { label: 'Teal',        description: '#00B4D8', color: '#00B4D8' },
    { label: 'Orange',      description: '#FF6600', color: '#FF6600' },
    { label: 'Red',         description: '#E53935', color: '#E53935' },
    { label: 'Green',       description: '#43A047', color: '#43A047' },
    { label: 'Blue',        description: '#1E88E5', color: '#1E88E5' },
    { label: 'Yellow',      description: '#FDD835', color: '#FDD835' },
    { label: 'Pink',        description: '#E91E63', color: '#E91E63' },
    { label: 'Custom…',     description: 'Enter any hex color', color: '' },
];

// Returns: a hex color string, undefined (user cancelled), or null (no tint chosen)
async function _pickTintColor(): Promise<string | null | undefined> {
    const picked = await vscode.window.showQuickPick(TINT_PRESETS, {
        placeHolder: 'Pick a color for the tintable areas'
    });

    if (!picked) { return undefined; }        // Escape — cancel the whole spawn
    if (picked.color === 'NONE') { return null; } // No tint — spawn unmodified

    if (!picked.color) {
        return vscode.window.showInputBox({
            prompt: 'Enter a hex color code',
            placeHolder: '#FF6600',
            validateInput: v =>
                /^#[0-9A-Fa-f]{6}$/.test(v) ? null : 'Must be a 6-digit hex color, e.g. #FF6600'
        });
    }

    return picked.color;
}

// Returns: a badge ID, undefined (user cancelled), or null (no sign chosen)
async function _pickSign(): Promise<string | null | undefined> {
    const badges = BadgeRegistry.getAll();

    const picked = await vscode.window.showQuickPick(
        [
            { label: 'No badge', description: 'Spawn without a badge/logo sign', id: null as string | null },
            ...badges.map(b => ({ label: b.name, description: b.description, id: b.id }))
        ],
        { placeHolder: 'Have this pet hold up a badge or event logo?' }
    );

    if (!picked) { return undefined; } // Escape — cancel the whole spawn
    return picked.id;
}

// Returns: an emote ID, undefined (user cancelled), or null (no click reaction chosen)
async function _pickClickEmote(): Promise<string | null | undefined> {
    const emotes = EmoteRegistry.getAll();

    const picked = await vscode.window.showQuickPick(
        [
            { label: 'No click reaction', description: 'Just the bounce, no emote', id: null as string | null },
            ...emotes.map(e => ({ label: e.name, description: e.description, id: e.id }))
        ],
        { placeHolder: 'Pick a reaction to show when this pet is clicked' }
    );

    if (!picked) { return undefined; } // Escape — cancel the whole spawn
    return picked.id;
}
