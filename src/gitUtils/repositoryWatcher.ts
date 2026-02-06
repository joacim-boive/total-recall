import * as vscode from 'vscode';
import { checkBranchChange } from '../gitUtils/branchChecker';
import { Repository } from '../types';

export function watchRepository(repository: Repository, context: vscode.ExtensionContext): void {
  repository.state.onDidChange(() => {
    checkBranchChange(repository, context);
  });
}
