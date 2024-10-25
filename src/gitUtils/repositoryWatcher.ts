import * as vscode from 'vscode';
import { Repository } from '../types';
import { checkBranchChange } from '../gitUtils/branchChecker';

export function watchRepository(repository: Repository, context: vscode.ExtensionContext): void {
  repository.state.onDidChange(() => {
    checkBranchChange(repository, context);
  });
}
