import * as vscode from 'vscode';
import { BadgeDefinition } from './types';

const _registry = new Map<string, BadgeDefinition>();

export const BadgeRegistry = {
    async init(extensionUri: vscode.Uri): Promise<void> {
        _registry.clear();
        const badgesDir = vscode.Uri.joinPath(extensionUri, 'media', 'badges');

        let entries: [string, vscode.FileType][];
        try {
            entries = await vscode.workspace.fs.readDirectory(badgesDir);
        } catch {
            return;
        }

        await Promise.all(
            entries
                .filter(([, type]) => type === vscode.FileType.Directory)
                .map(([folderName]) => _loadManifest(badgesDir, folderName))
        );
    },

    get: (id: string): BadgeDefinition | undefined => _registry.get(id),

    getAll: (): BadgeDefinition[] => [..._registry.values()]
};

async function _loadManifest(badgesDir: vscode.Uri, folderName: string): Promise<void> {
    const manifestUri = vscode.Uri.joinPath(badgesDir, folderName, 'badge.json');
    let json: Record<string, unknown>;

    try {
        const bytes = await vscode.workspace.fs.readFile(manifestUri);
        json = JSON.parse(Buffer.from(bytes).toString('utf-8'));
    } catch {
        return; // folder has no badge.json or it's invalid — skip silently
    }

    try {
        const badge = _parse(json, folderName);
        _registry.set(badge.id, badge);
    } catch (err) {
        vscode.window.showWarningMessage(
            `PnP Pets: skipping "${folderName}/badge.json" — ${String(err)}`
        );
    }
}

function _parse(json: Record<string, unknown>, folderName: string): BadgeDefinition {
    if (!json.imageFile) {
        throw new Error('"imageFile" is required');
    }

    const id          = _str(json.id, folderName);
    const name        = _str(json.name, folderName);
    const description = _str(json.description, '');
    const imageFile   = `${folderName}/${_str(json.imageFile, '')}`;

    return {
        id,
        name,
        description,
        imageFile,
        ...(json.linkUrl ? { linkUrl: String(json.linkUrl) } : {})
    };
}

function _str(v: unknown, fallback: string): string {
    return typeof v === 'string' && v.length > 0 ? v : fallback;
}
