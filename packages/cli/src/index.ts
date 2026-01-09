#!/usr/bin/env node
/*
 * Kanbu CLI
 * Version: 1.0.0
 *
 * Command-line interface for Kanbu task management.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14 - Developer Experience
 * =============================================================================
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { config } from './config.js'
import { taskCommands } from './commands/task.js'
import { prCommands } from './commands/pr.js'
import { authCommands } from './commands/auth.js'

const program = new Command()

program
  .name('kanbu')
  .description('Kanbu CLI - Task management from your terminal')
  .version('1.0.0')

// Authentication commands
program
  .command('login')
  .description('Login to Kanbu')
  .option('-t, --token <token>', 'API token (or set KANBU_API_TOKEN env)')
  .option('-u, --url <url>', 'Kanbu API URL (default: https://api.kanbu.app)')
  .action(authCommands.login)

program
  .command('logout')
  .description('Logout from Kanbu')
  .action(authCommands.logout)

program
  .command('whoami')
  .description('Show current user')
  .action(authCommands.whoami)

// Task commands
const taskCmd = program
  .command('task')
  .description('Task management commands')

taskCmd
  .command('list')
  .alias('ls')
  .description('List tasks')
  .option('-p, --project <slug>', 'Project slug or ID')
  .option('-s, --status <status>', 'Filter by status (open, closed, all)', 'open')
  .option('-a, --assigned', 'Show only tasks assigned to me')
  .option('-l, --limit <n>', 'Limit results', '20')
  .action(taskCommands.list)

taskCmd
  .command('show <reference>')
  .description('Show task details')
  .action(taskCommands.show)

taskCmd
  .command('start <reference>')
  .description('Start working on a task (creates branch, assigns to you)')
  .option('-b, --branch <name>', 'Custom branch name')
  .action(taskCommands.start)

taskCmd
  .command('done <reference>')
  .description('Mark task as done')
  .action(taskCommands.done)

taskCmd
  .command('create')
  .description('Create a new task')
  .option('-p, --project <slug>', 'Project slug or ID')
  .option('-t, --title <title>', 'Task title')
  .option('-d, --description <desc>', 'Task description')
  .option('--priority <priority>', 'Priority (LOW, MEDIUM, HIGH, URGENT)', 'MEDIUM')
  .action(taskCommands.create)

// PR commands
const prCmd = program
  .command('pr')
  .description('Pull request commands')

prCmd
  .command('create')
  .description('Create a PR for current branch')
  .option('-t, --title <title>', 'PR title (default: from task)')
  .option('-d, --draft', 'Create as draft PR')
  .option('-b, --base <branch>', 'Base branch (default: main)')
  .action(prCommands.create)

prCmd
  .command('status')
  .description('Show PR status for current branch')
  .action(prCommands.status)

prCmd
  .command('link <task>')
  .description('Link current PR to a task')
  .action(prCommands.link)

// Config commands
program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    const cfg = config.getAll()
    console.log(chalk.bold('\nKanbu CLI Configuration:\n'))
    console.log(`  API URL:  ${chalk.cyan(cfg.apiUrl || 'not set')}`)
    console.log(`  Token:    ${cfg.token ? chalk.green('configured') : chalk.yellow('not set')}`)
    console.log(`  Project:  ${chalk.cyan(cfg.defaultProject || 'not set')}`)
    console.log()
  })

program
  .command('set-project <slug>')
  .description('Set default project for commands')
  .action((slug: string) => {
    config.set('defaultProject', slug)
    console.log(chalk.green(`Default project set to: ${slug}`))
  })

// Error handling
program.exitOverride()

try {
  await program.parseAsync(process.argv)
} catch (err) {
  if (err instanceof Error && err.message.includes('commander')) {
    // Commander errors are already printed
  } else {
    console.error(chalk.red('Error:'), err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
