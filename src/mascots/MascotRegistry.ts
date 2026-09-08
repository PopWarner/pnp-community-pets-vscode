import * as vscode from 'vscode';
import { MascotDefinition, SpriteConfig } from './types';

const _registry = new Map<string, MascotDefinition>();

export const MascotRegistry = {
    async init(extensionUri: vscode.Uri): Promise<void> {
        _registry.clear();
        const petsDir = vscode.Uri.joinPath(extensionUri, 'media', 'pets');

        let entries: [string, vscode.FileType][];
        try {
            entries = await vscode.workspace.fs.readDirectory(petsDir);
        } catch {
            return;
        }

        await Promise.all(
            entries
                .filter(([, type]) => type === vscode.FileType.Directory)
                .map(([folderName]) => _loadManifest(petsDir, folderName))
        );
    },

    get: (id: string): MascotDefinition | undefined => _registry.get(id),

    /** All mascots, including hidden ones. Use for lookups, not for pickers. */
    getAllIncludingHidden: (): MascotDefinition[] => [..._registry.values()],

    getAll: (): MascotDefinition[] => [..._registry.values()].filter(m => !m.hidden),

    getByTag: (tag: string): MascotDefinition[] =>
        [..._registry.values()].filter(m => !m.hidden && m.tags.includes(tag)),

    getUnlockedByBadge: (badgeId: string): MascotDefinition | undefined =>
        [..._registry.values()].find(m => m.unlockedByBadgeId === badgeId)
};

async function _loadManifest(petsDir: vscode.Uri, folderName: string): Promise<void> {
    const manifestUri = vscode.Uri.joinPath(petsDir, folderName, 'mascot.json');
    let json: Record<string, unknown>;

    try {
        const bytes = await vscode.workspace.fs.readFile(manifestUri);
        json = JSON.parse(Buffer.from(bytes).toString('utf-8'));
    } catch {
        return; // folder has no mascot.json or it's invalid, skip silently
    }

    try {
        const mascot = _parse(json, folderName);
        _registry.set(mascot.id, mascot);
    } catch (err) {
        vscode.window.showWarningMessage(
            `PnP Pets: skipping "${folderName}/mascot.json": ${String(err)}`
        );
    }
}

function _parse(json: Record<string, unknown>, folderName: string): MascotDefinition {
    const id          = _str(json.id, folderName);
    const name        = _str(json.name, folderName);
    const description = _str(json.description, '');
    const frameWidth  = _num(json.frameWidth,  128);
    const frameHeight = _num(json.frameHeight, 128);
    const tags        = Array.isArray(json.tags) ? (json.tags as string[]) : ['community'];
    const prefix      = (f: string) => `${folderName}/${f}`;
    const toArr       = (v: unknown): string[] =>
        typeof v === 'string' ? [v] : Array.isArray(v) ? (v as string[]) : [];

    let sprite: SpriteConfig;

    switch (json.type) {
        case 'gif': {
            if (!json.idle || !json.walkRight) {
                throw new Error('"idle" and "walkRight" are required for type "gif"');
            }
            sprite = {
                type: 'gif',
                frameWidth,
                frameHeight,
                frames: {
                    idle:      prefix(_str(json.idle,      '')),
                    walkRight: prefix(_str(json.walkRight, '')),
                    ...(json.walkLeft ? { walkLeft: prefix(_str(json.walkLeft, '')) } : {})
                }
            };
            break;
        }

        case 'png-sheet': {
            if (!json.src) {
                throw new Error('"src" is required for type "png-sheet"');
            }
            const rows = (json.rows as Record<string, number> | undefined) ?? {};
            sprite = {
                type: 'png-sheet',
                src: prefix(_str(json.src, '')),
                frameWidth,
                frameHeight,
                framesPerRow: _num(json.framesPerRow, 4),
                ...(json.framePadding ? { framePadding: _num(json.framePadding, 0) } : {}),
                rows: {
                    idle:      rows.idle      ?? 0,
                    walkRight: rows.walkRight ?? 1,
                    ...(rows.walkLeft !== undefined ? { walkLeft: rows.walkLeft } : {})
                },
                ...(json.tintable ? { tintable: true } : {}),
                ...(json.chromaColor ? { chromaColor: String(json.chromaColor) } : {}),
                ...(json.defaultTintColor ? { defaultTintColor: String(json.defaultTintColor) } : {})
            };
            break;
        }

        case 'svg-frames': {
            if (!json.idle && !json.walkRight) {
                throw new Error('"idle" or "walkRight" is required for type "svg-frames"');
            }
            const idleFrames  = toArr(json.idle).map(prefix);
            const rightFrames = toArr(json.walkRight).map(prefix);
            sprite = {
                type: 'svg-frames',
                frameWidth,
                frameHeight,
                frames: {
                    idle:      idleFrames.length  ? idleFrames  : rightFrames,
                    walkRight: rightFrames.length ? rightFrames : idleFrames,
                    walkLeft:  toArr(json.walkLeft).map(prefix)
                }
            };
            break;
        }

        default:
            throw new Error(`Unknown type "${json.type}". Must be "gif", "svg-frames", or "png-sheet".`);
    }

    return {
        id,
        name,
        description,
        sprite,
        ...(json.unlockedByBadgeId ? { unlockedByBadgeId: String(json.unlockedByBadgeId) } : {}),
        tags,
        ...(json.hidden ? { hidden: true } : {})
    };
}

function _str(v: unknown, fallback: string): string {
    return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function _num(v: unknown, fallback: number): number {
    return typeof v === 'number' ? v : fallback;
}
