/*
 * Monorepo Service
 * Version: 1.0.0
 *
 * Service for managing monorepo configurations and path-based filtering.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 15 - Multi-Repo Support (Monorepo)
 * =============================================================================
 */

import { prisma } from '../../lib/prisma';

// =============================================================================
// Types
// =============================================================================

export interface MonorepoPackage {
  path: string; // e.g., "packages/api"
  name: string; // e.g., "API"
  labelPrefix?: string; // e.g., "api:" - auto-add to issues in this path
  columnId?: number; // Default column for tasks in this package
}

export interface MonorepoSettings {
  enabled: boolean;
  packages: MonorepoPackage[];
  affectedDetection: {
    enabled: boolean;
    baseBranch: string; // e.g., "main"
  };
  pathPatterns?: {
    include?: string[]; // Glob patterns to include
    exclude?: string[]; // Glob patterns to exclude
  };
}

export interface AffectedPackagesResult {
  packages: MonorepoPackage[];
  files: string[];
  hasChanges: boolean;
}

export interface PackageInfo {
  package: MonorepoPackage;
  fileCount: number;
  recentCommits: number;
  openIssues: number;
  openPRs: number;
}

// =============================================================================
// Default Settings
// =============================================================================

const DEFAULT_MONOREPO_SETTINGS: MonorepoSettings = {
  enabled: false,
  packages: [],
  affectedDetection: {
    enabled: false,
    baseBranch: 'main',
  },
};

// =============================================================================
// Settings Management
// =============================================================================

/**
 * Get monorepo settings for a repository
 */
export async function getMonorepoSettings(repositoryId: number): Promise<MonorepoSettings> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: { syncSettings: true },
  });

  if (!repo?.syncSettings) {
    return DEFAULT_MONOREPO_SETTINGS;
  }

  const settings = repo.syncSettings as Record<string, unknown>;
  const monorepoSettings = settings.monorepo as MonorepoSettings | undefined;

  return {
    ...DEFAULT_MONOREPO_SETTINGS,
    ...monorepoSettings,
    affectedDetection: {
      ...DEFAULT_MONOREPO_SETTINGS.affectedDetection,
      ...(monorepoSettings?.affectedDetection || {}),
    },
  };
}

/**
 * Update monorepo settings for a repository
 */
export async function updateMonorepoSettings(
  repositoryId: number,
  settings: Partial<MonorepoSettings>
): Promise<MonorepoSettings> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: { syncSettings: true },
  });

  const currentSettings = (repo?.syncSettings as Record<string, unknown>) || {};
  const currentMonorepo =
    (currentSettings.monorepo as MonorepoSettings) || DEFAULT_MONOREPO_SETTINGS;

  const newMonorepoSettings: MonorepoSettings = {
    ...currentMonorepo,
    ...settings,
    packages: settings.packages ?? currentMonorepo.packages,
    affectedDetection: {
      ...currentMonorepo.affectedDetection,
      ...(settings.affectedDetection || {}),
    },
  };

  await prisma.gitHubRepository.update({
    where: { id: repositoryId },
    data: {
      syncSettings: JSON.parse(
        JSON.stringify({
          ...currentSettings,
          monorepo: newMonorepoSettings,
        })
      ),
    },
  });

  return newMonorepoSettings;
}

// =============================================================================
// Package Management
// =============================================================================

/**
 * Add a package to monorepo configuration
 */
export async function addPackage(
  repositoryId: number,
  pkg: MonorepoPackage
): Promise<MonorepoSettings> {
  const settings = await getMonorepoSettings(repositoryId);

  // Check if package path already exists
  const existingIndex = settings.packages.findIndex((p) => p.path === pkg.path);
  if (existingIndex >= 0) {
    // Update existing package
    settings.packages[existingIndex] = pkg;
  } else {
    // Add new package
    settings.packages.push(pkg);
  }

  return updateMonorepoSettings(repositoryId, {
    packages: settings.packages,
    enabled: true, // Auto-enable when adding packages
  });
}

/**
 * Remove a package from monorepo configuration
 */
export async function removePackage(
  repositoryId: number,
  packagePath: string
): Promise<MonorepoSettings> {
  const settings = await getMonorepoSettings(repositoryId);
  settings.packages = settings.packages.filter((p) => p.path !== packagePath);

  return updateMonorepoSettings(repositoryId, {
    packages: settings.packages,
    // Auto-disable if no packages left
    enabled: settings.packages.length > 0,
  });
}

/**
 * Get all packages for a repository
 */
export async function getPackages(repositoryId: number): Promise<MonorepoPackage[]> {
  const settings = await getMonorepoSettings(repositoryId);
  return settings.packages;
}

// =============================================================================
// Path Matching
// =============================================================================

/**
 * Check if a file path matches a package
 */
export function matchesPackage(filePath: string, pkg: MonorepoPackage): boolean {
  // Normalize paths
  const normalizedFile = filePath.replace(/\\/g, '/').replace(/^\//, '');
  const normalizedPkg = pkg.path.replace(/\\/g, '/').replace(/^\//, '').replace(/\/$/, '');

  return normalizedFile.startsWith(normalizedPkg + '/') || normalizedFile === normalizedPkg;
}

/**
 * Find which package a file belongs to
 */
export function findPackageForFile(
  filePath: string,
  packages: MonorepoPackage[]
): MonorepoPackage | null {
  // Sort packages by path length (longest first) for most specific match
  const sorted = [...packages].sort((a, b) => b.path.length - a.path.length);

  for (const pkg of sorted) {
    if (matchesPackage(filePath, pkg)) {
      return pkg;
    }
  }

  return null;
}

/**
 * Get affected packages from a list of changed files
 */
export function getAffectedPackages(
  changedFiles: string[],
  packages: MonorepoPackage[]
): AffectedPackagesResult {
  const affectedPkgs = new Set<MonorepoPackage>();
  const affectedFiles: string[] = [];

  for (const file of changedFiles) {
    const pkg = findPackageForFile(file, packages);
    if (pkg) {
      affectedPkgs.add(pkg);
      affectedFiles.push(file);
    }
  }

  return {
    packages: Array.from(affectedPkgs),
    files: affectedFiles,
    hasChanges: affectedPkgs.size > 0,
  };
}

/**
 * Filter files by package
 */
export function filterFilesByPackage(files: string[], pkg: MonorepoPackage): string[] {
  return files.filter((file) => matchesPackage(file, pkg));
}

// =============================================================================
// Label Management
// =============================================================================

/**
 * Get label prefix for a file path
 */
export function getLabelPrefixForFile(
  filePath: string,
  packages: MonorepoPackage[]
): string | null {
  const pkg = findPackageForFile(filePath, packages);
  return pkg?.labelPrefix || null;
}

/**
 * Generate labels for affected packages
 */
export function generatePackageLabels(
  changedFiles: string[],
  packages: MonorepoPackage[]
): string[] {
  const labels = new Set<string>();

  for (const file of changedFiles) {
    const pkg = findPackageForFile(file, packages);
    if (pkg?.labelPrefix) {
      labels.add(pkg.labelPrefix.replace(/:$/, '')); // Remove trailing colon
    }
  }

  return Array.from(labels);
}

// =============================================================================
// Package Statistics
// =============================================================================

/**
 * Get statistics for all packages in a repository
 */
export async function getPackageStats(repositoryId: number): Promise<PackageInfo[]> {
  const settings = await getMonorepoSettings(repositoryId);

  if (!settings.enabled || settings.packages.length === 0) {
    return [];
  }

  // Get all commits and PRs for the repo
  const [commits, pullRequests, issues] = await Promise.all([
    prisma.gitHubCommit.findMany({
      where: { repositoryId },
      select: { message: true },
      orderBy: { committedAt: 'desc' },
      take: 1000, // Last 1000 commits
    }),
    prisma.gitHubPullRequest.findMany({
      where: { repositoryId, state: 'open' },
      select: { headBranch: true, title: true },
    }),
    prisma.gitHubIssue.findMany({
      where: { repositoryId, state: 'open' },
      select: { title: true },
    }),
  ]);

  // Calculate stats per package (simplified - in real impl would parse commit files)
  const packageStats: PackageInfo[] = settings.packages.map((pkg) => {
    // Count commits mentioning the package path
    const packageCommits = commits.filter(
      (c) =>
        c.message.toLowerCase().includes(pkg.path.toLowerCase()) ||
        c.message.toLowerCase().includes(pkg.name.toLowerCase())
    ).length;

    // Count PRs with branch names containing package path
    const packagePRs = pullRequests.filter(
      (pr) =>
        pr.headBranch.toLowerCase().includes(pkg.path.toLowerCase()) ||
        pr.title.toLowerCase().includes(pkg.name.toLowerCase())
    ).length;

    // Count issues mentioning package
    const packageIssues = issues.filter(
      (i) =>
        i.title.toLowerCase().includes(pkg.name.toLowerCase()) ||
        (pkg.labelPrefix && i.title.toLowerCase().includes(pkg.labelPrefix.replace(':', '')))
    ).length;

    return {
      package: pkg,
      fileCount: 0, // Would need GitHub API to get actual file count
      recentCommits: packageCommits,
      openIssues: packageIssues,
      openPRs: packagePRs,
    };
  });

  return packageStats;
}

// =============================================================================
// Glob Pattern Matching
// =============================================================================

/**
 * Simple glob pattern matching
 */
export function matchGlob(pattern: string, path: string): boolean {
  // Normalize paths
  const normalizedPattern = pattern.replace(/\\/g, '/');
  const normalizedPath = path.replace(/\\/g, '/');

  // Convert glob pattern to regex - handle globs BEFORE escaping special chars
  const regexPattern = normalizedPattern
    // Use placeholder for ** first (before escaping)
    .replace(/\*\*\//g, '<<GLOBSTAR_SLASH>>')
    .replace(/\/\*\*/g, '<<SLASH_GLOBSTAR>>')
    .replace(/\*\*/g, '<<GLOBSTAR>>')
    // Escape special regex characters except * and ?
    .replace(/\./g, '\\.')
    .replace(/\$/g, '\\$')
    .replace(/\^/g, '\\^')
    .replace(/\+/g, '\\+')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\|/g, '\\|')
    // Handle single * (anything except /)
    .replace(/\*/g, '[^/]*')
    // Handle ? (single character except /)
    .replace(/\?/g, '[^/]')
    // Convert placeholders back to proper regex
    .replace(/<<GLOBSTAR_SLASH>>/g, '(?:[^/]+/)*') // **/ matches zero or more directories
    .replace(/<<SLASH_GLOBSTAR>>/g, '(?:/.*)?') // /** matches everything after
    .replace(/<<GLOBSTAR>>/g, '.*'); // ** alone matches everything

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedPath);
}

/**
 * Filter files by include/exclude patterns
 */
export function filterByPatterns(
  files: string[],
  patterns?: { include?: string[]; exclude?: string[] }
): string[] {
  if (!patterns) return files;

  let result = files;

  // Apply include patterns
  if (patterns.include && patterns.include.length > 0) {
    result = result.filter((file) => patterns.include!.some((pattern) => matchGlob(pattern, file)));
  }

  // Apply exclude patterns
  if (patterns.exclude && patterns.exclude.length > 0) {
    result = result.filter(
      (file) => !patterns.exclude!.some((pattern) => matchGlob(pattern, file))
    );
  }

  return result;
}

// =============================================================================
// Service Export
// =============================================================================

export const monorepoService = {
  // Settings
  getMonorepoSettings,
  updateMonorepoSettings,
  // Package management
  addPackage,
  removePackage,
  getPackages,
  // Path matching
  matchesPackage,
  findPackageForFile,
  getAffectedPackages,
  filterFilesByPackage,
  // Label management
  getLabelPrefixForFile,
  generatePackageLabels,
  // Statistics
  getPackageStats,
  // Glob matching
  matchGlob,
  filterByPatterns,
};

export default monorepoService;
