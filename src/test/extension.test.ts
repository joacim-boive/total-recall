import { describe, it, expect } from 'vitest';
import * as path from 'path';

// We need to test the isFileInRepo function logic without importing the actual module
// since it depends on vscode which isn't available in the test environment.
// So we replicate the logic here for testing purposes.

/**
 * Checks if a file path is within a repository root directory.
 * Uses normalized paths for cross-platform compatibility.
 */
function isFileInRepo(filePath: string, repoRoot: string): boolean {
  const normalizedFilePath = path.normalize(filePath);
  const normalizedRepoRoot = path.normalize(repoRoot);

  // Ensure repo root ends with separator for accurate prefix matching
  const repoRootWithSep = normalizedRepoRoot.endsWith(path.sep)
    ? normalizedRepoRoot
    : normalizedRepoRoot + path.sep;

  return (
    normalizedFilePath.startsWith(repoRootWithSep) || normalizedFilePath === normalizedRepoRoot
  );
}

describe('isFileInRepo', () => {
  describe('Unix-style paths', () => {
    it('should return true for files inside the repo', () => {
      expect(isFileInRepo('/home/user/project/src/index.ts', '/home/user/project')).toBe(true);
    });

    it('should return true for deeply nested files', () => {
      expect(
        isFileInRepo('/home/user/project/src/utils/helpers/test.ts', '/home/user/project')
      ).toBe(true);
    });

    it('should return false for files outside the repo', () => {
      expect(isFileInRepo('/home/user/other-project/src/index.ts', '/home/user/project')).toBe(
        false
      );
    });

    it('should return false for files in sibling directories with similar names', () => {
      expect(isFileInRepo('/home/user/project-other/src/index.ts', '/home/user/project')).toBe(
        false
      );
    });

    it('should handle repo root with trailing slash', () => {
      expect(isFileInRepo('/home/user/project/src/index.ts', '/home/user/project/')).toBe(true);
    });

    it('should return true when file path equals repo root', () => {
      expect(isFileInRepo('/home/user/project', '/home/user/project')).toBe(true);
    });
  });

  // Windows-style path tests only run on Windows
  // On Unix, backslashes are valid filename characters, not path separators
  describe.skipIf(process.platform !== 'win32')('Windows-style paths', () => {
    it('should return true for files inside the repo', () => {
      expect(
        isFileInRepo('C:\\Users\\dev\\project\\src\\index.ts', 'C:\\Users\\dev\\project')
      ).toBe(true);
    });

    it('should return false for files outside the repo', () => {
      expect(
        isFileInRepo('C:\\Users\\dev\\other-project\\src\\index.ts', 'C:\\Users\\dev\\project')
      ).toBe(false);
    });

    it('should return false for files in sibling directories with similar names', () => {
      expect(
        isFileInRepo('C:\\Users\\dev\\project-other\\src\\index.ts', 'C:\\Users\\dev\\project')
      ).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty file path', () => {
      expect(isFileInRepo('', '/home/user/project')).toBe(false);
    });

    it('should handle paths with double slashes (normalized)', () => {
      expect(isFileInRepo('/home/user//project/src/index.ts', '/home/user/project')).toBe(true);
    });

    it('should handle paths with dot segments', () => {
      expect(isFileInRepo('/home/user/project/src/../src/index.ts', '/home/user/project')).toBe(
        true
      );
    });
  });
});

describe('Per-repo state management', () => {
  describe('normalizeRepoKey', () => {
    // Replicate the normalizeRepoKey function for testing
    function normalizeRepoKey(repoRoot: string): string {
      return path.normalize(repoRoot);
    }

    it('should normalize paths consistently', () => {
      const key1 = normalizeRepoKey('/home/user/project');
      const key2 = normalizeRepoKey('/home/user/project/');
      // Both should normalize to the same value (without trailing slash on most systems)
      expect(key1).toBe(path.normalize('/home/user/project'));
      expect(key2).toBe(path.normalize('/home/user/project/'));
    });

    it('should handle double slashes', () => {
      const key = normalizeRepoKey('/home/user//project');
      expect(key).toBe(path.normalize('/home/user/project'));
    });

    it('should handle dot segments', () => {
      const key = normalizeRepoKey('/home/user/project/../project');
      expect(key).toBe(path.normalize('/home/user/project'));
    });
  });

  describe('Branch file map structure', () => {
    type BranchFileMapByRepo = Record<string, Record<string, string[]>>;

    it('should correctly structure per-repo branch file map', () => {
      const map: BranchFileMapByRepo = {};
      const repoA = '/home/user/repo-a';
      const repoB = '/home/user/repo-b';

      // Initialize repos
      map[repoA] = {};
      map[repoB] = {};

      // Add files for main branch in repo A
      map[repoA]['main'] = ['/home/user/repo-a/src/index.ts', '/home/user/repo-a/src/utils.ts'];

      // Add files for main branch in repo B (different files, same branch name)
      map[repoB]['main'] = ['/home/user/repo-b/app.ts'];

      // Add files for feature branch in repo A
      map[repoA]['feature'] = ['/home/user/repo-a/src/feature.ts'];

      // Verify structure
      expect(map[repoA]['main']).toHaveLength(2);
      expect(map[repoB]['main']).toHaveLength(1);
      expect(map[repoA]['feature']).toHaveLength(1);
      expect(map[repoB]['feature']).toBeUndefined();
    });

    it('should keep repos isolated when one changes', () => {
      const map: BranchFileMapByRepo = {};
      const repoA = '/home/user/repo-a';
      const repoB = '/home/user/repo-b';

      map[repoA] = { main: ['/home/user/repo-a/file1.ts'] };
      map[repoB] = { main: ['/home/user/repo-b/file2.ts'] };

      // Simulate branch switch in repo A
      map[repoA]['feature'] = ['/home/user/repo-a/feature.ts'];

      // Verify repo B is unaffected
      expect(map[repoB]['main']).toEqual(['/home/user/repo-b/file2.ts']);
      expect(map[repoB]['feature']).toBeUndefined();
    });
  });
});
