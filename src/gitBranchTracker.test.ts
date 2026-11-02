import { beforeEach, describe, expect, it, vi } from 'vitest';

const getExtensionMock = vi.fn();
const getCurrentBranchMock = vi.fn();
const setCurrentBranchMock = vi.fn();
const watchRepositoryMock = vi.fn();

vi.mock('vscode', () => ({
  extensions: {
    getExtension: (...args: unknown[]) => getExtensionMock(...args),
  },
}));

vi.mock('./gitUtils/branchUtils', () => ({
  getCurrentBranch: (...args: unknown[]) => getCurrentBranchMock(...args),
}));

vi.mock('./gitUtils/branchChecker', () => ({
  setCurrentBranch: (...args: unknown[]) => setCurrentBranchMock(...args),
}));

vi.mock('./gitUtils/repositoryWatcher', () => ({
  watchRepository: (...args: unknown[]) => watchRepositoryMock(...args),
}));

import { setupGitBranchTracker } from './gitBranchTracker';

type FakeGitApi = {
  repositories: Array<{
    rootUri: { fsPath: string };
    state: { onDidChange: ReturnType<typeof vi.fn> };
  }>;
  onDidOpenRepository: ReturnType<typeof vi.fn>;
};

function createContext() {
  return {
    workspaceState: {
      get: vi.fn(),
      update: vi.fn(),
    },
  } as never;
}

describe('setupGitBranchTracker git activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentBranchMock.mockResolvedValue('main');
  });

  it('activates vscode.git before reading exports (regression: silent no-op when git loads later)', async () => {
    const gitApi: FakeGitApi = {
      repositories: [
        {
          rootUri: { fsPath: '/repo' },
          state: { onDidChange: vi.fn() },
        },
      ],
      onDidOpenRepository: vi.fn(),
    };

    let exportsAccessedWhileInactive = false;
    const gitExtension = {
      isActive: false,
      activate: vi.fn(async () => {
        gitExtension.isActive = true;
        return gitExtension.exports;
      }),
      get exports() {
        if (!gitExtension.isActive) {
          exportsAccessedWhileInactive = true;
          throw new Error("Extension 'vscode.git' is not known or not activated");
        }
        return {
          getAPI: (version: number) => {
            expect(version).toBe(1);
            return gitApi;
          },
        };
      },
    };

    getExtensionMock.mockReturnValue(gitExtension);

    await setupGitBranchTracker(createContext());

    expect(exportsAccessedWhileInactive).toBe(false);
    expect(gitExtension.activate).toHaveBeenCalledTimes(1);
    expect(gitApi.onDidOpenRepository).toHaveBeenCalledTimes(1);
    expect(setCurrentBranchMock).toHaveBeenCalledWith('/repo', 'main');
    expect(watchRepositoryMock).toHaveBeenCalledTimes(1);
  });

  it('skips activate when vscode.git is already active', async () => {
    const gitApi: FakeGitApi = {
      repositories: [],
      onDidOpenRepository: vi.fn(),
    };

    const gitExtension = {
      isActive: true,
      activate: vi.fn(),
      exports: {
        getAPI: () => gitApi,
      },
    };

    getExtensionMock.mockReturnValue(gitExtension);

    await setupGitBranchTracker(createContext());

    expect(gitExtension.activate).not.toHaveBeenCalled();
    expect(gitApi.onDidOpenRepository).toHaveBeenCalledTimes(1);
  });

  it('no-ops when vscode.git is missing', async () => {
    getExtensionMock.mockReturnValue(undefined);

    await expect(setupGitBranchTracker(createContext())).resolves.toBeUndefined();
  });
});
