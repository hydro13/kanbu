/*
 * commit-msg Hook
 * Version: 1.0.0
 *
 * Validates that commit messages contain a task reference.
 * Can be configured to warn or block commits without task references.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14B - Developer Experience (Git Hooks)
 * =============================================================================
 */

import { readFileSync } from 'fs';
import chalk from 'chalk';
import {
  getConfig,
  hasTaskReference,
  extractTaskFromMessage,
  fetchTask,
  isConfigured,
} from '../utils.js';

export async function run(args: string[]): Promise<number> {
  const cfg = getConfig();
  if (!cfg.enabled) {
    return 0;
  }

  const commitMsgFile = args[0];
  if (!commitMsgFile) {
    console.error('commit-msg: No commit message file provided');
    return 1;
  }

  // Read commit message
  let message: string;
  try {
    message = readFileSync(commitMsgFile, 'utf-8');
  } catch {
    return 0; // Can't read file, let git handle it
  }

  // Check for task reference
  if (!hasTaskReference(message)) {
    console.log(chalk.yellow('⚠️  No task reference found in commit message'));
    console.log(chalk.dim('   Add a task reference like [PROJ-123] to link this commit'));
    console.log();
    // Warning only, don't block the commit
    return 0;
  }

  // Extract and validate task reference if API is configured
  const taskRef = extractTaskFromMessage(message);
  if (taskRef && isConfigured()) {
    try {
      const task = await fetchTask(taskRef);
      if (task) {
        console.log(chalk.green(`✓ Linked to task: ${task.reference} - ${task.title}`));
      } else {
        console.log(chalk.yellow(`⚠️  Task ${taskRef} not found in Kanbu`));
      }
    } catch {
      // API error, don't block commit
    }
  }

  return 0;
}
