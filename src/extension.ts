import * as vscode from 'vscode';
import { PetViewProvider } from './PetViewProvider';
import { MascotRegistry } from './mascots/MascotRegistry';
import { BadgeRegistry } from './mascots/BadgeRegistry';

export async function activate(context: vscode.ExtensionContext) {
    await MascotRegistry.init(context.extensionUri);
    await BadgeRegistry.init(context.extensionUri);

    const provider = new PetViewProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            PetViewProvider.viewType,
            provider,
            { webviewOptions: { retainContextWhenHidden: true } }
        ),

        vscode.commands.registerCommand('pnpPets.spawnPet', () => {
            provider.spawnInteractive();
        }),

        vscode.commands.registerCommand('pnpPets.removeAllPets', () => {
            provider.removeAllPets();
        }),

        vscode.commands.registerCommand('pnpPets.removePet', () => {
            provider.removePetInteractive();
        }),

        vscode.commands.registerCommand('pnpPets.adjustPetSpeed', () => {
            provider.adjustPetSpeedInteractive();
        }),

        vscode.commands.registerCommand('pnpPets.showBadges', async () => {
            const config = vscode.workspace.getConfiguration('pnpPets');
            let username = config.get<string>('credlyUsername', '');
            if (!username) {
                const entered = await vscode.window.showInputBox({
                    prompt: 'Enter your Credly username',
                    placeHolder: 'e.g. johndoe'
                });
                if (!entered) { return; }
                await config.update('credlyUsername', entered, vscode.ConfigurationTarget.Global);
                username = entered;
            }
            provider.refreshBadges(username);
        }),

        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('pnpPets')) {
                provider.onConfigChanged();
            }
        })
    );
}

export function deactivate() {}
