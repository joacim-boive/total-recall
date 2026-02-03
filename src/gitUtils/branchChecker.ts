import * as vscode from 'vscode';
import * as path from 'path';
import { Repository } from '../types';
import { isRecentlyCreatedOrUpdatedBranch } from './branchUtils';
import { getOpenFilesForRepo, getTabsForRepo } from './fileUtils';

/**
 * Storage key for the per-repo branch file map.
 * Structure: Record<repoRoot, Record<branchName, filePaths[]>>
 */
const STORAGE_KEY = 'branchFileMapByRepo';

/**
 * In-memory map of current branch per repository.
 * Key: normalized repo root path
 * Value: current branch name
 */
const currentBranchByRepo = new Map<string, string>();

/**
 * Type for the per-repo branch file map stored in workspace state.
 */
type BranchFileMapByRepo = Record<string, Record<string, string[]>>;

/**
 * Normalizes a repository root path for consistent key usage.
 *
 * @param repoRoot - The repository root path
 * @returns Normalized path string
 */
function normalizeRepoKey(repoRoot: string): string {
  return path.normalize(repoRoot);
}

/**
 * Checks for branch changes in a specific repository and handles
 * saving/restoring open files accordingly.
 *
 * @param repository - The Git repository that may have changed branches
 * @param context - The VS Code extension context for state storage
 */
export async function checkBranchChange(
  repository: Repository,
  context: vscode.ExtensionContext
): Promise<void> {
  const repoKey = normalizeRepoKey(repository.rootUri.fsPath);
  const newBranch = repository.state.HEAD?.name || 'HEAD'; // Use 'HEAD' for detached state
  const currentBranch = currentBranchByRepo.get(repoKey) || '';

  if (newBranch !== currentBranch) {
    console.log(`[Total Recall] Branch changed in ${repoKey}: ${currentBranch} → ${newBranch}`);

    // Get open files for THIS repo only
    const openFiles = getOpenFilesForRepo(repository.rootUri.fsPath);

    // Load existing per-repo branch file map
    const branchFileMapByRepo =
      (context.workspaceState.get(STORAGE_KEY) as BranchFileMapByRepo) || {};

    // Initialize this repo's map if it doesn't exist
    if (!branchFileMapByRepo[repoKey]) {
      branchFileMapByRepo[repoKey] = {};
    }

    // Save current branch's files for this repo (only if we have a valid current branch)
    if (currentBranch) {
      branchFileMapByRepo[repoKey][currentBranch] = Array.from(openFiles);
    }

    // Persist the updated map
    await context.workspaceState.update(STORAGE_KEY, branchFileMapByRepo);

    const isOldBranch = !(await isRecentlyCreatedOrUpdatedBranch(repository, newBranch));

    // Close and restore only if switching to an existing branch
    // When creating a new branch, keep editors open
    if (isOldBranch) {
      // Close only tabs belonging to THIS repo
      const tabsToClose = getTabsForRepo(repository.rootUri.fsPath);
      for (const tab of tabsToClose) {
        try {
          await vscode.window.tabGroups.close(tab, false);
        } catch (error) {
          console.error(`[Total Recall] Failed to close tab:`, error);
        }
      }

      // Open files for the new branch (for this repo only)
      const filesToOpen = branchFileMapByRepo[repoKey]?.[newBranch] || [];
      for (const file of filesToOpen) {
        try {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
          await vscode.window.showTextDocument(doc, { preview: false });
        } catch (error) {
          console.error(`[Total Recall] Failed to open file: ${file}`, error);
        }
      }
    }

    // Update the in-memory current branch for this repo
    currentBranchByRepo.set(repoKey, newBranch);
  }
}

/**
 * Sets the current branch for a specific repository.
 * Used during initialization to set the initial branch state.
 *
 * @param repoRoot - The repository root path
 * @param branch - The current branch name
 */
export function setCurrentBranch(repoRoot: string, branch: string): void {
  const repoKey = normalizeRepoKey(repoRoot);
  currentBranchByRepo.set(repoKey, branch);
  console.log(`[Total Recall] Initial branch set for ${repoKey}: ${branch}`);
}

/**
 * Gets the current branch for a specific repository.
 *
 * @param repoRoot - The repository root path
 * @returns The current branch name, or undefined if not set
 */
export function getCurrentBranchForRepo(repoRoot: string): string | undefined {
  const repoKey = normalizeRepoKey(repoRoot);
  return currentBranchByRepo.get(repoKey);
}
