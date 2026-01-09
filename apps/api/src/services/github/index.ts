/*
 * GitHub Services Index
 * Version: 5.0.0
 *
 * Central export for all GitHub-related services.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 11 - Geavanceerde Sync
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

export {
  automationService,
  // Settings
  getAutomationSettings,
  // Branch creation
  createBranchForTask,
  branchExists,
  generateBranchName,
  slugify,
  // Column helpers
  findColumnByName,
  findColumnByNameFuzzy,
  // Task automation
  moveTaskToColumn,
  closeTask,
  // Event handlers
  onPROpened,
  onPRReadyForReview,
  onPRMerged,
  onIssueClosed,
  // Types
  type BranchCreationResult,
  type TaskStatusAutomationResult,
  type AutomationSettings,
} from './automationService'

export {
  // Workflow CRUD
  upsertWorkflowRun,
  getWorkflowRuns,
  getTaskWorkflowRuns,
  getPRWorkflowRuns,
  getWorkflowRunDetails,
  // Workflow actions
  rerunWorkflow,
  rerunFailedJobs,
  cancelWorkflow,
  // Job details
  getWorkflowJobs,
  // Statistics
  getWorkflowStats,
  // Webhook handler
  processWorkflowRunEvent,
  // Types
  type WorkflowRunData,
  type WorkflowRunFilters,
  type WorkflowJob,
} from './workflowService'

export {
  // Review CRUD
  upsertReview,
  upsertReviewComment,
  // Review queries
  getReviewsForPR,
  getPRReviewSummary,
  getReviewsForTask,
  getTaskReviewSummary,
  // Review actions
  requestReview,
  getSuggestedReviewers,
  getPendingReviewRequests,
  syncReviewsFromGitHub,
  // Types
  type ReviewData,
  type ReviewCommentData,
  type ReviewState,
  type PRReviewSummary,
} from './reviewService'

export {
  analyticsService,
  // Cycle time
  getCycleTimeStats,
  // Review time
  getReviewTimeStats,
  // Contributors
  getContributorStats,
  // Throughput
  getThroughputStats,
  // Combined
  getProjectAnalytics,
  // Types
  type DateRange,
  type CycleTimeStats,
  type ReviewTimeStats,
  type ContributorStats,
  type ThroughputStats,
  type ProjectAnalytics,
} from './analyticsService'

export {
  milestoneService,
  // Milestone CRUD
  upsertMilestone,
  getMilestones,
  getMilestoneByNumber,
  getProjectMilestones,
  getMilestoneStats,
  deleteMilestone,
  syncMilestoneFromWebhook,
  // Types
  type MilestoneData,
  type MilestoneInfo,
} from './milestoneService'

export {
  releaseService,
  // Release CRUD
  upsertRelease,
  getReleases,
  getReleaseByTag,
  getLatestRelease,
  getProjectReleases,
  getReleaseStats,
  deleteRelease,
  syncReleaseFromWebhook,
  generateReleaseNotes,
  // Types
  type ReleaseData,
  type ReleaseInfo,
  type ReleaseStats,
} from './releaseService'
