/*
 * Git Hooks Utilities
 * Version: 1.0.0
 *
 * Shared utilities for Kanbu git hooks.
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
import { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync } from 'fs'
import { join, dirname } from 'path'
import Conf from 'conf'

// =============================================================================
// Configuration
// =============================================================================

interface HooksConfig {
  apiUrl: string
  apiToken: string
  projectPrefix: string
  branchPattern: string
  enabled: boolean
}

const config = new Conf<HooksConfig>({
  projectName: 'kanbu-hooks',
  defaults: {
    apiUrl: process.env.KANBU_API_URL || 'http://localhost:3001',
    apiToken: process.env.KANBU_API_TOKEN || '',
    projectPrefix: '',
    branchPattern: '(?:feature|fix|bugfix|hotfix)/([A-Z]+-\\d+)',
    enabled: true,
  },
})

export function getConfig(): HooksConfig {
  return {
    apiUrl: process.env.KANBU_API_URL || config.get('apiUrl'),
    apiToken: process.env.KANBU_API_TOKEN || config.get('apiToken'),
    projectPrefix: config.get('projectPrefix'),
    branchPattern: config.get('branchPattern'),
    enabled: config.get('enabled'),
  }
}

export function setConfig(key: keyof HooksConfig, value: string | boolean): void {
  config.set(key, value)
}

export function isConfigured(): boolean {
  const cfg = getConfig()
  return !!cfg.apiToken && !!cfg.apiUrl
}

// =============================================================================
// Git Utilities
// =============================================================================

/**
 * Get the root directory of the current git repository
 */
export function getGitRoot(): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

/**
 * Get the .git/hooks directory path
 */
export function getHooksDir(): string | null {
  const gitRoot = getGitRoot()
  if (!gitRoot) return null
  return join(gitRoot, '.git', 'hooks')
}

/**
 * Extract task reference from branch name
 * Supports patterns like:
 * - feature/PROJ-123-description
 * - fix/PROJ-456
 * - bugfix/ABC-789-some-feature
 */
export function extractTaskFromBranch(branch: string): string | null {
  const cfg = getConfig()

  // Try configured pattern first
  try {
    const regex = new RegExp(cfg.branchPattern, 'i')
    const match = branch.match(regex)
    if (match?.[1]) {
      return match[1].toUpperCase()
    }
  } catch {
    // Invalid regex, fall through to default
  }

  // Default pattern: any PROJ-123 style reference
  const defaultMatch = branch.match(/([A-Z]+-\d+)/i)
  if (defaultMatch?.[1]) {
    return defaultMatch[1].toUpperCase()
  }

  return null
}

/**
 * Extract task reference from commit message
 */
export function extractTaskFromMessage(message: string): string | null {
  // Look for [PROJ-123] or PROJ-123 patterns
  const match = message.match(/\[?([A-Z]+-\d+)\]?/i)
  if (match?.[1]) {
    return match[1].toUpperCase()
  }
  return null
}

/**
 * Check if commit message already contains a task reference
 */
export function hasTaskReference(message: string): boolean {
  return /\[?[A-Z]+-\d+\]?/i.test(message)
}

/**
 * Add task reference to commit message
 */
export function addTaskToMessage(message: string, taskRef: string): string {
  // Don't add if already present
  if (hasTaskReference(message)) {
    return message
  }

  // Add at the end of the first line
  const lines = message.split('\n')
  lines[0] = `${lines[0]} [${taskRef}]`
  return lines.join('\n')
}

// =============================================================================
// Hook File Management
// =============================================================================

const HOOK_HEADER = '#!/bin/sh\n# Kanbu Git Hook - Do not edit manually\n'
const HOOK_MARKER = '# KANBU_HOOK_MARKER'

/**
 * Check if a hook file is managed by Kanbu
 */
export function isKanbuHook(hookPath: string): boolean {
  if (!existsSync(hookPath)) return false
  const content = readFileSync(hookPath, 'utf-8')
  return content.includes(HOOK_MARKER)
}

/**
 * Get the path to the installed hook script
 */
export function getHookScriptPath(hookName: string): string {
  // In production, hooks are in the package's dist directory
  // We use npx to run them
  return `npx kanbu-hooks run ${hookName}`
}

/**
 * Generate hook file content
 */
export function generateHookContent(hookName: string): string {
  return `${HOOK_HEADER}${HOOK_MARKER}

# Run Kanbu hook
exec npx @kanbu/git-hooks run ${hookName} "$@"
`
}

/**
 * Install a hook
 */
export function installHook(hookName: string): boolean {
  const hooksDir = getHooksDir()
  if (!hooksDir) {
    console.error('Not in a git repository')
    return false
  }

  const hookPath = join(hooksDir, hookName)
  const backupPath = `${hookPath}.backup`

  // Backup existing hook if not already a Kanbu hook
  if (existsSync(hookPath) && !isKanbuHook(hookPath)) {
    const existing = readFileSync(hookPath, 'utf-8')
    writeFileSync(backupPath, existing)
    console.log(`Backed up existing ${hookName} to ${hookName}.backup`)
  }

  // Write new hook
  const content = generateHookContent(hookName)
  writeFileSync(hookPath, content, { mode: 0o755 })

  return true
}

/**
 * Uninstall a hook
 */
export function uninstallHook(hookName: string): boolean {
  const hooksDir = getHooksDir()
  if (!hooksDir) {
    console.error('Not in a git repository')
    return false
  }

  const hookPath = join(hooksDir, hookName)
  const backupPath = `${hookPath}.backup`

  if (!existsSync(hookPath)) {
    return true // Already uninstalled
  }

  if (!isKanbuHook(hookPath)) {
    console.error(`${hookName} is not a Kanbu hook, skipping`)
    return false
  }

  // Remove Kanbu hook
  unlinkSync(hookPath)

  // Restore backup if exists
  if (existsSync(backupPath)) {
    renameSync(backupPath, hookPath)
    console.log(`Restored ${hookName} from backup`)
  }

  return true
}

// =============================================================================
// API Utilities
// =============================================================================

export interface TaskInfo {
  id: number
  reference: string
  title: string
  status: string
  columnId: number
}

/**
 * Fetch task info from Kanbu API
 */
export async function fetchTask(taskRef: string): Promise<TaskInfo | null> {
  const cfg = getConfig()
  if (!cfg.apiToken) {
    return null
  }

  try {
    const response = await fetch(`${cfg.apiUrl}/trpc/github.getTaskByReference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiToken}`,
      },
      body: JSON.stringify({
        json: { reference: taskRef },
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json() as {
      result?: { data?: { json?: TaskInfo } }
    }

    return data.result?.data?.json || null
  } catch {
    return null
  }
}

/**
 * Link commit to task in Kanbu
 */
export async function linkCommitToTask(
  taskRef: string,
  commitSha: string,
  commitMessage: string
): Promise<boolean> {
  const cfg = getConfig()
  if (!cfg.apiToken) {
    return false
  }

  try {
    const response = await fetch(`${cfg.apiUrl}/trpc/github.linkCommitToTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiToken}`,
      },
      body: JSON.stringify({
        json: {
          reference: taskRef,
          sha: commitSha,
          message: commitMessage,
        },
      }),
    })

    return response.ok
  } catch {
    return false
  }
}
