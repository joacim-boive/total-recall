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
 * Guard against concurrent branch-change processing per repository.
 * If a second onDidChange fires while we're still processing the first,
 * we note the pending change and reprocess after the current one finishes.
 */
const processingRepos = new Set<string>();
const pendingRepos = new Set<string>();

/**
 * State for a single branch's open tabs, including which file was active.
 */
type BranchTabState = {
  files: string[];
  activeFile: string | null;
};

/**
 * Type for the per-repo branch file map stored in workspace state.
 */
type BranchFileMapByRepo = Record<string, Record<string, BranchTabState>>;

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
 * Includes a concurrency guard: if onDidChange fires while we're already
 * processing, the duplicate is noted and re-checked after the current run.
 *
 * @param repository - The Git repository that may have changed branches
 * @param context - The VS Code extension context for state storage
 */
export async function checkBranchChange(
  repository: Repository,
  context: vscode.ExtensionContext
): Promise<void> {
  const repoKey = normalizeRepoKey(repository.rootUri.fsPath);

  if (processingRepos.has(repoKey)) {
    pendingRepos.add(repoKey);
    return;
  }

  processingRepos.add(repoKey);
  try {
    do {
      pendingRepos.delete(repoKey);
      await processBranchChange(repository, context, repoKey);
    } while (pendingRepos.has(repoKey));
  } finally {
    processingRepos.delete(repoKey);
  }
}

/**
 * Core logic for detecting a branch change and saving/restoring tabs.
 */
async function processBranchChange(
  repository: Repository,
  context: vscode.ExtensionContext,
  repoKey: string
): Promise<void> {
  const newBranch = repository.state.HEAD?.name || 'HEAD';
  const currentBranch = currentBranchByRepo.get(repoKey) || '';

  if (newBranch === currentBranch) {
    return;
  }

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

  // Save current branch's files (in tab order) and active tab for this repo (only if we have a valid current branch)
  if (currentBranch) {
    branchFileMapByRepo[repoKey][currentBranch] = {
      files: openFiles,
      activeFile: getActiveFileForRepo(repository.rootUri.fsPath),
    };
  }

  // Persist the updated map
  await context.workspaceState.update(STORAGE_KEY, branchFileMapByRepo);

  const isOldBranch = !(await isRecentlyCreatedOrUpdatedBranch(repository, newBranch));

  // Close and restore only if switching to an existing branch
  // When creating a new branch, keep editors open
  if (isOldBranch) {
    // Close all tabs belonging to THIS repo in one batch
    const tabsToClose = getTabsForRepo(repository.rootUri.fsPath);
    if (tabsToClose.length > 0) {
      try {
        await vscode.window.tabGroups.close(tabsToClose, false);
      } catch (error) {
        console.error(`[Total Recall] Failed to close tabs:`, error);
      }
    }

    // Restore files for the new branch (for this repo only)
    const branchData = branchFileMapByRepo[repoKey]?.[newBranch];
    const filesToOpen = branchData?.files ?? [];
    const activeFile = branchData?.activeFile ?? null;

    // Determine which file should receive focus (fall back to first file)
    const focusFile = activeFile ?? filesToOpen[0] ?? null;

    // Phase 1: Open non-active files in the background
    for (const file of filesToOpen) {
      if (file === focusFile) {
        continue; // Will be opened last with focus
      }
      try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
        await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
      } catch (error) {
        console.error(`[Total Recall] Failed to open file: ${file}`, error);
      }
    }

    // Phase 2: Open the focus file last so it is both visible and focused
    if (focusFile) {
      try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(focusFile));
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch (error) {
        console.error(`[Total Recall] Failed to open focus file: ${focusFile}`, error);
      }
    }
  }

  // Update the in-memory current branch for this repo
  currentBranchByRepo.set(repoKey, newBranch);
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
