/*
 * PR Commands
 * Version: 1.0.0
 *
 * Pull request commands for Kanbu CLI.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14 - Developer Experience
 * =============================================================================
 */

import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { config } from '../config.js';
import { api, ApiError } from '../api.js';

interface CreateOptions {
  title?: string;
  draft?: boolean;
  base?: string;
}

function requireAuth() {
  if (!config.isAuthenticated()) {
    console.log(chalk.yellow('Not logged in. Run: kanbu login'));
    process.exit(1);
  }
}

function getCurrentBranch(): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function extractTaskRef(branchName: string): string | null {
  // Common patterns: feature/PROJ-123, PROJ-123-description, feature/PROJ-123-description
  const patterns = [
    /([A-Z]+-\d+)/i, // PROJ-123 anywhere in the branch name
    /feature\/([A-Z]+-\d+)/i,
    /bugfix\/([A-Z]+-\d+)/i,
    /hotfix\/([A-Z]+-\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = branchName.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

export const prCommands = {
  async create(options: CreateOptions) {
    requireAuth();

    const branch = getCurrentBranch();
    if (!branch) {
      console.log(chalk.red('Not in a git repository or could not determine current branch.'));
      return;
    }

    if (branch === 'main' || branch === 'master') {
      console.log(chalk.red('Cannot create PR from main/master branch.'));
      return;
    }

    const spinner = ora('Creating pull request...').start();

    try {
      // Extract task reference from branch name
      const taskRef = extractTaskRef(branch);
      let task = null;

      if (taskRef) {
        spinner.text = `Found task reference: ${taskRef}`;
        try {
          task = await api.getTask(taskRef);
        } catch {
          // Task not found, continue without linking
        }
      }

      // Determine PR title
      const title = options.title || (task ? `${taskRef}: ${task.title}` : branch);
      const baseBranch = options.base || 'main';

      // Push branch to remote first
      spinner.text = 'Pushing branch to remote...';
      try {
        execSync(`git push -u origin ${branch}`, { stdio: 'pipe' });
      } catch {
        // Branch might already be pushed
      }

      // Create PR using GitHub CLI if available, otherwise show instructions
      spinner.text = 'Creating PR...';

      let prCreated = false;
      let prUrl = '';

      try {
        // Try using gh CLI
        const draftFlag = options.draft ? '--draft' : '';
        const cmd = `gh pr create --title "${title}" --base ${baseBranch} ${draftFlag} --body "Linked to Kanbu task: ${taskRef || 'None'}"`;
        const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
        prUrl = output.trim();
        prCreated = true;
      } catch {
        // gh CLI not available or error
      }

      if (prCreated) {
        spinner.succeed(chalk.green('Pull request created!'));
        console.log(`  URL: ${chalk.cyan(prUrl)}`);
        if (taskRef && task) {
          console.log(`  Linked to: ${chalk.bold(taskRef)}`);
        }
      } else {
        spinner.warn(chalk.yellow('Could not create PR automatically'));
        console.log('');
        console.log('Please create the PR manually on GitHub:');
        console.log(`  Branch: ${chalk.cyan(branch)}`);
        console.log(`  Base:   ${chalk.cyan(baseBranch)}`);
        console.log(`  Title:  ${chalk.cyan(title)}`);
        if (taskRef) {
          console.log(`  Task:   ${chalk.cyan(taskRef)}`);
        }
        console.log('');
        console.log(chalk.gray('Tip: Install GitHub CLI (gh) for automatic PR creation'));
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to create pull request');
      if (error instanceof ApiError) {
        console.log(chalk.red(`\nError: ${error.message}`));
      } else {
        console.log(
          chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`)
        );
      }
    }
  },

  async status() {
    requireAuth();

    const branch = getCurrentBranch();
    if (!branch) {
      console.log(chalk.red('Not in a git repository.'));
      return;
    }

    const spinner = ora('Checking PR status...').start();

    try {
      // Extract task reference from branch
      const taskRef = extractTaskRef(branch);

      if (!taskRef) {
        spinner.stop();
        console.log(chalk.yellow('\nNo task reference found in branch name.'));
        console.log(`Branch: ${chalk.cyan(branch)}`);
        console.log('');
        console.log(chalk.gray('Branch name patterns supported:'));
        console.log(chalk.gray('  feature/PROJ-123, PROJ-123-description, etc.'));
        return;
      }

      // Get task and its PRs
      const task = await api.getTask(taskRef);
      const prs = await api.getTaskPRs(task.id);

      spinner.stop();

      console.log('');
      console.log(chalk.bold(`Task: ${task.reference}`));
      console.log(`  Title:  ${task.title}`);
      console.log(`  Status: ${task.columnName || 'Backlog'}`);
      console.log('');

      if (prs.length === 0) {
        console.log(chalk.yellow('No pull requests linked to this task.'));
      } else {
        console.log(chalk.bold('Pull Requests:'));
        for (const pr of prs) {
          const stateColor =
            pr.state === 'open' ? chalk.green : pr.state === 'merged' ? chalk.magenta : chalk.red;

          console.log(`  #${pr.prNumber} ${stateColor(`[${pr.state}]`)} ${pr.title}`);
          console.log(`    Branch: ${chalk.gray(pr.headBranch)}`);
        }
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to check PR status');
      if (error instanceof ApiError) {
        console.log(chalk.red(`\nError: ${error.message}`));
      }
    }
  },

  async link(taskRef: string) {
    requireAuth();

    const branch = getCurrentBranch();
    if (!branch) {
      console.log(chalk.red('Not in a git repository.'));
      return;
    }

    const spinner = ora('Linking PR to task...').start();

    try {
      // Get current PR number from branch (using gh CLI)
      let prNumber: number | null = null;

      try {
        const output = execSync('gh pr view --json number', {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        const data = JSON.parse(output);
        prNumber = data.number;
      } catch {
        spinner.fail('No PR found for current branch');
        console.log(chalk.gray('\nMake sure you have a PR open for this branch.'));
        return;
      }

      if (!prNumber) {
        spinner.fail('Could not determine PR number');
        return;
      }

      // Link PR to task
      await api.linkPRToTask(prNumber, taskRef.toUpperCase());

      spinner.succeed(
        chalk.green(`Linked PR #${prNumber} to task ${chalk.bold(taskRef.toUpperCase())}`)
      );
    } catch (error) {
      spinner.fail('Failed to link PR');
      if (error instanceof ApiError) {
        console.log(chalk.red(`\nError: ${error.message}`));
      }
    }
  },
};

export default prCommands;
