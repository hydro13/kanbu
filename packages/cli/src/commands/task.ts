/*
 * Task Commands
 * Version: 1.0.0
 *
 * Task management commands for Kanbu CLI.
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
import { config } from '../config.js';
import { api, ApiError } from '../api.js';
import { execSync } from 'child_process';

interface ListOptions {
  project?: string;
  status?: 'open' | 'closed' | 'all';
  assigned?: boolean;
  limit?: string;
}

interface StartOptions {
  branch?: string;
}

interface CreateOptions {
  project?: string;
  title?: string;
  description?: string;
  priority?: string;
}

function requireAuth() {
  if (!config.isAuthenticated()) {
    console.log(chalk.yellow('Not logged in. Run: kanbu login'));
    process.exit(1);
  }
}

function formatPriority(priority: string): string {
  const colors: Record<string, (s: string) => string> = {
    URGENT: chalk.red.bold,
    HIGH: chalk.red,
    MEDIUM: chalk.yellow,
    LOW: chalk.gray,
  };
  return (colors[priority] || chalk.white)(priority);
}

export const taskCommands = {
  async list(options: ListOptions) {
    requireAuth();

    const spinner = ora('Fetching tasks...').start();

    try {
      // Get project ID if slug provided
      let projectId: number | undefined;

      const projectSlug = options.project || config.get('defaultProject');
      if (projectSlug) {
        try {
          const project = await api.getProject(projectSlug);
          projectId = project.id;
        } catch {
          spinner.fail(`Project not found: ${projectSlug}`);
          return;
        }
      }

      const result = await api.listTasks({
        projectId,
        status: options.status as 'open' | 'closed' | 'all',
        assignedToMe: options.assigned,
        limit: parseInt(options.limit || '20', 10),
      });

      spinner.stop();

      if (result.tasks.length === 0) {
        console.log(chalk.yellow('\nNo tasks found.'));
        return;
      }

      console.log('');
      console.log(chalk.bold(`Tasks (${result.tasks.length} of ${result.total}):\n`));

      // Print table header
      console.log(
        chalk.gray(
          `  ${'Reference'.padEnd(12)} ${'Title'.padEnd(40)} ${'Status'.padEnd(15)} ${'Priority'.padEnd(10)}`
        )
      );
      console.log(chalk.gray('  ' + '-'.repeat(80)));

      for (const task of result.tasks) {
        const title = task.title.length > 38 ? task.title.slice(0, 35) + '...' : task.title;
        console.log(
          `  ${chalk.cyan(task.reference.padEnd(12))} ${title.padEnd(40)} ${(task.columnName || 'Backlog').padEnd(15)} ${formatPriority(task.priority)}`
        );
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch tasks');
      if (error instanceof ApiError) {
        console.log(chalk.red(`\nError: ${error.message}`));
      }
    }
  },

  async show(reference: string) {
    requireAuth();

    const spinner = ora(`Fetching task ${reference}...`).start();

    try {
      const task = await api.getTask(reference.toUpperCase());
      spinner.stop();

      console.log('');
      console.log(chalk.bold.cyan(`${task.reference}: ${task.title}`));
      console.log('');

      console.log(`  ${chalk.gray('Status:')}     ${task.columnName || 'Backlog'}`);
      console.log(`  ${chalk.gray('Priority:')}   ${formatPriority(task.priority)}`);
      console.log(`  ${chalk.gray('Project:')}    ${task.projectSlug}`);

      if (task.assignees.length > 0) {
        console.log(
          `  ${chalk.gray('Assignees:')}  ${task.assignees.map((a) => a.name).join(', ')}`
        );
      }

      if (task.githubBranch) {
        console.log(`  ${chalk.gray('Branch:')}     ${chalk.green(task.githubBranch)}`);
      }

      if (task.pullRequests.length > 0) {
        console.log(
          `  ${chalk.gray('PRs:')}        ${task.pullRequests.map((pr) => `#${pr.prNumber} (${pr.state})`).join(', ')}`
        );
      }

      if (task.description) {
        console.log('');
        console.log(chalk.gray('Description:'));
        console.log(`  ${task.description}`);
      }

      console.log('');
    } catch (error) {
      spinner.fail(`Task not found: ${reference}`);
      if (error instanceof ApiError) {
        console.log(chalk.red(`\nError: ${error.message}`));
      }
    }
  },

  async start(reference: string, options: StartOptions) {
    requireAuth();

    const spinner = ora(`Starting task ${reference}...`).start();

    try {
      // Get task details
      const task = await api.getTask(reference.toUpperCase());

      // Create branch via GitHub integration
      spinner.text = 'Creating branch...';
      const branchResult = await api.createBranch(task.id, options.branch);

      // Checkout the branch locally
      spinner.text = 'Checking out branch...';
      try {
        if (branchResult.created) {
          // Fetch and checkout new branch
          execSync(`git fetch origin ${branchResult.branchName}`, { stdio: 'pipe' });
        }
        execSync(`git checkout ${branchResult.branchName}`, { stdio: 'pipe' });
      } catch {
        // Branch might already exist locally
        try {
          execSync(`git checkout -b ${branchResult.branchName}`, { stdio: 'pipe' });
        } catch {
          // Ignore if branch already exists
        }
      }

      // Assign task to current user
      const userId = config.get('userId');
      if (userId) {
        spinner.text = 'Assigning task...';
        await api.assignTask(task.id, userId);
      }

      spinner.succeed(chalk.green(`Started working on ${chalk.bold(reference)}`));
      console.log(`  Branch: ${chalk.cyan(branchResult.branchName)}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to start task');
      if (error instanceof ApiError) {
        console.log(chalk.red(`\nError: ${error.message}`));
      } else {
        console.log(
          chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`)
        );
      }
    }
  },

  async done(reference: string) {
    requireAuth();

    const spinner = ora(`Marking ${reference} as done...`).start();

    try {
      // Get task details
      const task = await api.getTask(reference.toUpperCase());

      // Find the "Done" column in the project
      const project = await api.getProject(task.projectSlug);
      const doneColumn = project.columns.find(
        (c) => c.name.toLowerCase() === 'done' || c.name.toLowerCase() === 'completed'
      );

      if (!doneColumn) {
        spinner.fail('Could not find "Done" column in project');
        return;
      }

      // Move task to done column
      await api.updateTask(task.id, { columnId: doneColumn.id });

      spinner.succeed(chalk.green(`Marked ${chalk.bold(reference)} as done`));
    } catch (error) {
      spinner.fail('Failed to mark task as done');
      if (error instanceof ApiError) {
        console.log(chalk.red(`\nError: ${error.message}`));
      }
    }
  },

  async create(options: CreateOptions) {
    requireAuth();

    // Get project
    const projectSlug = options.project || config.get('defaultProject');
    if (!projectSlug) {
      console.log(
        chalk.red('Project required. Use --project or set default with: kanbu set-project <slug>')
      );
      return;
    }

    if (!options.title) {
      console.log(chalk.red('Title required. Use --title "Your task title"'));
      return;
    }

    const spinner = ora('Creating task...').start();

    try {
      const project = await api.getProject(projectSlug);

      const result = await api.createTask({
        projectId: project.id,
        title: options.title,
        description: options.description,
        priority: options.priority,
      });

      spinner.succeed(
        chalk.green(`Created task ${chalk.bold.cyan(result.reference)}: ${result.title}`)
      );
    } catch (error) {
      spinner.fail('Failed to create task');
      if (error instanceof ApiError) {
        console.log(chalk.red(`\nError: ${error.message}`));
      }
    }
  },
};

export default taskCommands;
