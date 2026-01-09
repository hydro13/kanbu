/*
 * Tool Helpers
 * Version: 1.0.0
 *
 * Shared helpers and utilities for MCP tools.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 2 - Core Kanbu Tools
 * ═══════════════════════════════════════════════════════════════════
 */

import { TokenStorage, TokenConfig } from './storage.js'
import { KanbuClient } from './client.js'

// =============================================================================
// Shared Instances
// =============================================================================

export const storage = new TokenStorage()
export const client = new KanbuClient()

// =============================================================================
// Auth Helper
// =============================================================================

/**
 * Require authentication - returns token config or throws
 */
export function requireAuth(): TokenConfig {
  const config = storage.loadToken()
  if (!config) {
    throw new Error(
      'Not connected to Kanbu. Use kanbu_connect first with a setup code from your profile page.'
    )
  }
  return config
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Format a date for display
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return formatDate(date)
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create a successful MCP tool response
 */
export function success(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  }
}

/**
 * Create an error MCP tool response
 */
export function error(message: string) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  }
}

// =============================================================================
// API Types (from Kanbu tRPC)
// =============================================================================

export interface Workspace {
  id: number
  name: string
  slug: string
  description: string | null
  createdAt: string
  _count?: {
    projects: number
    members: number
  }
  role?: string
}

export interface Project {
  id: number
  name: string
  slug: string
  description: string | null
  workspaceId: number
  prefix: string
  createdAt: string
  archivedAt: string | null
  workspace?: {
    id: number
    name: string
    slug: string
  }
  _count?: {
    tasks: number
    members: number
  }
}

export interface Column {
  id: number
  title: string  // Note: API returns 'title', not 'name'
  name?: string  // Alias for backwards compatibility
  position: number
  color: string | null
  projectId: number
}

export interface Task {
  id: number
  ref: string
  title: string
  description: string | null
  priority: string
  status: string
  position: number
  columnId: number
  projectId: number
  createdAt: string
  updatedAt: string
  dueDate: string | null
  closedAt: string | null
  column?: Column
  project?: {
    id: number
    name: string
    prefix: string
    workspace?: {
      id: number
      name: string
    }
  }
  assignees?: Array<{
    id: number
    name: string
    email: string
  }>
  tags?: Array<{
    id: number
    name: string
    color: string
  }>
  _count?: {
    subtasks: number
    comments: number
  }
}
