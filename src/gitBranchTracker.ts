import * as vscode from 'vscode';
import { Repository } from './types';
import { getCurrentBranch } from './gitUtils/branchUtils';
import { watchRepository } from './gitUtils/repositoryWatcher';
import { setCurrentBranch } from './gitUtils/branchChecker';

/**
 * Sets up the Git branch tracker for the VS Code extension.
 * This function initializes the tracker, sets up repository watchers,
 * and sets the initial branch.
 * 
 * @param context - The VS Code extension context
 */
export async function setupGitBranchTracker(context: vscode.ExtensionContext) {
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  if (gitExtension) {
    const gitApi = gitExtension.exports.getAPI(1);

    gitApi.onDidOpenRepository((repository: Repository) => {
      console.log('Repository opened:', repository.rootUri.fsPath);
      watchRepository(repository, context);
    });

    gitApi.repositories.forEach((repo: Repository) => watchRepository(repo, context));
  }

  // Initialize current branch
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    try {
      const initialBranch = await getCurrentBranch(workspacePath);
      setCurrentBranch(initialBranch);
      console.log(`Initial branch: ${initialBranch}`);
    } catch (error) {
      console.error('Error getting initial branch:', error);
    }
  }
}
