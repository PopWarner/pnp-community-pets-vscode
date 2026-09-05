import * as vscode from 'vscode';
import { PetViewProvider } from './PetViewProvider';
import { MascotRegistry } from './mascots/MascotRegistry';
import { EmoteRegistry } from './mascots/EmoteRegistry';

export async function activate(context: vscode.ExtensionContext) {
    await MascotRegistry.init(context.extensionUri);
    await EmoteRegistry.init(context.extensionUri);

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

        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('pnpPets')) {
                provider.onConfigChanged();
            }
        }),

        vscode.workspace.onDidSaveTextDocument(() => {
            provider.showEventReaction('fileSaved');
        }),

        vscode.tasks.onDidEndTaskProcess(e => {
            provider.showEventReaction(e.exitCode === 0 ? 'taskSucceeded' : 'taskFailed');
        }),

        vscode.window.onDidOpenTerminal(() => {
            provider.showEventReaction('terminalOpened');
        }),

        vscode.debug.onDidStartDebugSession(() => {
            provider.showEventReaction('debugStarted');
        }),

        vscode.debug.onDidTerminateDebugSession(() => {
            provider.showEventReaction('debugStopped');
        })
    );
}

export function deactivate() {}
