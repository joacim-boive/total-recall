import { exec } from "child_process";
import * as vscode from "vscode";
import { Repository } from "./types";

let currentBranch = "";

function getOpenFiles(): Set<string> {
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

export async function setupGitBranchTracker(context: vscode.ExtensionContext) {

  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (gitExtension) {
    const gitApi = gitExtension.exports.getAPI(1);

    gitApi.onDidOpenRepository((repository: Repository) => {
      console.log("Repository opened:", repository.rootUri.fsPath);
      watchRepository(repository, context);
    });
    
    gitApi.repositories.forEach((repo: Repository) =>
      watchRepository(repo, context)
    );
  }

  // Initialize current branch
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    try {
      currentBranch = await getCurrentBranch(workspacePath);
      console.log(`Initial branch: ${currentBranch}`);
    } catch (error) {
      console.error("Error getting initial branch:", error);
    }
  }

function getCurrentBranch(workspacePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      "git rev-parse --abbrev-ref HEAD",
      { cwd: workspacePath },
      (error, stdout) => {
        if (error) {
          console.error(`Error getting current branch: ${error}`);
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      }
    );
  });
}

function watchRepository(repository: Repository, context: vscode.ExtensionContext): void {
  repository.state.onDidChange(() => {
    checkBranchChange(repository, context);
  });
}

async function checkBranchChange(repository: Repository, context: vscode.ExtensionContext): Promise<void> {
  const newBranch = repository.state.HEAD?.name || "";
  if (newBranch !== currentBranch) {
    console.log(`Branch changed from ${currentBranch} to ${newBranch}`);

    const openFiles = getOpenFiles();

    const branchFileMap = context.workspaceState.get("branchFileMap") as Record<string, string[]> || {};
    
    branchFileMap[currentBranch] = Array.from(openFiles);
    await context.workspaceState.update("branchFileMap", branchFileMap);

    // Close all editors
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

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

    currentBranch = newBranch;
  }
}
}
