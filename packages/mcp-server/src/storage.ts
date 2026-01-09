/*
 * Token Storage
 * Version: 1.0.0
 *
 * Local storage for Kanbu MCP credentials.
 * Stores token in ~/.config/kanbu/mcp.json
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * ═══════════════════════════════════════════════════════════════════
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// =============================================================================
// Types
// =============================================================================

export interface TokenConfig {
  kanbuUrl: string
  token: string
  machineId: string
  userId: number
  userName: string
  userEmail: string
  connectedAt: string
}

// =============================================================================
// Constants
// =============================================================================

const CONFIG_DIR = join(homedir(), '.config', 'kanbu')
const TOKEN_FILE = join(CONFIG_DIR, 'mcp.json')

// =============================================================================
// Token Storage Class
// =============================================================================

export class TokenStorage {
  /**
   * Check if a token is stored
   */
  hasToken(): boolean {
    return existsSync(TOKEN_FILE)
  }

  /**
   * Load stored token configuration
   */
  loadToken(): TokenConfig | null {
    try {
      if (!existsSync(TOKEN_FILE)) {
        return null
      }
      const content = readFileSync(TOKEN_FILE, 'utf-8')
      return JSON.parse(content) as TokenConfig
    } catch {
      return null
    }
  }

  /**
   * Save token configuration to local storage
   * Sets restrictive permissions (0600) to protect the token
   */
  saveToken(config: TokenConfig): void {
    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
    }

    // Write token file
    writeFileSync(TOKEN_FILE, JSON.stringify(config, null, 2), { mode: 0o600 })

    // Ensure correct permissions (in case file already existed)
    try {
      chmodSync(TOKEN_FILE, 0o600)
    } catch {
      // Ignore permission errors on Windows
    }
  }

  /**
   * Remove stored token
   */
  removeToken(): void {
    try {
      if (existsSync(TOKEN_FILE)) {
        unlinkSync(TOKEN_FILE)
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get the Kanbu URL from stored config or environment
   */
  getKanbuUrl(): string | null {
    const config = this.loadToken()
    if (config?.kanbuUrl) {
      return config.kanbuUrl
    }
    return process.env.KANBU_URL || null
  }
}
