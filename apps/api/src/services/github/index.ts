/*
 * GitHub Services Index
 * Version: 1.0.0
 *
 * Central export for all GitHub-related services.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 2 - GitHub App & OAuth
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
