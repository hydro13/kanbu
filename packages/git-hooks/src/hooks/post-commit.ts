/*
 * post-commit Hook
 * Version: 1.0.0
 *
 * Links commits to tasks in Kanbu after successful commit.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14B - Developer Experience (Git Hooks)
 * =============================================================================
 */

import { execSync } from 'child_process'
import chalk from 'chalk'
import {
  getConfig,
  extractTaskFromMessage,
  linkCommitToTask,
  isConfigured,
} from '../utils.js'

export async function run(_args: string[]): Promise<number> {
  const cfg = getConfig()
  if (!cfg.enabled) {
    return 0
  }

  // Skip if not configured
  if (!isConfigured()) {
    return 0
  }

  // Get last commit info
  let sha: string
  let message: string
  try {
    sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
    message = execSync('git log -1 --format=%B', { encoding: 'utf-8' }).trim()
  } catch {
    return 0 // Can't get commit info
  }

  // Extract task reference
  const taskRef = extractTaskFromMessage(message)
  if (!taskRef) {
    return 0 // No task reference
  }

  // Link commit to task in Kanbu
  try {
    const success = await linkCommitToTask(taskRef, sha, message)
    if (success) {
      console.log(chalk.green(`✓ Commit linked to ${taskRef} in Kanbu`))
    }
  } catch {
    // API error, don't report (already committed)
  }

  return 0
}
