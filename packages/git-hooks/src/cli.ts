#!/usr/bin/env node
/*
 * Kanbu Git Hooks CLI
 * Version: 1.0.0
 *
 * CLI for installing and managing Kanbu git hooks.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14B - Developer Experience (Git Hooks)
 * =============================================================================
 */

import { Command } from 'commander'
import chalk from 'chalk'
import {
  getConfig,
  setConfig,
  getGitRoot,
  installHook,
  uninstallHook,
  isKanbuHook,
  getHooksDir,
} from './utils.js'
import { existsSync } from 'fs'
import { join } from 'path'

const HOOKS = ['prepare-commit-msg', 'commit-msg', 'post-commit'] as const

const program = new Command()

program
  .name('kanbu-hooks')
  .description('Git hooks for Kanbu task management integration')
  .version('1.0.0')

// =============================================================================
// Install Command
// =============================================================================

program
  .command('install')
  .description('Install Kanbu git hooks in the current repository')
  .option('--prepare-commit-msg', 'Install only prepare-commit-msg hook')
  .option('--commit-msg', 'Install only commit-msg hook')
  .option('--post-commit', 'Install only post-commit hook')
  .action((options) => {
    const gitRoot = getGitRoot()
    if (!gitRoot) {
      console.error(chalk.red('Error: Not in a git repository'))
      process.exit(1)
    }

    console.log(chalk.blue('Installing Kanbu git hooks...'))
    console.log()

    // Determine which hooks to install
    const hooksToInstall: string[] = []
    if (options.prepareCommitMsg) hooksToInstall.push('prepare-commit-msg')
    if (options.commitMsg) hooksToInstall.push('commit-msg')
    if (options.postCommit) hooksToInstall.push('post-commit')

    // If no specific hooks specified, install all
    if (hooksToInstall.length === 0) {
      hooksToInstall.push(...HOOKS)
    }

    let success = true
    for (const hook of hooksToInstall) {
      if (installHook(hook)) {
        console.log(chalk.green(`  ✓ ${hook}`))
      } else {
        console.log(chalk.red(`  ✗ ${hook}`))
        success = false
      }
    }

    console.log()
    if (success) {
      console.log(chalk.green('Hooks installed successfully!'))
      console.log()
      console.log(chalk.dim('Configuration:'))
      console.log(chalk.dim('  kanbu-hooks config --api-url <url>'))
      console.log(chalk.dim('  kanbu-hooks config --api-token <token>'))
    } else {
      console.log(chalk.yellow('Some hooks failed to install'))
      process.exit(1)
    }
  })

// =============================================================================
// Uninstall Command
// =============================================================================

program
  .command('uninstall')
  .description('Remove Kanbu git hooks from the current repository')
  .action(() => {
    const gitRoot = getGitRoot()
    if (!gitRoot) {
      console.error(chalk.red('Error: Not in a git repository'))
      process.exit(1)
    }

    console.log(chalk.blue('Removing Kanbu git hooks...'))
    console.log()

    let success = true
    for (const hook of HOOKS) {
      if (uninstallHook(hook)) {
        console.log(chalk.green(`  ✓ ${hook} removed`))
      } else {
        console.log(chalk.red(`  ✗ ${hook}`))
        success = false
      }
    }

    console.log()
    if (success) {
      console.log(chalk.green('Hooks removed successfully!'))
    } else {
      console.log(chalk.yellow('Some hooks failed to remove'))
      process.exit(1)
    }
  })

// =============================================================================
// Status Command
// =============================================================================

program
  .command('status')
  .description('Show status of installed hooks')
  .action(() => {
    const gitRoot = getGitRoot()
    if (!gitRoot) {
      console.error(chalk.red('Error: Not in a git repository'))
      process.exit(1)
    }

    const hooksDir = getHooksDir()
    if (!hooksDir) {
      console.error(chalk.red('Error: Could not find hooks directory'))
      process.exit(1)
    }

    console.log(chalk.blue('Kanbu Git Hooks Status'))
    console.log(chalk.dim(`Repository: ${gitRoot}`))
    console.log()

    for (const hook of HOOKS) {
      const hookPath = join(hooksDir, hook)
      if (!existsSync(hookPath)) {
        console.log(chalk.dim(`  ○ ${hook} - not installed`))
      } else if (isKanbuHook(hookPath)) {
        console.log(chalk.green(`  ● ${hook} - installed`))
      } else {
        console.log(chalk.yellow(`  ◐ ${hook} - custom (not Kanbu)`))
      }
    }

    console.log()
    const cfg = getConfig()
    console.log(chalk.dim('Configuration:'))
    console.log(chalk.dim(`  API URL: ${cfg.apiUrl}`))
    console.log(chalk.dim(`  API Token: ${cfg.apiToken ? '****' + cfg.apiToken.slice(-4) : 'not set'}`))
    console.log(chalk.dim(`  Enabled: ${cfg.enabled}`))
  })

// =============================================================================
// Config Command
// =============================================================================

program
  .command('config')
  .description('Configure Kanbu git hooks')
  .option('--api-url <url>', 'Set Kanbu API URL')
  .option('--api-token <token>', 'Set Kanbu API token')
  .option('--branch-pattern <pattern>', 'Set branch name pattern for task extraction')
  .option('--enable', 'Enable hooks')
  .option('--disable', 'Disable hooks')
  .option('--show', 'Show current configuration')
  .action((options) => {
    if (options.show || Object.keys(options).length === 0) {
      const cfg = getConfig()
      console.log(chalk.blue('Current Configuration:'))
      console.log()
      console.log(`  API URL:        ${cfg.apiUrl}`)
      console.log(`  API Token:      ${cfg.apiToken ? '****' + cfg.apiToken.slice(-4) : chalk.dim('not set')}`)
      console.log(`  Branch Pattern: ${cfg.branchPattern}`)
      console.log(`  Enabled:        ${cfg.enabled ? chalk.green('yes') : chalk.red('no')}`)
      return
    }

    if (options.apiUrl) {
      setConfig('apiUrl', options.apiUrl)
      console.log(chalk.green(`API URL set to: ${options.apiUrl}`))
    }

    if (options.apiToken) {
      setConfig('apiToken', options.apiToken)
      console.log(chalk.green('API token saved'))
    }

    if (options.branchPattern) {
      setConfig('branchPattern', options.branchPattern)
      console.log(chalk.green(`Branch pattern set to: ${options.branchPattern}`))
    }

    if (options.enable) {
      setConfig('enabled', true)
      console.log(chalk.green('Hooks enabled'))
    }

    if (options.disable) {
      setConfig('enabled', false)
      console.log(chalk.yellow('Hooks disabled'))
    }
  })

// =============================================================================
// Run Command (internal - called by hook scripts)
// =============================================================================

program
  .command('run <hook>')
  .description('Run a specific hook (internal use)')
  .allowUnknownOption()
  .action(async (hook: string, _options, command) => {
    // Get all arguments after the hook name
    const args = command.args.slice(1)

    try {
      let exitCode = 0

      switch (hook) {
        case 'prepare-commit-msg': {
          const { run } = await import('./hooks/prepare-commit-msg.js')
          exitCode = await run(args)
          break
        }
        case 'commit-msg': {
          const { run } = await import('./hooks/commit-msg.js')
          exitCode = await run(args)
          break
        }
        case 'post-commit': {
          const { run } = await import('./hooks/post-commit.js')
          exitCode = await run(args)
          break
        }
        default:
          console.error(`Unknown hook: ${hook}`)
          process.exit(1)
      }

      process.exit(exitCode)
    } catch (error) {
      console.error(`Hook ${hook} failed:`, error)
      process.exit(1)
    }
  })

// =============================================================================
// Parse and Execute
// =============================================================================

program.parse()
