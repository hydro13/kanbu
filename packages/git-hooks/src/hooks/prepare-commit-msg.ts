/*
 * prepare-commit-msg Hook
 * Version: 1.0.0
 *
 * Automatically adds task reference to commit messages based on branch name.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14B - Developer Experience (Git Hooks)
 * =============================================================================
 */

import { readFileSync, writeFileSync } from 'fs';
import {
  getConfig,
  getCurrentBranch,
  extractTaskFromBranch,
  hasTaskReference,
  addTaskToMessage,
} from '../utils.js';

export async function run(args: string[]): Promise<number> {
  const cfg = getConfig();
  if (!cfg.enabled) {
    return 0;
  }

  const commitMsgFile = args[0];
  const commitSource = args[1]; // message, template, merge, squash, commit

  if (!commitMsgFile) {
    console.error('prepare-commit-msg: No commit message file provided');
    return 1;
  }

  // Skip for merge, squash, and amend commits
  if (commitSource === 'merge' || commitSource === 'squash' || commitSource === 'commit') {
    return 0;
  }

  // Get current branch
  const branch = getCurrentBranch();
  if (!branch || branch === 'HEAD') {
    return 0; // Detached HEAD, skip
  }

  // Extract task reference from branch name
  const taskRef = extractTaskFromBranch(branch);
  if (!taskRef) {
    return 0; // No task reference found
  }

  // Read current commit message
  let message: string;
  try {
    message = readFileSync(commitMsgFile, 'utf-8');
  } catch {
    return 0; // Can't read file, let git handle it
  }

  // Skip if message already has a task reference
  if (hasTaskReference(message)) {
    return 0;
  }

  // Add task reference to message
  const newMessage = addTaskToMessage(message, taskRef);

  try {
    writeFileSync(commitMsgFile, newMessage);
  } catch (error) {
    console.error('prepare-commit-msg: Failed to update commit message');
    return 1;
  }

  return 0;
}
