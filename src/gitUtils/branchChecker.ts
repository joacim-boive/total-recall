import * as vscode from 'vscode';
import { Repository } from '../types';
import { isRecentlyCreatedOrUpdatedBranch } from './branchUtils';
import { getOpenFiles } from './fileUtils';

let currentBranch = '';

export async function checkBranchChange(
  repository: Repository,
  context: vscode.ExtensionContext
): Promise<void> {
  const newBranch = repository.state.HEAD?.name || '';
  if (newBranch !== currentBranch) {
    console.log(`Branch changed from ${currentBranch} to ${newBranch}`);

    const openFiles = getOpenFiles();

    const branchFileMap =
      (context.workspaceState.get('branchFileMap') as Record<string, string[]>) || {};

    branchFileMap[currentBranch] = Array.from(openFiles);
    await context.workspaceState.update('branchFileMap', branchFileMap);

    const isOldBranch = !(await isRecentlyCreatedOrUpdatedBranch(repository, newBranch));

    // Close all editors only if it's an existing branch
    // When creating a new branch, we want to keep the editors open
    if (isOldBranch) {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      // Open files for the new branch
      const filesToOpen = branchFileMap[newBranch] || [];
      for (const file of filesToOpen) {
        try {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
          await vscode.window.showTextDocument(doc, { preview: false });
        } catch (error) {
          console.error(`Failed to open file: ${file}`, error);
        }
      }
    }

    currentBranch = newBranch;
  }
}

export function setCurrentBranch(branch: string): void {
  currentBranch = branch;
}
