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

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface TokenConfig {
  kanbuUrl: string;
  token: string;
  machineId: string;
  userId: number;
  userName: string;
  userEmail: string;
  connectedAt: string;
}

// =============================================================================
// Constants
// =============================================================================

const CONFIG_DIR = join(homedir(), '.config', 'kanbu');

/**
 * Generate a short hash of the KANBU_URL for unique credential files per server
 */
function getUrlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 8);
}

/**
 * Get the token file path for a specific KANBU_URL
 * Each server gets its own credential file: mcp-{hash}.json
 */
function getTokenFilePath(): string {
  const kanbuUrl = process.env.KANBU_URL || 'https://localhost:3001';
  const hash = getUrlHash(kanbuUrl);
  return join(CONFIG_DIR, `mcp-${hash}.json`);
}

// =============================================================================
// Token Storage Class
// =============================================================================

export class TokenStorage {
  /**
   * Check if a token is stored
   */
  hasToken(): boolean {
    const tokenFile = getTokenFilePath();
    return existsSync(tokenFile);
  }

  /**
   * Load stored token configuration
   */
  loadToken(): TokenConfig | null {
    try {
      const tokenFile = getTokenFilePath();
      if (!existsSync(tokenFile)) {
        return null;
      }
      const content = readFileSync(tokenFile, 'utf-8');
      return JSON.parse(content) as TokenConfig;
    } catch {
      return null;
    }
  }

  /**
   * Save token configuration to local storage
   * Sets restrictive permissions (0600) to protect the token
   */
  saveToken(config: TokenConfig): void {
    const tokenFile = getTokenFilePath();

    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }

    // Write token file
    writeFileSync(tokenFile, JSON.stringify(config, null, 2), { mode: 0o600 });

    // Ensure correct permissions (in case file already existed)
    try {
      chmodSync(tokenFile, 0o600);
    } catch {
      // Ignore permission errors on Windows
    }
  }

  /**
   * Remove stored token
   */
  removeToken(): void {
    try {
      const tokenFile = getTokenFilePath();
      if (existsSync(tokenFile)) {
        unlinkSync(tokenFile);
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get the Kanbu URL from stored config or environment
   */
  getKanbuUrl(): string | null {
    const config = this.loadToken();
    if (config?.kanbuUrl) {
      return config.kanbuUrl;
    }
    return process.env.KANBU_URL || null;
  }
}
