
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

    // Automatically expand and continue documentation comment blocks.
    let isExpandingDocComment = false;

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async (event) => {
            if (isExpandingDocComment) return;

            const editor = vscode.window.activeTextEditor;

            if (!editor || editor.document !== event.document) return;
            if (!event.document.fileName.endsWith('.dm')) return;

            const change = event.contentChanges.find(c => c.text.includes('\n'));
            if (!change) return;

            // Let VS Code finish updating the cursor and indentation.
            await new Promise<void>(resolve => setTimeout(resolve, 0));

            const currentEditor = vscode.window.activeTextEditor;
            if (!currentEditor || currentEditor.document !== event.document) return;

            const document = event.document;
            const cursor = currentEditor.selection.active;

            if (cursor.line === 0) return;

            const previousLine = document.lineAt(cursor.line - 1);
            const currentLine = document.lineAt(cursor.line);

            console.log('[DM Doc Comment] Previous:', JSON.stringify(previousLine.text));
            console.log('[DM Doc Comment] Current:', JSON.stringify(currentLine.text));

            // Case 1: Start a documentation block after /**.
            const openingMatch = previousLine.text.match(/^(\s*)\/\*\*\s*$/);

            // Case 2: Continue a line beginning with * inside a comment.
            const continuationMatch = previousLine.text.match(/^(\s*)\*(?:\s*)$/);

            let replacement: string;
            let cursorCharacter: number;

            if (openingMatch) {
                const indentation = openingMatch[1];

                // Check whether a closing */ already exists before another /**.
                let hasClosingLine = false;

                for (let line = cursor.line; line < document.lineCount; line++) {
                    const text = document.lineAt(line).text.trim();

                    if (/^\s*\/\*\*/.test(text)) break;

                    if (text === '*/') {
                        hasClosingLine = true;
                        break;
                    }
                }

                if (hasClosingLine) {
                    console.log('[DM Doc Comment] Existing closing line found; skipping.');
                    return;
                }

                replacement = `${indentation} * \n${indentation} */`;
                cursorCharacter = indentation.length + 3;

                console.log('[DM Doc Comment] Opening block.');
            } else if (continuationMatch) {
                const indentation = continuationMatch[1];

                // Only continue if we're inside an existing block comment.
                const textBeforeLine = document.getText(
                    new vscode.Range(
                        new vscode.Position(0, 0),
                        previousLine.range.start
                    )
                );

                const lastOpen = textBeforeLine.lastIndexOf('/*');
                const lastClose = textBeforeLine.lastIndexOf('*/');

                if (lastOpen === -1 || lastClose > lastOpen) {
                    console.log('[DM Doc Comment] Not inside an open block.');
                    return;
                }

                replacement = `${indentation}* `;
                cursorCharacter = indentation.length + 2;

                console.log('[DM Doc Comment] Continuing block.');
            } else {
                return;
            }

            isExpandingDocComment = true;

            try {
                const success = await currentEditor.edit(editBuilder => {
                    editBuilder.replace(currentLine.range, replacement);
                });

                console.log('[DM Doc Comment] Edit success:', success);

                if (!success) return;

                const newCursor = new vscode.Position(
                    cursor.line,
                    cursorCharacter
                );

                currentEditor.selection = new vscode.Selection(
                    newCursor,
                    newCursor
                );
            } finally {
                isExpandingDocComment = false;
            }
        })
    );

    context.subscriptions.push({
        dispose: () => {
            if (restartTimer) {
                clearTimeout(restartTimer);
            }
        }
    });
}

export function deactivate() {}
