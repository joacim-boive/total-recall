import * as vscode from 'vscode';
import { Repository } from './types';
import { getCurrentBranch } from './gitUtils/branchUtils';
import { watchRepository } from './gitUtils/repositoryWatcher';
import { setCurrentBranch } from './gitUtils/branchChecker';

/**
 * Initializes a repository by setting its current branch in the tracker.
 * Called for each repository on startup and when new repositories are opened.
 *
 * @param repository - The Git repository to initialize
 * @param context - The VS Code extension context
 */
async function initializeRepository(
  repository: Repository,
  context: vscode.ExtensionContext
): Promise<void> {
  const repoRoot = repository.rootUri.fsPath;

  try {
    const initialBranch = await getCurrentBranch(repoRoot);
    setCurrentBranch(repoRoot, initialBranch);
    watchRepository(repository, context);
    console.log(`[Total Recall] Initialized repository: ${repoRoot} on branch: ${initialBranch}`);
  } catch (error) {
    console.error(`[Total Recall] Error initializing repository ${repoRoot}:`, error);
    // Still set up the watcher even if we can't get the initial branch
    // The branch will be detected on the next change
    watchRepository(repository, context);
  }
}

/**
 * Sets up the Git branch tracker for the VS Code extension.
 * This function initializes the tracker for all existing repositories
 * and sets up watchers for new repositories that may be opened.
 *
 * @param context - The VS Code extension context
 */
export async function setupGitBranchTracker(context: vscode.ExtensionContext): Promise<void> {
  const gitExtension = vscode.extensions.getExtension('vscode.git');

  if (!gitExtension) {
    console.warn('[Total Recall] Git extension not found. Branch tracking disabled.');
    return;
  }

  const gitApi = gitExtension.exports.getAPI(1);

  // Set up listener for newly opened repositories
  gitApi.onDidOpenRepository(async (repository: Repository) => {
    console.log(`[Total Recall] Repository opened: ${repository.rootUri.fsPath}`);
    await initializeRepository(repository, context);
  });

  // Initialize all existing repositories
  const initPromises = gitApi.repositories.map((repo: Repository) =>
    initializeRepository(repo, context)
  );

  await Promise.all(initPromises);

  console.log(
    `[Total Recall] Initialized ${gitApi.repositories.length} repository(ies) for branch tracking.`
  );
}
