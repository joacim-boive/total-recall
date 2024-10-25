import * as vscode from 'vscode';

export function getOpenFiles(): Set<string> {
  const openFiles = new Set<string>();

  for (const tabGroup of vscode.window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        const fsPath = tab.input.uri.fsPath;
        openFiles.add(fsPath);
      }
    }
  }

  return openFiles;
}
