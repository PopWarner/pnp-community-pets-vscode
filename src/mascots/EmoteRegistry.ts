import * as vscode from 'vscode';
import { EmoteDefinition } from './types';

const _registry = new Map<string, EmoteDefinition>();

export const EmoteRegistry = {
    async init(extensionUri: vscode.Uri): Promise<void> {
        _registry.clear();
        const emotesDir = vscode.Uri.joinPath(extensionUri, 'media', 'emotes');

        let entries: [string, vscode.FileType][];
        try {
            entries = await vscode.workspace.fs.readDirectory(emotesDir);
        } catch {
            return;
        }

        await Promise.all(
            entries
                .filter(([, type]) => type === vscode.FileType.Directory)
                .map(([folderName]) => _loadManifest(emotesDir, folderName))
        );
    },

    get: (id: string): EmoteDefinition | undefined => _registry.get(id),

    getAll: (): EmoteDefinition[] => [..._registry.values()]
};

async function _loadManifest(emotesDir: vscode.Uri, folderName: string): Promise<void> {
    const manifestUri = vscode.Uri.joinPath(emotesDir, folderName, 'emote.json');
    let json: Record<string, unknown>;

    try {
        const bytes = await vscode.workspace.fs.readFile(manifestUri);
        json = JSON.parse(Buffer.from(bytes).toString('utf-8'));
    } catch {
        return; // folder has no emote.json or it's invalid, skip silently
    }

    try {
        const emote = _parse(json, folderName);
        _registry.set(emote.id, emote);
    } catch (err) {
        vscode.window.showWarningMessage(
            `PnP Pets: skipping "${folderName}/emote.json": ${String(err)}`
        );
    }
}

function _parse(json: Record<string, unknown>, folderName: string): EmoteDefinition {
    if (!json.imageFile) {
        throw new Error('"imageFile" is required');
    }

    const id          = _str(json.id, folderName);
    const name        = _str(json.name, folderName);
    const description = _str(json.description, '');
    const imageFile   = `${folderName}/${_str(json.imageFile, '')}`;

    return { id, name, description, imageFile };
}

function _str(v: unknown, fallback: string): string {
    return typeof v === 'string' && v.length > 0 ? v : fallback;
}
