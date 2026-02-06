import * as vscode from 'vscode';
import { checkBranchChange } from '../gitUtils/branchChecker';
import { Repository } from '../types';

const DEBUG_LOG = (payload: Record<string, unknown>) => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/fdb7687f-e8f6-43d1-9103-b264da4803bd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'repositoryWatcher.ts',
      message: payload['message'] as string,
      data: payload,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      hypothesisId: payload['hypothesisId'],
    }),
  }).catch(() => {});
  // #endregion
};

export function watchRepository(repository: Repository, context: vscode.ExtensionContext): void {
  repository.state.onDidChange(() => {
    // #region agent log
    DEBUG_LOG({
      hypothesisId: 'C',
      message: 'onDidChange fired',
      repoRoot: repository.rootUri.fsPath,
      headName: repository.state.HEAD?.name,
    });
    // #endregion
    checkBranchChange(repository, context);
  });
}
