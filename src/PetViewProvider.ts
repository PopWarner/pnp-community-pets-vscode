import * as vscode from 'vscode';
import { MascotDefinition, SpriteConfig } from './mascots/types';
import { MascotRegistry } from './mascots/MascotRegistry';
import { ThemeManager } from './themes/ThemeManager';
import { CredlyService } from './credly/CredlyService';

export class PetViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'pnpPets.petView';

    private _view?: vscode.WebviewView;

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

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                webviewView.webview.html = this._buildHtml();
            }
        });
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

        this._postSpawn(mascot, count);
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
            tintColor = await _pickTintColor();
            if (tintColor === undefined) { return; }
        }

        const name = await vscode.window.showInputBox({
            prompt: 'Give your pet a name (optional)',
            placeHolder: randomPetName(picked.mascot.name),
            value: randomPetName(picked.mascot.name)
        });

        if (name === undefined) { return; }  // user pressed Escape

        this._postSpawn(picked.mascot, 1, name || randomPetName(picked.mascot.name), tintColor);
    }

    private _postSpawn(mascot: MascotDefinition, count: number, name?: string, tintColor?: string) {
        this._view?.webview.postMessage({
            command: 'spawnPets',
            mascot: this._resolveUris(mascot, tintColor),
            count,
            name
        });
    }

    public removeAllPets() {
        this._view?.webview.postMessage({ command: 'removeAllPets' });
    }

    public async refreshBadges(username: string) {
        if (!this._view) { return; }
        const badges = await CredlyService.fetchBadges(username);
        const profileUrl = CredlyService.getProfileUrl(username);
        this._view.webview.postMessage({ command: 'updateBadges', badges, profileUrl });
    }

    public onConfigChanged() {
        if (!this._view) { return; }
        this._view.webview.html = this._buildHtml();
    }

    private async _handleMessage(msg: { command: string }) {
        switch (msg.command) {
            case 'ready': {
                this.spawnPets();
                const config = vscode.workspace.getConfiguration('pnpPets');
                const username = config.get<string>('credlyUsername', '');
                if (username && config.get<boolean>('showBadgeStrip', true)) {
                    await this.refreshBadges(username);
                }
                break;
            }
            case 'requestSpawn':
                this.spawnInteractive();
                break;
            case 'requestRemoveAll':
                this.removeAllPets();
                break;
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

    private _petUri(filename: string): string {
        return this._view!.webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', 'pets', filename)
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
            data-theme="${activeTheme.id}"></script>
</body>
</html>`;
    }
}

function generateNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const PET_NAME_PREFIXES = ['Sir', 'Lady', 'Captain', 'Dr.', 'Professor', 'Agent'];
const PET_NAME_ADJECTIVES = ['Fluffy', 'Spiky', 'Snappy', 'Zippy', 'Wobbly', 'Grumpy', 'Bouncy', 'Dizzy'];

function randomPetName(mascotName: string): string {
    const prefix = PET_NAME_PREFIXES[Math.floor(Math.random() * PET_NAME_PREFIXES.length)];
    const adj    = PET_NAME_ADJECTIVES[Math.floor(Math.random() * PET_NAME_ADJECTIVES.length)];
    return `${prefix} ${adj} ${mascotName}`;
}

const TINT_PRESETS = [
    { label: 'PnP Purple',  description: '#7B48CC', color: '#7B48CC' },
    { label: 'Teal',        description: '#00B4D8', color: '#00B4D8' },
    { label: 'Orange',      description: '#FF6600', color: '#FF6600' },
    { label: 'Red',         description: '#E53935', color: '#E53935' },
    { label: 'Green',       description: '#43A047', color: '#43A047' },
    { label: 'Blue',        description: '#1E88E5', color: '#1E88E5' },
    { label: 'Yellow',      description: '#FDD835', color: '#FDD835' },
    { label: 'Pink',        description: '#E91E63', color: '#E91E63' },
    { label: 'Custom…',     description: 'Enter any hex color', color: '' },
];

async function _pickTintColor(): Promise<string | undefined> {
    const picked = await vscode.window.showQuickPick(TINT_PRESETS, {
        placeHolder: 'Pick a color for the tintable areas'
    });

    if (!picked) { return undefined; }

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
