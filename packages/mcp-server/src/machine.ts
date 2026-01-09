/*
 * Machine Identification
 * Version: 1.0.0
 *
 * Generates unique, stable identifiers for the current machine.
 * Used to bind tokens to specific machines.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * ═══════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto'
import { hostname, userInfo, platform, arch } from 'os'

// =============================================================================
// Machine Identification
// =============================================================================

/**
 * Generate a stable machine ID based on hostname and user
 * This creates a unique identifier that won't change unless the hostname or username changes.
 */
export function getMachineId(): string {
  const host = hostname()
  const user = userInfo().username
  const combined = `${user}@${host}:kanbu-mcp`

  // Hash to get a fixed-length, privacy-preserving identifier
  return createHash('sha256').update(combined).digest('hex').substring(0, 64)
}

/**
 * Get a human-readable machine name
 * Format: "HOSTNAME (Platform)" e.g., "MAX (Linux)" or "MacBook-Pro (Darwin)"
 */
export function getMachineName(): string {
  const host = hostname()
  const os = platform()

  // Capitalize first letter of platform
  const osName = os === 'darwin' ? 'macOS' : os.charAt(0).toUpperCase() + os.slice(1)

  return `${host} (${osName})`
}

/**
 * Get detailed machine info for debugging
 */
export function getMachineInfo(): {
  id: string
  name: string
  hostname: string
  username: string
  platform: string
  arch: string
} {
  return {
    id: getMachineId(),
    name: getMachineName(),
    hostname: hostname(),
    username: userInfo().username,
    platform: platform(),
    arch: arch(),
  }
}
