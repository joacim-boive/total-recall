import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkBranchChange, setCurrentBranch } from './branchChecker';

const openTextDocumentMock = vi.fn();
const showTextDocumentMock = vi.fn();
const closeTabsMock = vi.fn();
const getConfigurationMock = vi.fn();

const getOpenFilesForRepoMock = vi.fn();
const getActiveFileForRepoMock = vi.fn();
const getTabsForRepoMock = vi.fn();
const isRecentlyCreatedOrUpdatedBranchMock = vi.fn();

let restoreBehaviorSetting: 'preserveTabOrder' | 'focusActiveTabFirst' = 'preserveTabOrder';

vi.mock('vscode', () => ({
  workspace: {
    openTextDocument: (...args: unknown[]) => openTextDocumentMock(...args),
    getConfiguration: (...args: unknown[]) => getConfigurationMock(...args),
  },
  window: {
    showTextDocument: (...args: unknown[]) => showTextDocumentMock(...args),
    tabGroups: {
      close: (...args: unknown[]) => closeTabsMock(...args),
    },
  },
  Uri: {
    file: (filePath: string) => ({ fsPath: filePath }),
  },
}));

vi.mock('./fileUtils', () => ({
  getOpenFilesForRepo: (...args: unknown[]) => getOpenFilesForRepoMock(...args),
  getActiveFileForRepo: (...args: unknown[]) => getActiveFileForRepoMock(...args),
  getTabsForRepo: (...args: unknown[]) => getTabsForRepoMock(...args),
}));

vi.mock('./branchUtils', () => ({
  isRecentlyCreatedOrUpdatedBranch: (...args: unknown[]) =>
    isRecentlyCreatedOrUpdatedBranchMock(...args),
}));

function createContext(initialState: Record<string, unknown>) {
  const state = new Map<string, unknown>([['branchFileMapByRepo', initialState]]);

  return {
    workspaceState: {
      get: vi.fn((key: string) => state.get(key)),
      update: vi.fn(async (key: string, value: unknown) => {
        state.set(key, value);
      }),
    },
  };
}

describe('checkBranchChange tab restore behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    restoreBehaviorSetting = 'preserveTabOrder';
    getConfigurationMock.mockImplementation((section: string) => {
      if (section !== 'totalRecall') {
        throw new Error(`Unexpected configuration section: ${section}`);
      }

      return {
        get: (_key: string, fallback: 'preserveTabOrder' | 'focusActiveTabFirst') =>
          restoreBehaviorSetting ?? fallback,
      };
    });

    openTextDocumentMock.mockImplementation(async (uri: { fsPath: string }) => ({ uri }));
    showTextDocumentMock.mockResolvedValue(undefined);
    closeTabsMock.mockResolvedValue(undefined);

    getTabsForRepoMock.mockReturnValue([{ id: 'tab-1' }]);
    isRecentlyCreatedOrUpdatedBranchMock.mockResolvedValue(false);
  });

  it('preserves saved tab order and focuses active file last in preserveTabOrder mode', async () => {
    const repoRoot = '/repo/preserve-order';
    const savedFiles = ['/repo/preserve-order/a.ts', '/repo/preserve-order/b.ts', '/repo/preserve-order/c.ts'];
    const savedActiveFile = '/repo/preserve-order/b.ts';
    const currentBranchFiles = ['/repo/preserve-order/current.ts'];
    const currentActiveFile = '/repo/preserve-order/current.ts';

    getOpenFilesForRepoMock.mockReturnValue(currentBranchFiles);
    getActiveFileForRepoMock.mockReturnValue(currentActiveFile);

    const context = createContext({
      [repoRoot]: {
        feature: {
          files: savedFiles,
          activeFile: savedActiveFile,
        },
      },
    }) as any;

    const repository = {
      rootUri: { fsPath: repoRoot },
      state: {
        HEAD: { name: 'feature' },
        onDidChange: vi.fn(),
      },
    } as any;

    setCurrentBranch(repoRoot, 'main');

    await checkBranchChange(repository, context);

    expect(showTextDocumentMock.mock.calls.map((call) => call[0].uri.fsPath)).toEqual([
      '/repo/preserve-order/a.ts',
      '/repo/preserve-order/b.ts',
      '/repo/preserve-order/c.ts',
      '/repo/preserve-order/b.ts',
    ]);
    expect(showTextDocumentMock.mock.calls.map((call) => call[1])).toEqual([
      { preview: false, preserveFocus: true },
      { preview: false, preserveFocus: true },
      { preview: false, preserveFocus: true },
      { preview: false },
    ]);
  });

  it('focuses the active file first and opens remaining tabs in background in focusActiveTabFirst mode', async () => {
    restoreBehaviorSetting = 'focusActiveTabFirst';

    const repoRoot = '/repo/focus-first';
    const savedFiles = ['/repo/focus-first/a.ts', '/repo/focus-first/b.ts', '/repo/focus-first/c.ts'];
    const savedActiveFile = '/repo/focus-first/b.ts';
    const currentBranchFiles = ['/repo/focus-first/current.ts'];
    const currentActiveFile = '/repo/focus-first/current.ts';

    getOpenFilesForRepoMock.mockReturnValue(currentBranchFiles);
    getActiveFileForRepoMock.mockReturnValue(currentActiveFile);

    const context = createContext({
      [repoRoot]: {
        feature: {
          files: savedFiles,
          activeFile: savedActiveFile,
        },
      },
    }) as any;

    const repository = {
      rootUri: { fsPath: repoRoot },
      state: {
        HEAD: { name: 'feature' },
        onDidChange: vi.fn(),
      },
    } as any;

    setCurrentBranch(repoRoot, 'main');

    await checkBranchChange(repository, context);

    expect(showTextDocumentMock.mock.calls.map((call) => call[0].uri.fsPath)).toEqual([
      '/repo/focus-first/b.ts',
      '/repo/focus-first/a.ts',
      '/repo/focus-first/c.ts',
    ]);
    expect(showTextDocumentMock.mock.calls.map((call) => call[1])).toEqual([
      { preview: false },
      { preview: false, preserveFocus: true },
      { preview: false, preserveFocus: true },
    ]);
  });
});
