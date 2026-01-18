/**
 * GitHub Connector TypeScript Types Tests
 * Fase 1: Database & Infrastructure
 *
 * Tests for type exports, const arrays, and interface structures.
 */

import { describe, it, expect } from 'vitest';
import {
  // Const arrays
  GITHUB_ACCOUNT_TYPES,
  GITHUB_ISSUE_STATES,
  GITHUB_PR_STATES,
  SYNC_DIRECTIONS,
  SYNC_STATUSES,
  SYNC_ENTITY_TYPES,
  // Types
  type GitHubAccountType,
  type GitHubIssueState,
  type GitHubPRState,
  type SyncDirection,
  type SyncStatus,
  type SyncEntityType,
  // Interfaces
  type GitHubSyncSettings,
  type GitHubInstallationInfo,
  type GitHubRepositoryInfo,
  type GitHubUserMappingInfo,
  type GitHubIssueInfo,
  type GitHubPullRequestInfo,
  type GitHubCommitInfo,
  type GitHubSyncLogEntry,
  // Input types
  type LinkRepositoryInput,
  type CreateUserMappingInput,
  type UpdateSyncSettingsInput,
} from '../types/github';

// =============================================================================
// Const Array Tests
// =============================================================================

describe('GitHub Const Arrays', () => {
  describe('GITHUB_ACCOUNT_TYPES', () => {
    it('contains user and organization', () => {
      expect(GITHUB_ACCOUNT_TYPES).toContain('user');
      expect(GITHUB_ACCOUNT_TYPES).toContain('organization');
    });

    it('has exactly 2 values', () => {
      expect(GITHUB_ACCOUNT_TYPES.length).toBe(2);
    });

    it('is readonly', () => {
      // TypeScript ensures this at compile time, but we can verify the values are stable
      const expected = ['user', 'organization'] as const;
      expect(GITHUB_ACCOUNT_TYPES).toEqual(expected);
    });
  });

  describe('GITHUB_ISSUE_STATES', () => {
    it('contains open and closed', () => {
      expect(GITHUB_ISSUE_STATES).toContain('open');
      expect(GITHUB_ISSUE_STATES).toContain('closed');
    });

    it('has exactly 2 values', () => {
      expect(GITHUB_ISSUE_STATES.length).toBe(2);
    });
  });

  describe('GITHUB_PR_STATES', () => {
    it('contains open, closed, and merged', () => {
      expect(GITHUB_PR_STATES).toContain('open');
      expect(GITHUB_PR_STATES).toContain('closed');
      expect(GITHUB_PR_STATES).toContain('merged');
    });

    it('has exactly 3 values', () => {
      expect(GITHUB_PR_STATES.length).toBe(3);
    });
  });

  describe('SYNC_DIRECTIONS', () => {
    it('contains all sync directions', () => {
      expect(SYNC_DIRECTIONS).toContain('kanbu_to_github');
      expect(SYNC_DIRECTIONS).toContain('github_to_kanbu');
      expect(SYNC_DIRECTIONS).toContain('bidirectional');
    });

    it('has exactly 3 values', () => {
      expect(SYNC_DIRECTIONS.length).toBe(3);
    });
  });

  describe('SYNC_STATUSES', () => {
    it('contains success, failed, and skipped', () => {
      expect(SYNC_STATUSES).toContain('success');
      expect(SYNC_STATUSES).toContain('failed');
      expect(SYNC_STATUSES).toContain('skipped');
    });

    it('has exactly 3 values', () => {
      expect(SYNC_STATUSES.length).toBe(3);
    });
  });

  describe('SYNC_ENTITY_TYPES', () => {
    it('contains all entity types', () => {
      expect(SYNC_ENTITY_TYPES).toContain('issue');
      expect(SYNC_ENTITY_TYPES).toContain('pr');
      expect(SYNC_ENTITY_TYPES).toContain('commit');
      expect(SYNC_ENTITY_TYPES).toContain('task');
    });

    it('has exactly 4 values', () => {
      expect(SYNC_ENTITY_TYPES.length).toBe(4);
    });
  });
});

// =============================================================================
// Type Value Tests
// =============================================================================

describe('GitHub Types', () => {
  describe('GitHubAccountType', () => {
    it('accepts valid account types', () => {
      const userType: GitHubAccountType = 'user';
      const orgType: GitHubAccountType = 'organization';

      expect(userType).toBe('user');
      expect(orgType).toBe('organization');
    });
  });

  describe('GitHubIssueState', () => {
    it('accepts valid issue states', () => {
      const open: GitHubIssueState = 'open';
      const closed: GitHubIssueState = 'closed';

      expect(open).toBe('open');
      expect(closed).toBe('closed');
    });
  });

  describe('GitHubPRState', () => {
    it('accepts valid PR states', () => {
      const open: GitHubPRState = 'open';
      const closed: GitHubPRState = 'closed';
      const merged: GitHubPRState = 'merged';

      expect(open).toBe('open');
      expect(closed).toBe('closed');
      expect(merged).toBe('merged');
    });
  });

  describe('SyncDirection', () => {
    it('accepts valid sync directions', () => {
      const toGithub: SyncDirection = 'kanbu_to_github';
      const toKanbu: SyncDirection = 'github_to_kanbu';
      const bidirectional: SyncDirection = 'bidirectional';

      expect(toGithub).toBe('kanbu_to_github');
      expect(toKanbu).toBe('github_to_kanbu');
      expect(bidirectional).toBe('bidirectional');
    });
  });

  describe('SyncStatus', () => {
    it('accepts valid sync statuses', () => {
      const success: SyncStatus = 'success';
      const failed: SyncStatus = 'failed';
      const skipped: SyncStatus = 'skipped';

      expect(success).toBe('success');
      expect(failed).toBe('failed');
      expect(skipped).toBe('skipped');
    });
  });

  describe('SyncEntityType', () => {
    it('accepts valid entity types', () => {
      const issue: SyncEntityType = 'issue';
      const pr: SyncEntityType = 'pr';
      const commit: SyncEntityType = 'commit';
      const task: SyncEntityType = 'task';

      expect(issue).toBe('issue');
      expect(pr).toBe('pr');
      expect(commit).toBe('commit');
      expect(task).toBe('task');
    });
  });
});

// =============================================================================
// Interface Structure Tests
// =============================================================================

describe('GitHub Interfaces', () => {
  describe('GitHubSyncSettings', () => {
    it('allows empty settings', () => {
      const settings: GitHubSyncSettings = {};
      expect(settings).toEqual({});
    });

    it('allows partial settings', () => {
      const settings: GitHubSyncSettings = {
        issues: {
          enabled: true,
          direction: 'bidirectional',
        },
      };

      expect(settings.issues?.enabled).toBe(true);
      expect(settings.issues?.direction).toBe('bidirectional');
    });

    it('allows full settings', () => {
      const settings: GitHubSyncSettings = {
        issues: {
          enabled: true,
          direction: 'bidirectional',
          labelMapping: { bug: 'Bug', feature: 'Feature' },
          stateMapping: { open: 'To Do', closed: 'Done' },
        },
        pullRequests: {
          enabled: true,
          autoLink: true,
        },
        commits: {
          enabled: true,
          autoLink: true,
          pattern: 'KANBU-\\d+',
        },
        branches: {
          enabled: true,
          pattern: 'feature/{reference}',
        },
      };

      expect(settings.issues?.enabled).toBe(true);
      expect(settings.issues?.labelMapping?.['bug']).toBe('Bug');
      expect(settings.pullRequests?.autoLink).toBe(true);
      expect(settings.commits?.pattern).toBe('KANBU-\\d+');
      expect(settings.branches?.pattern).toBe('feature/{reference}');
    });
  });

  describe('GitHubInstallationInfo', () => {
    it('has required fields', () => {
      const installation: GitHubInstallationInfo = {
        id: 1,
        workspaceId: 1,
        installationId: BigInt(12345678),
        accountType: 'organization',
        accountLogin: 'my-org',
        permissions: { issues: 'write', pull_requests: 'write' },
        events: ['issues', 'pull_request'],
        createdAt: new Date(),
      };

      expect(installation.id).toBe(1);
      expect(installation.accountType).toBe('organization');
      expect(installation.permissions.issues).toBe('write');
      expect(installation.events).toContain('issues');
    });

    it('allows optional suspendedAt', () => {
      const installation: GitHubInstallationInfo = {
        id: 1,
        workspaceId: 1,
        installationId: BigInt(12345678),
        accountType: 'user',
        accountLogin: 'my-user',
        permissions: {},
        events: [],
        suspendedAt: new Date(),
        createdAt: new Date(),
      };

      expect(installation.suspendedAt).toBeDefined();
    });
  });

  describe('GitHubRepositoryInfo', () => {
    it('has required fields', () => {
      const repo: GitHubRepositoryInfo = {
        id: 1,
        projectId: 1,
        owner: 'my-org',
        name: 'my-repo',
        fullName: 'my-org/my-repo',
        defaultBranch: 'main',
        isPrivate: false,
        syncEnabled: true,
        syncSettings: {},
      };

      expect(repo.fullName).toBe('my-org/my-repo');
      expect(repo.syncEnabled).toBe(true);
    });

    it('allows optional lastSyncAt', () => {
      const repo: GitHubRepositoryInfo = {
        id: 1,
        projectId: 1,
        owner: 'my-org',
        name: 'my-repo',
        fullName: 'my-org/my-repo',
        defaultBranch: 'main',
        isPrivate: true,
        syncEnabled: true,
        syncSettings: {},
        lastSyncAt: new Date(),
      };

      expect(repo.lastSyncAt).toBeDefined();
    });
  });

  describe('GitHubUserMappingInfo', () => {
    it('has required fields', () => {
      const mapping: GitHubUserMappingInfo = {
        id: 1,
        workspaceId: 1,
        userId: 1,
        githubLogin: 'octocat',
        autoMatched: false,
      };

      expect(mapping.githubLogin).toBe('octocat');
      expect(mapping.autoMatched).toBe(false);
    });

    it('allows optional user object', () => {
      const mapping: GitHubUserMappingInfo = {
        id: 1,
        workspaceId: 1,
        userId: 1,
        githubLogin: 'octocat',
        githubId: BigInt(583231),
        githubAvatarUrl: 'https://avatars.githubusercontent.com/u/583231',
        autoMatched: true,
        user: {
          id: 1,
          name: 'Robin Waslander',
          username: 'robin',
          avatarUrl: '/avatars/robin.png',
        },
      };

      expect(mapping.user?.name).toBe('Robin Waslander');
      expect(mapping.githubId).toBe(BigInt(583231));
    });
  });

  describe('GitHubIssueInfo', () => {
    it('has required fields', () => {
      const issue: GitHubIssueInfo = {
        id: 1,
        repositoryId: 1,
        issueNumber: 42,
        issueId: BigInt(123456789),
        title: 'Fix bug in authentication',
        state: 'open',
        syncDirection: 'bidirectional',
      };

      expect(issue.issueNumber).toBe(42);
      expect(issue.state).toBe('open');
    });

    it('allows optional taskId', () => {
      const issue: GitHubIssueInfo = {
        id: 1,
        repositoryId: 1,
        taskId: 100,
        issueNumber: 42,
        issueId: BigInt(123456789),
        title: 'Fix bug',
        state: 'closed',
        syncDirection: 'github_to_kanbu',
        lastSyncAt: new Date(),
      };

      expect(issue.taskId).toBe(100);
    });
  });

  describe('GitHubPullRequestInfo', () => {
    it('has required fields', () => {
      const pr: GitHubPullRequestInfo = {
        id: 1,
        repositoryId: 1,
        prNumber: 123,
        prId: BigInt(987654321),
        title: 'Add new feature',
        state: 'open',
        headBranch: 'feature/KANBU-42',
        baseBranch: 'main',
        authorLogin: 'developer',
      };

      expect(pr.prNumber).toBe(123);
      expect(pr.headBranch).toBe('feature/KANBU-42');
    });

    it('allows merged state with mergedAt', () => {
      const pr: GitHubPullRequestInfo = {
        id: 1,
        repositoryId: 1,
        taskId: 42,
        prNumber: 123,
        prId: BigInt(987654321),
        title: 'Add new feature',
        state: 'merged',
        headBranch: 'feature/KANBU-42',
        baseBranch: 'main',
        authorLogin: 'developer',
        mergedAt: new Date(),
        closedAt: new Date(),
      };

      expect(pr.state).toBe('merged');
      expect(pr.mergedAt).toBeDefined();
    });
  });

  describe('GitHubCommitInfo', () => {
    it('has required fields', () => {
      const commit: GitHubCommitInfo = {
        id: 1,
        repositoryId: 1,
        sha: 'abc123def456789012345678901234567890abcd',
        message: 'Fix: Resolve authentication issue KANBU-42',
        authorName: 'Robin Waslander',
        authorEmail: 'R.Waslander@gmail.com',
        committedAt: new Date(),
      };

      expect(commit.sha.length).toBe(40);
      expect(commit.authorName).toBe('Robin Waslander');
    });

    it('allows optional authorLogin and taskId', () => {
      const commit: GitHubCommitInfo = {
        id: 1,
        repositoryId: 1,
        taskId: 42,
        sha: 'abc123def456789012345678901234567890abcd',
        message: 'Fix: Resolve issue',
        authorName: 'Robin',
        authorEmail: 'robin@example.com',
        authorLogin: 'robin',
        committedAt: new Date(),
      };

      expect(commit.authorLogin).toBe('robin');
      expect(commit.taskId).toBe(42);
    });
  });

  describe('GitHubSyncLogEntry', () => {
    it('has required fields', () => {
      const log: GitHubSyncLogEntry = {
        id: 1,
        repositoryId: 1,
        action: 'issue_created',
        direction: 'github_to_kanbu',
        entityType: 'issue',
        details: { issueNumber: 42 },
        status: 'success',
        createdAt: new Date(),
      };

      expect(log.action).toBe('issue_created');
      expect(log.status).toBe('success');
    });

    it('allows error message on failure', () => {
      const log: GitHubSyncLogEntry = {
        id: 1,
        repositoryId: 1,
        action: 'issue_sync',
        direction: 'kanbu_to_github',
        entityType: 'issue',
        entityId: '42',
        details: { error: 'Rate limited' },
        status: 'failed',
        errorMessage: 'GitHub API rate limit exceeded',
        createdAt: new Date(),
      };

      expect(log.status).toBe('failed');
      expect(log.errorMessage).toContain('rate limit');
    });
  });
});

// =============================================================================
// Input Type Tests
// =============================================================================

describe('GitHub Input Types', () => {
  describe('LinkRepositoryInput', () => {
    it('has required fields', () => {
      const input: LinkRepositoryInput = {
        projectId: 1,
        installationId: 1,
        repoId: 12345,
        owner: 'my-org',
        name: 'my-repo',
        fullName: 'my-org/my-repo',
      };

      expect(input.projectId).toBe(1);
      expect(input.fullName).toBe('my-org/my-repo');
    });

    it('allows optional fields', () => {
      const input: LinkRepositoryInput = {
        projectId: 1,
        installationId: 1,
        repoId: 12345,
        owner: 'my-org',
        name: 'my-repo',
        fullName: 'my-org/my-repo',
        defaultBranch: 'develop',
        isPrivate: true,
        syncSettings: {
          issues: { enabled: true, direction: 'bidirectional' },
        },
      };

      expect(input.defaultBranch).toBe('develop');
      expect(input.isPrivate).toBe(true);
      expect(input.syncSettings?.issues?.enabled).toBe(true);
    });
  });

  describe('CreateUserMappingInput', () => {
    it('has required fields', () => {
      const input: CreateUserMappingInput = {
        workspaceId: 1,
        userId: 1,
        githubLogin: 'octocat',
      };

      expect(input.githubLogin).toBe('octocat');
    });

    it('allows optional GitHub details', () => {
      const input: CreateUserMappingInput = {
        workspaceId: 1,
        userId: 1,
        githubLogin: 'octocat',
        githubId: BigInt(583231),
        githubEmail: 'octocat@github.com',
        githubAvatarUrl: 'https://avatars.githubusercontent.com/u/583231',
        autoMatched: true,
      };

      expect(input.githubId).toBe(BigInt(583231));
      expect(input.autoMatched).toBe(true);
    });
  });

  describe('UpdateSyncSettingsInput', () => {
    it('requires repositoryId', () => {
      const input: UpdateSyncSettingsInput = {
        repositoryId: 1,
      };

      expect(input.repositoryId).toBe(1);
    });

    it('allows updating syncEnabled', () => {
      const input: UpdateSyncSettingsInput = {
        repositoryId: 1,
        syncEnabled: false,
      };

      expect(input.syncEnabled).toBe(false);
    });

    it('allows updating syncSettings', () => {
      const input: UpdateSyncSettingsInput = {
        repositoryId: 1,
        syncSettings: {
          issues: { enabled: true, direction: 'kanbu_to_github' },
          pullRequests: { enabled: true, autoLink: true },
        },
      };

      expect(input.syncSettings?.issues?.direction).toBe('kanbu_to_github');
    });
  });
});

// =============================================================================
// Export Verification Tests
// =============================================================================

describe('GitHub Exports', () => {
  it('exports all const arrays', () => {
    expect(GITHUB_ACCOUNT_TYPES).toBeDefined();
    expect(GITHUB_ISSUE_STATES).toBeDefined();
    expect(GITHUB_PR_STATES).toBeDefined();
    expect(SYNC_DIRECTIONS).toBeDefined();
    expect(SYNC_STATUSES).toBeDefined();
    expect(SYNC_ENTITY_TYPES).toBeDefined();
  });

  it('const arrays have expected values', () => {
    // TypeScript 'as const' provides compile-time readonly, not runtime freeze
    // We verify the arrays contain the expected values
    expect(GITHUB_ACCOUNT_TYPES).toEqual(['user', 'organization']);
    expect(GITHUB_ISSUE_STATES).toEqual(['open', 'closed']);
    expect(GITHUB_PR_STATES).toEqual(['open', 'closed', 'merged']);
    expect(SYNC_DIRECTIONS).toEqual(['kanbu_to_github', 'github_to_kanbu', 'bidirectional']);
    expect(SYNC_STATUSES).toEqual(['success', 'failed', 'skipped']);
    expect(SYNC_ENTITY_TYPES).toEqual(['issue', 'pr', 'commit', 'task']);
  });
});
