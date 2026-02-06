import * as path from 'path';
import * as vscode from 'vscode';
import { Repository } from '../types';
import { isRecentlyCreatedOrUpdatedBranch } from './branchUtils';
import { getActiveFileForRepo, getOpenFilesForRepo, getTabsForRepo } from './fileUtils';

/**
 * Storage key for the per-repo branch file map.
 * Structure: Record<repoRoot, Record<branchName, BranchTabState>>
 */
const STORAGE_KEY = 'branchFileMapByRepo';

/**
 * In-memory map of current branch per repository.
 * Key: normalized repo root path
 * Value: current branch name
 */
const currentBranchByRepo = new Map<string, string>();

/**
 * State for a single branch's open tabs, including which file was active.
 */
type BranchTabState = {
  files: string[];
  activeFile: string | null;
};

/**
 * Type for the per-repo branch file map stored in workspace state.
 * The inner value can be a legacy `string[]` (from older versions) or the new `BranchTabState`.
 */
type BranchFileMapByRepo = Record<string, Record<string, string[] | BranchTabState>>;

/**
 * Migrates legacy branch data (plain `string[]`) to the new `BranchTabState` format.
 * Returns the data as-is if it's already in the new format.
 *
 * @param data - The stored branch data, either legacy or current format
 * @returns A normalized `BranchTabState`
 */
function migrateBranchData(data: string[] | BranchTabState | undefined): BranchTabState {
  if (!data) {
    return { files: [], activeFile: null };
  }
  if (Array.isArray(data)) {
    return { files: data, activeFile: null };
  }
  return data;
}

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

    // Save current branch's files and active tab for this repo (only if we have a valid current branch)
    if (currentBranch) {
      branchFileMapByRepo[repoKey][currentBranch] = {
        files: Array.from(openFiles),
        activeFile: getActiveFileForRepo(repository.rootUri.fsPath),
      };
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

      // Restore files for the new branch (for this repo only)
      const branchData = migrateBranchData(branchFileMapByRepo[repoKey]?.[newBranch]);
      const filesToOpen = branchData.files;
      const activeFile = branchData.activeFile;

      // Phase 1: Open the active file first so the user can start working immediately
      if (activeFile) {
        try {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(activeFile));
          await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false });
        } catch (error) {
          console.error(`[Total Recall] Failed to open active file: ${activeFile}`, error);
        }
      }

      // Phase 2: Open remaining tabs in the background
      for (const file of filesToOpen) {
        if (file === activeFile) {
          continue; // Already opened with focus
        }
        try {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
          await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
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
