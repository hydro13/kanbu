/*
 * Auth Commands
 * Version: 1.0.0
 *
 * Authentication commands for Kanbu CLI.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14 - Developer Experience
 * =============================================================================
 */

import chalk from 'chalk'
import ora from 'ora'
import { config } from '../config.js'
import { api, ApiError } from '../api.js'

interface LoginOptions {
  token?: string
  url?: string
}

export const authCommands = {
  async login(options: LoginOptions) {
    const spinner = ora('Authenticating...').start()

    try {
      // Get token from option or prompt
      let token = options.token || process.env.KANBU_API_TOKEN

      if (!token) {
        spinner.stop()
        console.log(chalk.yellow('No token provided.'))
        console.log('')
        console.log('To get an API token:')
        console.log('  1. Go to your Kanbu profile settings')
        console.log('  2. Navigate to "API Tokens"')
        console.log('  3. Create a new token')
        console.log('')
        console.log('Then run:')
        console.log(chalk.cyan('  kanbu login --token YOUR_TOKEN'))
        console.log('')
        console.log('Or set the environment variable:')
        console.log(chalk.cyan('  export KANBU_API_TOKEN=YOUR_TOKEN'))
        return
      }

      // Set URL if provided
      if (options.url) {
        config.set('apiUrl', options.url)
      }

      // Store token temporarily to test
      config.set('token', token)

      // Verify token by fetching user info
      const user = await api.whoami()

      // Store user info
      config.set('userId', user.id)
      config.set('userName', user.name || user.username)

      spinner.succeed(chalk.green(`Logged in as ${user.name || user.username} (${user.email})`))
    } catch (error) {
      spinner.fail('Authentication failed')

      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          console.log(chalk.red('\nInvalid API token.'))
          config.delete('token')
        } else {
          console.log(chalk.red(`\nAPI Error: ${error.message}`))
        }
      } else {
        console.log(chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`))
      }
    }
  },

  async logout() {
    config.delete('token')
    config.delete('userId')
    config.delete('userName')
    console.log(chalk.green('Logged out successfully.'))
  },

  async whoami() {
    if (!config.isAuthenticated()) {
      console.log(chalk.yellow('Not logged in. Run: kanbu login'))
      return
    }

    const spinner = ora('Fetching user info...').start()

    try {
      const user = await api.whoami()
      spinner.stop()

      console.log('')
      console.log(chalk.bold('Current User:'))
      console.log(`  Name:     ${chalk.cyan(user.name || 'Not set')}`)
      console.log(`  Username: ${chalk.cyan(user.username)}`)
      console.log(`  Email:    ${chalk.cyan(user.email)}`)
      console.log(`  ID:       ${chalk.gray(user.id)}`)
      console.log('')
    } catch (error) {
      spinner.fail('Failed to fetch user info')

      if (error instanceof ApiError) {
        console.log(chalk.red(`\nError: ${error.message}`))
      }
    }
  },
}

export default authCommands
