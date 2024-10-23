import { exec } from 'child_process';
import { Repository } from '../types';

export function getCurrentBranch(workspacePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec('git rev-parse --abbrev-ref HEAD', { cwd: workspacePath }, (error, stdout) => {
      if (error) {
        console.error(`Error getting current branch: ${error}`);
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export function isRecentlyCreatedOrUpdatedBranch(
  repository: Repository,
  branchName: string
): Promise<boolean> {
  return new Promise((resolve) => {
    exec(
      `git reflog show --date=unix ${branchName} | head -n1`,
      { cwd: repository.rootUri.fsPath },
      (error, stdout) => {
        if (error) {
          console.error(`Error checking branch creation/update time: ${error}`);
          resolve(false);
          return;
        }

        const match = stdout.match(/@\{(\d+)\}/);
        if (!match) {
          console.error(`Unexpected reflog output: ${stdout}`);
          resolve(false);
          return;
        }

        const branchTimestamp = parseInt(match[1], 10);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const timeDifference = currentTimestamp - branchTimestamp;

        // Consider a branch "new" if it was created or updated within the last 5 seconds
        resolve(timeDifference <= 5);
      }
    );
  });
}
