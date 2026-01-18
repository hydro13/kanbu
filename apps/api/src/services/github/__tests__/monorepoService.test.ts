/*
 * Monorepo Service Tests
 * Version: 1.0.0
 *
 * Tests for monorepo configuration and path-based filtering.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 15 - Multi-Repo Support (Monorepo)
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  matchesPackage,
  findPackageForFile,
  getAffectedPackages,
  filterFilesByPackage,
  getLabelPrefixForFile,
  generatePackageLabels,
  matchGlob,
  filterByPatterns,
  type MonorepoPackage,
  type MonorepoSettings,
} from '../monorepoService';

describe('monorepoService', () => {
  // ===========================================================================
  // Type Tests
  // ===========================================================================

  describe('MonorepoPackage type', () => {
    it('should have correct structure', () => {
      const pkg: MonorepoPackage = {
        path: 'packages/api',
        name: 'API',
        labelPrefix: 'api:',
        columnId: 1,
      };
      expect(pkg.path).toBe('packages/api');
      expect(pkg.name).toBe('API');
      expect(pkg.labelPrefix).toBe('api:');
    });

    it('should allow optional fields', () => {
      const pkg: MonorepoPackage = {
        path: 'apps/web',
        name: 'Web App',
      };
      expect(pkg.labelPrefix).toBeUndefined();
      expect(pkg.columnId).toBeUndefined();
    });
  });

  describe('MonorepoSettings type', () => {
    it('should have correct structure', () => {
      const settings: MonorepoSettings = {
        enabled: true,
        packages: [
          { path: 'packages/api', name: 'API' },
          { path: 'packages/web', name: 'Web' },
        ],
        affectedDetection: {
          enabled: true,
          baseBranch: 'main',
        },
        pathPatterns: {
          include: ['**/*.ts'],
          exclude: ['**/node_modules/**'],
        },
      };

      expect(settings.enabled).toBe(true);
      expect(settings.packages).toHaveLength(2);
      expect(settings.affectedDetection.baseBranch).toBe('main');
    });
  });

  // ===========================================================================
  // Path Matching Tests
  // ===========================================================================

  describe('matchesPackage', () => {
    const pkg: MonorepoPackage = {
      path: 'packages/api',
      name: 'API',
    };

    it('should match files in package directory', () => {
      expect(matchesPackage('packages/api/src/index.ts', pkg)).toBe(true);
      expect(matchesPackage('packages/api/package.json', pkg)).toBe(true);
      expect(matchesPackage('packages/api/src/lib/utils.ts', pkg)).toBe(true);
    });

    it('should not match files outside package', () => {
      expect(matchesPackage('packages/web/src/index.ts', pkg)).toBe(false);
      expect(matchesPackage('src/index.ts', pkg)).toBe(false);
      expect(matchesPackage('package.json', pkg)).toBe(false);
    });

    it('should not match partial path matches', () => {
      expect(matchesPackage('packages/api-client/src/index.ts', pkg)).toBe(false);
    });

    it('should handle paths with backslashes', () => {
      expect(matchesPackage('packages\\api\\src\\index.ts', pkg)).toBe(true);
    });

    it('should handle package path exactly', () => {
      expect(matchesPackage('packages/api', pkg)).toBe(true);
    });
  });

  describe('findPackageForFile', () => {
    const packages: MonorepoPackage[] = [
      { path: 'packages/api', name: 'API' },
      { path: 'packages/web', name: 'Web' },
      { path: 'packages/shared', name: 'Shared' },
      { path: 'packages/shared/components', name: 'Shared Components' },
    ];

    it('should find correct package for file', () => {
      const result = findPackageForFile('packages/api/src/index.ts', packages);
      expect(result?.name).toBe('API');
    });

    it('should return most specific match', () => {
      const result = findPackageForFile('packages/shared/components/Button.tsx', packages);
      expect(result?.name).toBe('Shared Components');
    });

    it('should return null for files outside packages', () => {
      const result = findPackageForFile('src/index.ts', packages);
      expect(result).toBeNull();
    });
  });

  describe('getAffectedPackages', () => {
    const packages: MonorepoPackage[] = [
      { path: 'packages/api', name: 'API' },
      { path: 'packages/web', name: 'Web' },
      { path: 'packages/shared', name: 'Shared' },
    ];

    it('should find affected packages from changed files', () => {
      const changedFiles = [
        'packages/api/src/index.ts',
        'packages/api/src/lib/utils.ts',
        'packages/web/src/App.tsx',
      ];

      const result = getAffectedPackages(changedFiles, packages);

      expect(result.hasChanges).toBe(true);
      expect(result.packages).toHaveLength(2);
      expect(result.packages.map((p) => p.name)).toContain('API');
      expect(result.packages.map((p) => p.name)).toContain('Web');
      expect(result.files).toHaveLength(3);
    });

    it('should return no changes for files outside packages', () => {
      const changedFiles = ['README.md', '.github/workflows/ci.yml'];

      const result = getAffectedPackages(changedFiles, packages);

      expect(result.hasChanges).toBe(false);
      expect(result.packages).toHaveLength(0);
    });

    it('should handle empty file list', () => {
      const result = getAffectedPackages([], packages);

      expect(result.hasChanges).toBe(false);
      expect(result.packages).toHaveLength(0);
    });
  });

  describe('filterFilesByPackage', () => {
    const pkg: MonorepoPackage = { path: 'packages/api', name: 'API' };

    it('should filter files belonging to package', () => {
      const files = [
        'packages/api/src/index.ts',
        'packages/web/src/App.tsx',
        'packages/api/package.json',
      ];

      const result = filterFilesByPackage(files, pkg);

      expect(result).toHaveLength(2);
      expect(result).toContain('packages/api/src/index.ts');
      expect(result).toContain('packages/api/package.json');
    });
  });

  // ===========================================================================
  // Label Management Tests
  // ===========================================================================

  describe('getLabelPrefixForFile', () => {
    const packages: MonorepoPackage[] = [
      { path: 'packages/api', name: 'API', labelPrefix: 'api:' },
      { path: 'packages/web', name: 'Web', labelPrefix: 'web:' },
      { path: 'packages/shared', name: 'Shared' },
    ];

    it('should return label prefix for file', () => {
      const result = getLabelPrefixForFile('packages/api/src/index.ts', packages);
      expect(result).toBe('api:');
    });

    it('should return null for package without label prefix', () => {
      const result = getLabelPrefixForFile('packages/shared/src/utils.ts', packages);
      expect(result).toBeNull();
    });

    it('should return null for files outside packages', () => {
      const result = getLabelPrefixForFile('src/index.ts', packages);
      expect(result).toBeNull();
    });
  });

  describe('generatePackageLabels', () => {
    const packages: MonorepoPackage[] = [
      { path: 'packages/api', name: 'API', labelPrefix: 'api:' },
      { path: 'packages/web', name: 'Web', labelPrefix: 'web:' },
      { path: 'packages/shared', name: 'Shared' },
    ];

    it('should generate labels for affected packages', () => {
      const files = ['packages/api/src/index.ts', 'packages/web/src/App.tsx'];

      const labels = generatePackageLabels(files, packages);

      expect(labels).toHaveLength(2);
      expect(labels).toContain('api');
      expect(labels).toContain('web');
    });

    it('should not duplicate labels', () => {
      const files = ['packages/api/src/index.ts', 'packages/api/src/lib/utils.ts'];

      const labels = generatePackageLabels(files, packages);

      expect(labels).toHaveLength(1);
      expect(labels).toContain('api');
    });

    it('should skip packages without label prefix', () => {
      const files = ['packages/shared/src/utils.ts'];

      const labels = generatePackageLabels(files, packages);

      expect(labels).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Glob Matching Tests
  // ===========================================================================

  describe('matchGlob', () => {
    it('should match simple patterns', () => {
      expect(matchGlob('*.ts', 'index.ts')).toBe(true);
      expect(matchGlob('*.ts', 'index.js')).toBe(false);
    });

    it('should match double star patterns', () => {
      expect(matchGlob('**/*.ts', 'src/index.ts')).toBe(true);
      expect(matchGlob('**/*.ts', 'src/lib/utils.ts')).toBe(true);
      expect(matchGlob('**/*.ts', 'index.ts')).toBe(true);
    });

    it('should match directory patterns', () => {
      expect(matchGlob('src/**/*', 'src/index.ts')).toBe(true);
      expect(matchGlob('src/**/*', 'lib/index.ts')).toBe(false);
    });

    it('should match exact paths', () => {
      expect(matchGlob('package.json', 'package.json')).toBe(true);
      expect(matchGlob('package.json', 'packages/api/package.json')).toBe(false);
    });

    it('should handle question mark wildcard', () => {
      expect(matchGlob('file?.ts', 'file1.ts')).toBe(true);
      expect(matchGlob('file?.ts', 'file12.ts')).toBe(false);
    });
  });

  describe('filterByPatterns', () => {
    it('should filter by include patterns', () => {
      const files = ['index.ts', 'index.js', 'styles.css'];
      const result = filterByPatterns(files, { include: ['*.ts'] });
      expect(result).toEqual(['index.ts']);
    });

    it('should filter by exclude patterns', () => {
      const files = ['index.ts', 'test.ts', 'styles.css'];
      const result = filterByPatterns(files, { exclude: ['*.css'] });
      expect(result).toEqual(['index.ts', 'test.ts']);
    });

    it('should apply both include and exclude', () => {
      const files = ['src/index.ts', 'src/test.ts', 'lib/index.ts'];
      const result = filterByPatterns(files, {
        include: ['src/**/*'],
        exclude: ['**/test.ts'],
      });
      expect(result).toEqual(['src/index.ts']);
    });

    it('should return all files when no patterns', () => {
      const files = ['a.ts', 'b.ts', 'c.ts'];
      const result = filterByPatterns(files);
      expect(result).toEqual(files);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle empty packages list', () => {
      const result = findPackageForFile('src/index.ts', []);
      expect(result).toBeNull();
    });

    it('should handle deeply nested paths', () => {
      const pkg: MonorepoPackage = { path: 'apps', name: 'Apps' };
      const result = matchesPackage('apps/web/src/components/ui/Button.tsx', pkg);
      expect(result).toBe(true);
    });

    it('should handle paths with dots', () => {
      const pkg: MonorepoPackage = { path: 'packages/@scope/core', name: 'Core' };
      const result = matchesPackage('packages/@scope/core/src/index.ts', pkg);
      expect(result).toBe(true);
    });

    it('should handle root-level packages', () => {
      const packages: MonorepoPackage[] = [{ path: 'src', name: 'Source' }];
      const result = getAffectedPackages(['src/index.ts'], packages);
      expect(result.hasChanges).toBe(true);
      expect(result.packages[0]!.name).toBe('Source');
    });
  });
});
