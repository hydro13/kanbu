/*
 * GitHub Services Index
 * Version: 2.0.0
 *
 * Central export for all GitHub-related services.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 7 - PR & Commit Tracking
 * =============================================================================
 */

export {
  githubService,
  isGitHubConfigured,
  getGitHubApp,
  getInstallationOctokit,
  getInstallationToken,
  getInstallationUrl,
  getOAuthUrl,
  exchangeOAuthCode,
  getInstallationInfo,
  listInstallationRepositories,
  getGitHubUser,
  type GitHubConfig,
  type InstallationInfo,
} from './githubService'

export {
  issueSyncService,
  // Inbound (GitHub → Kanbu)
  mapGitHubUserToKanbu,
  mapGitHubAssignees,
  getOrCreateTagsFromLabels,
  getColumnForIssueState,
  createTaskFromGitHubIssue,
  updateTaskFromGitHubIssue,
  importIssuesFromGitHub,
  getImportProgress,
  clearImportProgress,
  // Outbound (Kanbu → GitHub)
  mapKanbuUserToGitHub,
  mapKanbuAssigneesToGitHub,
  getLabelsFromTags,
  calculateSyncHash,
  hasTaskChangedSinceSync,
  createGitHubIssueFromTask,
  updateGitHubIssueFromTask,
  syncTaskToGitHub,
} from './issueSyncService'

export {
  prCommitLinkService,
  // Reference extraction
  extractTaskReferences,
  extractTaskFromBranch,
  findTaskByReference,
  findTaskFromReferences,
  // PR linking
  autoLinkPRToTask,
  autoLinkPRToTaskWithBody,
  linkPRToTask,
  unlinkPRFromTask,
  // Commit linking
  autoLinkCommitToTask,
  linkCommitToTask,
  unlinkCommitFromTask,
  // Batch processing
  getLinkingOptionsFromSettings,
  processNewPR,
  processNewCommits,
  // Queries
  getTaskPRs,
  getTaskCommits,
  getPRByNumber,
  getCommitBySha,
  // Types
  type TaskReference,
  type PRLinkResult,
  type CommitLinkResult,
  type LinkingOptions,
} from './prCommitLinkService'
