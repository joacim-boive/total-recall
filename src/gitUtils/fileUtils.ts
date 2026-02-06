import * as path from 'path';
import * as vscode from 'vscode';

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
 * Gets all open text files that belong to a specific repository, in tab order.
 * Iterates through all tab groups (and tabs within each group) so that the
 * returned order matches the user's tab bar order. Duplicates are omitted
 * (first occurrence wins) so the same file open in multiple groups is stored once.
 *
 * @param repoRoot - The absolute path of the repository root
 * @returns An array of file paths in tab order that are open and belong to the specified repo
 */
export function getOpenFilesForRepo(repoRoot: string): string[] {
  const openFiles: string[] = [];
  const seen = new Set<string>();

  for (const tabGroup of vscode.window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        const fsPath = tab.input.uri.fsPath;
        if (isFileInRepo(fsPath, repoRoot) && !seen.has(fsPath)) {
          seen.add(fsPath);
          openFiles.push(fsPath);
        }
      }
    }
  }

  return openFiles;
}

/**
 * Gets the currently active (focused) file if it belongs to a specific repository.
 * First checks the active text editor, then falls back to the active tab in the
 * active tab group (which still points to a file even when the terminal has focus).
 *
 * @param repoRoot - The absolute path of the repository root
 * @returns The file path of the active editor if it belongs to the repo, or null
 */
export function getActiveFileForRepo(repoRoot: string): string | null {
  // Primary: check the active text editor
  const activeEditorUri = vscode.window.activeTextEditor?.document.uri;
  if (activeEditorUri && isFileInRepo(activeEditorUri.fsPath, repoRoot)) {
    return activeEditorUri.fsPath;
  }

  // Fallback: check the active tab (works even when terminal/panel has focus)
  const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (activeTab?.input instanceof vscode.TabInputText) {
    const fsPath = activeTab.input.uri.fsPath;
    if (isFileInRepo(fsPath, repoRoot)) {
      return fsPath;
    }
  }

  return null;
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
