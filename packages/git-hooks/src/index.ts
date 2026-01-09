/*
 * Kanbu Git Hooks
 * Version: 1.0.0
 *
 * Git hooks for Kanbu task management integration.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14B - Developer Experience (Git Hooks)
 * =============================================================================
 */

// Export utilities for programmatic use
export {
  getConfig,
  setConfig,
  isConfigured,
  getGitRoot,
  getCurrentBranch,
  getHooksDir,
  extractTaskFromBranch,
  extractTaskFromMessage,
  hasTaskReference,
  addTaskToMessage,
  installHook,
  uninstallHook,
  isKanbuHook,
  fetchTask,
  linkCommitToTask,
  type TaskInfo,
} from './utils.js'

// Export hook runners
export { run as runPrepareCommitMsg } from './hooks/prepare-commit-msg.js'
export { run as runCommitMsg } from './hooks/commit-msg.js'
export { run as runPostCommit } from './hooks/post-commit.js'
