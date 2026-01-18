/**
 * GitHub Connector TypeScript Types
 * Fase 1: Database & Infrastructure
 *
 * @see docs/Github-connector/ROADMAP.md
 */

// =============================================================================
// Enums & Constants
// =============================================================================

export const GITHUB_ACCOUNT_TYPES = ['user', 'organization'] as const;
export type GitHubAccountType = (typeof GITHUB_ACCOUNT_TYPES)[number];

export const GITHUB_ISSUE_STATES = ['open', 'closed'] as const;
export type GitHubIssueState = (typeof GITHUB_ISSUE_STATES)[number];

export const GITHUB_PR_STATES = ['open', 'closed', 'merged'] as const;
export type GitHubPRState = (typeof GITHUB_PR_STATES)[number];

export const SYNC_DIRECTIONS = ['kanbu_to_github', 'github_to_kanbu', 'bidirectional'] as const;
export type SyncDirection = (typeof SYNC_DIRECTIONS)[number];

export const SYNC_STATUSES = ['success', 'failed', 'skipped'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const SYNC_ENTITY_TYPES = ['issue', 'pr', 'commit', 'task', 'review'] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const GITHUB_REVIEW_STATES = [
  'PENDING',
  'COMMENTED',
  'APPROVED',
  'CHANGES_REQUESTED',
  'DISMISSED',
] as const;
export type GitHubReviewState = (typeof GITHUB_REVIEW_STATES)[number];

// =============================================================================
// Sync Settings Interface
// =============================================================================

export interface GitHubSyncSettings {
  issues?: {
    enabled: boolean;
    direction: SyncDirection;
    labelMapping?: Record<string, string>; // GitHub label → Kanbu tag
    stateMapping?: Record<string, string>; // GitHub state → Kanbu column
  };
  pullRequests?: {
    enabled: boolean;
    autoLink: boolean; // Auto-link PRs based on branch name
  };
  commits?: {
    enabled: boolean;
    autoLink: boolean; // Auto-link commits based on message pattern
    pattern?: string; // Regex pattern to extract task reference
  };
  branches?: {
    enabled: boolean;
    pattern: string; // Branch name pattern, e.g., "feature/{reference}"
  };
  automation?: {
    enabled: boolean;
    // Task status automation
    moveToInProgressOnPROpen?: boolean; // Move task when PR opened
    moveToReviewOnPRReady?: boolean; // Move task when PR ready for review
    moveToDoneOnPRMerge?: boolean; // Move task when PR merged
    closeTaskOnIssueClosed?: boolean; // Close task when GitHub issue closed
    // Column names for automation
    inProgressColumn?: string; // Column name for "In Progress"
    reviewColumn?: string; // Column name for "Review"
    doneColumn?: string; // Column name for "Done"
  };
}

// =============================================================================
// API Response Types
// =============================================================================

export interface GitHubInstallationInfo {
  id: number;
  workspaceId: number;
  installationId: bigint;
  accountType: GitHubAccountType;
  accountLogin: string;
  permissions: Record<string, string>;
  events: string[];
  suspendedAt?: Date | null;
  createdAt: Date;
}

export interface GitHubRepositoryInfo {
  id: number;
  projectId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  syncEnabled: boolean;
  syncSettings: GitHubSyncSettings;
  lastSyncAt?: Date | null;
}

export interface GitHubUserMappingInfo {
  id: number;
  workspaceId: number;
  userId: number;
  githubLogin: string;
  githubId?: bigint | null;
  githubAvatarUrl?: string | null;
  autoMatched: boolean;
  user?: {
    id: number;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
}

export interface GitHubIssueInfo {
  id: number;
  repositoryId: number;
  taskId?: number | null;
  issueNumber: number;
  issueId: bigint;
  title: string;
  state: GitHubIssueState;
  syncDirection: SyncDirection;
  lastSyncAt?: Date | null;
}

export interface GitHubPullRequestInfo {
  id: number;
  repositoryId: number;
  taskId?: number | null;
  prNumber: number;
  prId: bigint;
  title: string;
  state: GitHubPRState;
  headBranch: string;
  baseBranch: string;
  authorLogin: string;
  mergedAt?: Date | null;
  closedAt?: Date | null;
}

export interface GitHubCommitInfo {
  id: number;
  repositoryId: number;
  taskId?: number | null;
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorLogin?: string | null;
  committedAt: Date;
}

export interface GitHubSyncLogEntry {
  id: number;
  repositoryId: number;
  action: string;
  direction: SyncDirection;
  entityType: SyncEntityType;
  entityId?: string | null;
  details: Record<string, unknown>;
  status: SyncStatus;
  errorMessage?: string | null;
  createdAt: Date;
}

// =============================================================================
// API Input Types
// =============================================================================

export interface LinkRepositoryInput {
  projectId: number;
  installationId: number;
  repoId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch?: string;
  isPrivate?: boolean;
  syncSettings?: GitHubSyncSettings;
}

export interface CreateUserMappingInput {
  workspaceId: number;
  userId: number;
  githubLogin: string;
  githubId?: bigint;
  githubEmail?: string;
  githubAvatarUrl?: string;
  autoMatched?: boolean;
}

export interface UpdateSyncSettingsInput {
  repositoryId: number;
  syncEnabled?: boolean;
  syncSettings?: GitHubSyncSettings;
}

// =============================================================================
// Code Review Types (Fase 12)
// =============================================================================

export interface GitHubReviewInfo {
  id: number;
  pullRequestId: number;
  reviewId: bigint;
  authorLogin: string;
  state: GitHubReviewState;
  body?: string | null;
  htmlUrl?: string | null;
  submittedAt?: Date | null;
  createdAt: Date;
}

export interface GitHubReviewCommentInfo {
  id: number;
  reviewId: number;
  commentId: bigint;
  path: string;
  line?: number | null;
  side?: 'LEFT' | 'RIGHT' | null;
  body: string;
  authorLogin: string;
  htmlUrl?: string | null;
  createdAt: Date;
}

export interface PRReviewSummary {
  approved: number;
  changesRequested: number;
  commented: number;
  pending: number;
  latestState: GitHubReviewState | null;
  reviewers: Array<{
    login: string;
    state: GitHubReviewState;
    submittedAt: Date | null;
  }>;
}

export interface TaskReviewSummary extends PRReviewSummary {
  prCount: number;
}
