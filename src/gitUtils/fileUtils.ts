import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Checks if a file path is within a repository root directory.
 * Uses normalized paths for cross-platform compatibility.
 *
 * @param filePath - The absolute path of the file to check
 * @param repoRoot - The absolute path of the repository root
 * @returns true if the file is under the repo root, false otherwise
 */
export function isFileInRepo(filePath: string, repoRoot: string): boolean {
  const normalizedFilePath = path.normalize(filePath);
  const normalizedRepoRoot = path.normalize(repoRoot);

  // Ensure repo root ends with separator for accurate prefix matching
  const repoRootWithSep = normalizedRepoRoot.endsWith(path.sep)
    ? normalizedRepoRoot
    : normalizedRepoRoot + path.sep;

  return (
    normalizedFilePath.startsWith(repoRootWithSep) || normalizedFilePath === normalizedRepoRoot
  );
}

/**
 * Gets all open text files that belong to a specific repository.
 * Iterates through all tab groups and filters files by repo root.
 *
 * @param repoRoot - The absolute path of the repository root
 * @returns A Set of file paths that are open and belong to the specified repo
 */
export function getOpenFilesForRepo(repoRoot: string): Set<string> {
  const openFiles = new Set<string>();

  for (const tabGroup of vscode.window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        const fsPath = tab.input.uri.fsPath;
        if (isFileInRepo(fsPath, repoRoot)) {
          openFiles.add(fsPath);
        }
      }
    }
  }

  return openFiles;
}

/**
 * Gets all tabs that belong to a specific repository.
 * Used for closing only the tabs from a specific repo.
 *
 * @param repoRoot - The absolute path of the repository root
 * @returns An array of Tab objects that belong to the specified repo
 */
export function getTabsForRepo(repoRoot: string): vscode.Tab[] {
  const tabs: vscode.Tab[] = [];

  for (const tabGroup of vscode.window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        const fsPath = tab.input.uri.fsPath;
        if (isFileInRepo(fsPath, repoRoot)) {
          tabs.push(tab);
        }
      }
    }
  }

  return tabs;
}
