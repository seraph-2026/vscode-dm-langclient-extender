
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('DM Langclient Extender is active.');

	// Watch files in the current workspace.
	const watcher = vscode.workspace.createFileSystemWatcher('**/*.dm');

	let restartTimer: ReturnType<typeof setTimeout> | undefined;

	const scheduleRestart = () => {
		if (restartTimer) {
			clearTimeout(restartTimer);
		}

		restartTimer = setTimeout(() => {
			vscode.commands.executeCommand('dreammaker.restartLangserver');
		}, 500);
	};

	watcher.onDidChange(scheduleRestart, undefined, context.subscriptions);
	watcher.onDidCreate(scheduleRestart, undefined, context.subscriptions);
	watcher.onDidDelete(scheduleRestart, undefined, context.subscriptions);

	context.subscriptions.push(watcher);

	context.subscriptions.push({
		dispose: () => {
			if (restartTimer) {
				clearTimeout(restartTimer);
			}
		}
	});
}

export function deactivate() {}