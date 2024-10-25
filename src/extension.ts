
import * as vscode from 'vscode';
import { setupGitBranchTracker } from './gitBranchTracker';

export function activate(context: vscode.ExtensionContext) {
  console.log('Total Recall - is now monitoring your git branches.');
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Total Recall',
      cancellable: false,
    },
    (progress) => {
      progress.report({ message: 'Now monitoring your git branches' });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 3000); // Notification will auto-dismiss after 3 seconds
      });
    }
  );

  setupGitBranchTracker(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
