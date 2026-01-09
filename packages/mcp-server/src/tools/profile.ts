/*
 * Profile Management Tools
 * Version: 1.0.0
 *
 * MCP tools for user profile management.
 * Self-service tools for the authenticated user's own profile.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 12 - Profile Management
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { requireAuth, client, success, error } from '../tools.js'

// =============================================================================
// Types
// =============================================================================

interface ProfileResponse {
  id: number
  email: string
  username: string
  name: string | null
  avatarUrl: string | null
  timezone: string | null
  language: string | null
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  isActive: boolean
  twofactorActivated: boolean
  failedLoginCount: number
  lockedUntil: string | null
  googleId: string | null
  githubId: string | null
  gitlabId: number | null
  theme: string | null
  defaultFilter: string | null
  publicToken: string | null
  hourlyRate: number | null
  notificationsEnabled: boolean
  notificationFilter: number | null
  workspaceCount: number
  workspaces: Array<{
    id: number
    name: string
    slug: string
    logoUrl: string | null
    role: string
  }>
  recentProjects: Array<{
    id: number
    name: string
    identifier: string
    workspace: { id: number; name: string }
  }>
}

interface TimeTrackingResponse {
  totalEstimated: number
  totalSpent: number
  byProject: Array<{
    projectId: number
    projectName: string
    timeEstimated: number
    timeSpent: number
  }>
  recentEntries: Array<{
    type: 'task' | 'subtask'
    id: number
    title: string
    taskId: number
    taskTitle: string
    projectId: number
    projectName: string
    timeEstimated: number
    timeSpent: number
    updatedAt: string
    isActive: boolean
  }>
}

interface LoginEntry {
  id: number
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface SessionEntry {
  id: string
  ipAddress: string | null
  userAgent: string | null
  expiresAt: string
  createdAt: string
}

interface PasswordResetEntry {
  id: number
  ip: string | null
  userAgent: string | null
  isUsed: boolean
  expiresAt: string
  createdAt: string
}

interface MetadataEntry {
  id: number
  key: string
  value: string
}

interface TwoFASetupResponse {
  secret: string
  qrCodeUri: string
}

interface TwoFAVerifyResponse {
  success: boolean
  backupCodes: string[]
}

interface PublicAccessResponse {
  enabled: boolean
  token: string | null
}

interface ConnectedAccountsResponse {
  google: { connected: boolean; id: string | null }
  github: { connected: boolean; id: string | null }
  gitlab: { connected: boolean; id: string | null }
}

interface NotificationSettingsResponse {
  enabled: boolean
  filter: number
  filterLabel: string
  types: Array<{
    type: string
    enabled: boolean
  }>
}

interface ApiKeyEntry {
  id: number
  name: string
  keyPrefix: string
  permissions: string[]
  rateLimit: number
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  scope: string
  workspaceId: number | null
  projectId: number | null
  isServiceAccount: boolean
  serviceAccountName: string | null
  workspace: { id: number; name: string; slug: string } | null
  project: { id: number; name: string; identifier: string } | null
  isExpired: boolean
}

interface ApiKeyCreateResponse {
  id: number
  name: string
  keyPrefix: string
  key: string
  permissions: string[]
  rateLimit: number
  expiresAt: string | null
  scope: string
  workspaceId: number | null
  projectId: number | null
  isServiceAccount: boolean
  serviceAccountName: string | null
}

interface AiBindingEntry {
  id: number
  machineId: string
  machineName: string | null
  createdAt: string
  lastUsedAt: string | null
}

// =============================================================================
// Schemas
// =============================================================================

export const UpdateProfileSchema = z.object({
  name: z.string().optional().describe('Display name'),
  timezone: z.string().optional().describe('Timezone (e.g., Europe/Amsterdam)'),
  language: z.string().optional().describe('Language code (e.g., en, nl)'),
  theme: z.enum(['light', 'dark', 'system']).optional().describe('UI theme'),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().describe('Current password'),
  newPassword: z.string().describe('New password (min 8 chars)'),
})

export const TimeTrackingQuerySchema = z.object({
  dateFrom: z.string().optional().describe('Start date (ISO format)'),
  dateTo: z.string().optional().describe('End date (ISO format)'),
  limit: z.number().optional().describe('Max results (default 50)'),
})

export const PaginationSchema = z.object({
  limit: z.number().optional().describe('Max results (default 50)'),
  offset: z.number().optional().describe('Pagination offset'),
})

export const Disable2FASchema = z.object({
  password: z.string().describe('Your password to confirm'),
})

export const Verify2FASchema = z.object({
  token: z.string().describe('6-digit TOTP code'),
})

export const UnlinkAccountSchema = z.object({
  provider: z.enum(['google', 'github', 'gitlab']).describe('OAuth provider to unlink'),
})

export const UpdateNotificationsSchema = z.object({
  enabled: z.boolean().optional().describe('Enable/disable notifications'),
  filter: z.number().optional().describe('Filter: 1=all, 2=assigned, 3=created, 4=both'),
})

export const UpdateNotificationTypeSchema = z.object({
  type: z.enum(['email', 'web', 'push']).describe('Notification type'),
  enabled: z.boolean().describe('Enable/disable this type'),
})

export const HourlyRateSchema = z.object({
  hourlyRate: z.number().nullable().describe('Hourly rate (0-10000, null to clear)'),
})

export const CreateApiTokenSchema = z.object({
  name: z.string().describe('Token name'),
  permissions: z.array(z.string()).optional().describe('Permissions array'),
  rateLimit: z.number().optional().describe('Rate limit (10-10000, default 100)'),
  expiresAt: z.string().optional().describe('Expiration date (ISO format)'),
  scope: z.enum(['USER', 'WORKSPACE', 'PROJECT']).optional().describe('Token scope'),
  workspaceId: z.number().optional().describe('Workspace ID for WORKSPACE/PROJECT scope'),
  projectId: z.number().optional().describe('Project ID for PROJECT scope'),
  isServiceAccount: z.boolean().optional().describe('Is service account'),
  serviceAccountName: z.string().optional().describe('Service account name'),
})

export const RevokeApiTokenSchema = z.object({
  keyId: z.number().describe('API key ID to revoke'),
})

export const RevokeAiBindingSchema = z.object({
  bindingId: z.number().describe('AI binding ID to revoke'),
})

export const SetMetadataSchema = z.object({
  key: z.string().describe('Metadata key'),
  value: z.string().describe('Metadata value'),
})

export const DeleteMetadataSchema = z.object({
  key: z.string().describe('Metadata key to delete'),
})

export const RevokeSessionSchema = z.object({
  sessionId: z.string().describe('Session ID to revoke'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const profileToolDefinitions = [
  // 12.1 Profile Information Tools
  {
    name: 'kanbu_get_profile',
    description: 'Get your full profile summary including workspaces, recent projects, and settings.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_get_time_tracking',
    description: 'Get your time tracking data across all projects.',
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', description: 'Start date (ISO format)' },
        dateTo: { type: 'string', description: 'End date (ISO format)' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_get_logins',
    description: 'Get your login history.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 50)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_get_sessions',
    description: 'Get your active sessions (persistent connections).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_get_password_history',
    description: 'Get your password reset history.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 50)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_get_metadata',
    description: 'Get your user metadata (custom key-value pairs).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // 12.2 Profile Update Tools
  {
    name: 'kanbu_update_profile',
    description: 'Update your profile settings (name, timezone, language, theme).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Display name' },
        timezone: { type: 'string', description: 'Timezone (e.g., Europe/Amsterdam)' },
        language: { type: 'string', description: 'Language code (e.g., en, nl)' },
        theme: { type: 'string', enum: ['light', 'dark', 'system'], description: 'UI theme' },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_remove_avatar',
    description: 'Remove your avatar image.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_change_password',
    description: 'Change your password.',
    inputSchema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string', description: 'Your current password' },
        newPassword: { type: 'string', description: 'New password (min 8 characters)' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  },

  // 12.3 Two Factor Authentication Tools
  {
    name: 'kanbu_get_2fa_status',
    description: 'Get your 2FA status (enabled/disabled).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_setup_2fa',
    description: 'Start 2FA setup. Returns TOTP secret and QR code URI.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_verify_2fa',
    description: 'Verify and activate 2FA with a TOTP code. Returns backup codes.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: '6-digit TOTP code from authenticator app' },
      },
      required: ['token'],
    },
  },
  {
    name: 'kanbu_disable_own_2fa',
    description: 'Disable your own 2FA (requires password confirmation).',
    inputSchema: {
      type: 'object',
      properties: {
        password: { type: 'string', description: 'Your password to confirm' },
      },
      required: ['password'],
    },
  },
  {
    name: 'kanbu_regenerate_backup_codes',
    description: 'Regenerate 2FA backup codes (requires re-verification).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // 12.4 Public Access Tools
  {
    name: 'kanbu_get_public_access',
    description: 'Get your public access status and token.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_enable_public_access',
    description: 'Enable public access and generate a token.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_disable_public_access',
    description: 'Disable public access and remove token.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_regenerate_public_token',
    description: 'Regenerate your public access token.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // 12.5 Notification Tools
  {
    name: 'kanbu_get_notification_settings',
    description: 'Get your notification settings and preferences.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_update_notification_settings',
    description: 'Update your notification settings.',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Enable/disable notifications' },
        filter: { type: 'number', description: 'Filter: 1=all, 2=assigned, 3=created, 4=both' },
      },
      required: [],
    },
  },

  // 12.6 External Accounts Tools
  {
    name: 'kanbu_list_external_accounts',
    description: 'List your connected OAuth accounts (Google, GitHub, GitLab).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_unlink_external_account',
    description: 'Unlink an OAuth provider from your account.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['google', 'github', 'gitlab'], description: 'Provider to unlink' },
      },
      required: ['provider'],
    },
  },

  // 12.7 (Integrations - skipped, complex OAuth flows not suitable for MCP)

  // 12.8 API Tokens Tools
  {
    name: 'kanbu_list_api_tokens',
    description: 'List your API tokens.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_create_api_token',
    description: 'Create a new API token. The full token is only shown once!',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Token name' },
        permissions: { type: 'array', items: { type: 'string' }, description: 'Permissions array' },
        rateLimit: { type: 'number', description: 'Rate limit (10-10000)' },
        expiresAt: { type: 'string', description: 'Expiration date (ISO)' },
        scope: { type: 'string', enum: ['USER', 'WORKSPACE', 'PROJECT'], description: 'Token scope' },
        workspaceId: { type: 'number', description: 'Workspace ID for scoped tokens' },
        projectId: { type: 'number', description: 'Project ID for PROJECT scope' },
        isServiceAccount: { type: 'boolean', description: 'Is service account' },
        serviceAccountName: { type: 'string', description: 'Service account name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'kanbu_revoke_api_token',
    description: 'Revoke (delete) an API token.',
    inputSchema: {
      type: 'object',
      properties: {
        keyId: { type: 'number', description: 'API key ID to revoke' },
      },
      required: ['keyId'],
    },
  },
  {
    name: 'kanbu_get_api_permissions',
    description: 'Get available API permissions for token creation.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // 12.9 AI Assistant Tools
  {
    name: 'kanbu_list_ai_bindings',
    description: 'List your AI assistant (Claude Code) bindings.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_revoke_ai_binding',
    description: 'Revoke an AI assistant binding.',
    inputSchema: {
      type: 'object',
      properties: {
        bindingId: { type: 'number', description: 'Binding ID to revoke' },
      },
      required: ['bindingId'],
    },
  },

  // 12.10 Hourly Rate Tools
  {
    name: 'kanbu_get_hourly_rate',
    description: 'Get your hourly rate for time tracking.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_set_hourly_rate',
    description: 'Set your hourly rate for time tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        hourlyRate: { type: 'number', description: 'Hourly rate (0-10000, null to clear)' },
      },
      required: ['hourlyRate'],
    },
  },

  // Extra: Metadata & Session management
  {
    name: 'kanbu_set_metadata',
    description: 'Set a metadata key-value pair on your profile.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Metadata key' },
        value: { type: 'string', description: 'Metadata value' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'kanbu_delete_metadata',
    description: 'Delete a metadata key from your profile.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Metadata key to delete' },
      },
      required: ['key'],
    },
  },
  {
    name: 'kanbu_revoke_session',
    description: 'Revoke a specific session.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID to revoke' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'kanbu_revoke_all_sessions',
    description: 'Revoke all your sessions.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
]

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: string | null): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  }
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * Get profile
 */
export async function handleGetProfile(_args: unknown) {
  const config = requireAuth()

  try {
    const profile = await client.call<ProfileResponse>(
      config.kanbuUrl,
      config.token,
      'user.getProfile',
      {}
    )

    const lines: string[] = [
      `Profile: ${profile.name ?? profile.username}`,
      '',
      '== Account ==',
      `Email: ${profile.email}${profile.emailVerified ? ' ✓' : ' (unverified)'}`,
      `Username: @${profile.username}`,
      `Status: ${profile.isActive ? 'Active' : 'Inactive'}`,
      `Member since: ${formatDate(profile.createdAt)}`,
      `Last login: ${formatDate(profile.lastLoginAt)}`,
      '',
      '== Settings ==',
      `Theme: ${profile.theme ?? 'system'}`,
      `Timezone: ${profile.timezone ?? 'Not set'}`,
      `Language: ${profile.language ?? 'Not set'}`,
      '',
      '== Security ==',
      `2FA: ${profile.twofactorActivated ? 'Enabled ✓' : 'Disabled'}`,
      `Public Access: ${profile.publicToken ? 'Enabled' : 'Disabled'}`,
      `Failed logins: ${profile.failedLoginCount}`,
      profile.lockedUntil ? `Locked until: ${formatDate(profile.lockedUntil)}` : '',
      '',
      '== Connected Accounts ==',
      `Google: ${profile.googleId ? 'Connected ✓' : 'Not connected'}`,
      `GitHub: ${profile.githubId ? 'Connected ✓' : 'Not connected'}`,
      `GitLab: ${profile.gitlabId ? 'Connected ✓' : 'Not connected'}`,
      '',
      `== Workspaces (${profile.workspaceCount}) ==`,
    ]

    for (const ws of profile.workspaces) {
      lines.push(`  • ${ws.name} (${ws.role})`)
    }

    if (profile.recentProjects.length > 0) {
      lines.push('')
      lines.push('== Recent Projects ==')
      for (const proj of profile.recentProjects) {
        lines.push(`  • ${proj.name} [${proj.identifier}] in ${proj.workspace.name}`)
      }
    }

    if (profile.hourlyRate) {
      lines.push('')
      lines.push(`== Billing ==`)
      lines.push(`Hourly Rate: €${profile.hourlyRate}`)
    }

    return success(lines.filter(l => l !== '').join('\n'))
  } catch (err) {
    return error(`Failed to get profile: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get time tracking
 */
export async function handleGetTimeTracking(args: unknown) {
  const input = TimeTrackingQuerySchema.parse(args)
  const config = requireAuth()

  try {
    const data = await client.call<TimeTrackingResponse>(
      config.kanbuUrl,
      config.token,
      'user.getTimeTracking',
      input
    )

    const lines: string[] = [
      'Time Tracking Overview',
      '',
      `Total Estimated: ${formatHours(data.totalEstimated)}`,
      `Total Spent: ${formatHours(data.totalSpent)}`,
      '',
      '== By Project ==',
    ]

    for (const proj of data.byProject) {
      const progress = proj.timeEstimated > 0
        ? Math.round((proj.timeSpent / proj.timeEstimated) * 100)
        : 0
      lines.push(`  ${proj.projectName}: ${formatHours(proj.timeSpent)} / ${formatHours(proj.timeEstimated)} (${progress}%)`)
    }

    if (data.recentEntries.length > 0) {
      lines.push('')
      lines.push('== Recent Entries ==')
      for (const entry of data.recentEntries.slice(0, 10)) {
        const status = entry.isActive ? '' : ' ✓'
        lines.push(`  [${entry.type}] ${entry.title}${status}`)
        lines.push(`    ${entry.projectName} • ${formatHours(entry.timeSpent)} spent`)
      }
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get time tracking: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get logins
 */
export async function handleGetLogins(args: unknown) {
  const input = PaginationSchema.parse(args)
  const config = requireAuth()

  try {
    const data = await client.call<{ logins: LoginEntry[]; total: number; hasMore: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.getLastLogins',
      { limit: input.limit ?? 50, offset: input.offset ?? 0 }
    )

    if (data.logins.length === 0) {
      return success('No login history found.')
    }

    const lines: string[] = [
      `Login History (${data.total} total)`,
      '',
    ]

    for (const login of data.logins) {
      lines.push(`${formatDate(login.createdAt)}`)
      lines.push(`  IP: ${login.ipAddress ?? 'N/A'}`)
      if (login.userAgent) {
        lines.push(`  UA: ${login.userAgent.substring(0, 50)}...`)
      }
      lines.push('')
    }

    if (data.hasMore) {
      lines.push(`Showing ${data.logins.length} of ${data.total}. Use offset for more.`)
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get logins: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get sessions
 */
export async function handleGetSessions(_args: unknown) {
  const config = requireAuth()

  try {
    const sessions = await client.call<SessionEntry[]>(
      config.kanbuUrl,
      config.token,
      'user.getSessions',
      {}
    )

    if (sessions.length === 0) {
      return success('No active sessions found.')
    }

    const lines: string[] = [
      `Active Sessions (${sessions.length})`,
      '',
    ]

    for (const session of sessions) {
      lines.push(`Session: ${session.id.substring(0, 8)}...`)
      lines.push(`  Created: ${formatDate(session.createdAt)}`)
      lines.push(`  Expires: ${formatDate(session.expiresAt)}`)
      lines.push(`  IP: ${session.ipAddress ?? 'N/A'}`)
      lines.push('')
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get sessions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get password history
 */
export async function handleGetPasswordHistory(args: unknown) {
  const input = PaginationSchema.parse(args)
  const config = requireAuth()

  try {
    const data = await client.call<{ resets: PasswordResetEntry[]; total: number; hasMore: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.getPasswordResets',
      { limit: input.limit ?? 50, offset: input.offset ?? 0 }
    )

    if (data.resets.length === 0) {
      return success('No password reset history found.')
    }

    const lines: string[] = [
      `Password Reset History (${data.total} total)`,
      '',
    ]

    for (const reset of data.resets) {
      const status = reset.isUsed ? '✓ Used' : (new Date(reset.expiresAt) < new Date() ? '✗ Expired' : 'Pending')
      lines.push(`${formatDate(reset.createdAt)} - ${status}`)
      lines.push(`  IP: ${reset.ip ?? 'N/A'}`)
      lines.push('')
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get password history: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get metadata
 */
export async function handleGetMetadata(_args: unknown) {
  const config = requireAuth()

  try {
    const metadata = await client.call<MetadataEntry[]>(
      config.kanbuUrl,
      config.token,
      'user.getMetadata',
      {}
    )

    if (metadata.length === 0) {
      return success('No metadata found.')
    }

    const lines: string[] = [
      `User Metadata (${metadata.length} entries)`,
      '',
    ]

    for (const entry of metadata) {
      // Don't show sensitive keys
      if (entry.key.startsWith('2fa_')) {
        lines.push(`${entry.key}: [hidden]`)
      } else {
        lines.push(`${entry.key}: ${entry.value}`)
      }
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get metadata: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Update profile
 */
export async function handleUpdateProfile(args: unknown) {
  const input = UpdateProfileSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<ProfileResponse>(
      config.kanbuUrl,
      config.token,
      'user.updateProfile',
      input
    )

    return success(`Profile updated successfully.\nName: ${result.name}\nTimezone: ${result.timezone}\nLanguage: ${result.language}\nTheme: ${result.theme}`)
  } catch (err) {
    return error(`Failed to update profile: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Remove avatar
 */
export async function handleRemoveAvatar(_args: unknown) {
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.removeAvatar',
      {}
    )

    return success('Avatar removed successfully.')
  } catch (err) {
    return error(`Failed to remove avatar: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Change password
 */
export async function handleChangePassword(args: unknown) {
  const input = ChangePasswordSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.changePassword',
      input
    )

    return success('Password changed successfully.')
  } catch (err) {
    return error(`Failed to change password: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get 2FA status
 */
export async function handleGet2FAStatus(_args: unknown) {
  const config = requireAuth()

  try {
    const result = await client.call<{ enabled: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.get2FAStatus',
      {}
    )

    return success(`2FA Status: ${result.enabled ? 'Enabled ✓' : 'Disabled'}`)
  } catch (err) {
    return error(`Failed to get 2FA status: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Setup 2FA
 */
export async function handleSetup2FA(_args: unknown) {
  const config = requireAuth()

  try {
    const result = await client.call<TwoFASetupResponse>(
      config.kanbuUrl,
      config.token,
      'user.setup2FA',
      {}
    )

    const lines: string[] = [
      '2FA Setup Initiated',
      '',
      'Add this to your authenticator app:',
      '',
      `Secret: ${result.secret}`,
      '',
      `QR Code URI: ${result.qrCodeUri}`,
      '',
      'After adding, use kanbu_verify_2fa with the 6-digit code to activate.',
    ]

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to setup 2FA: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Verify 2FA
 */
export async function handleVerify2FA(args: unknown) {
  const input = Verify2FASchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<TwoFAVerifyResponse>(
      config.kanbuUrl,
      config.token,
      'user.verify2FA',
      { token: input.token }
    )

    const lines: string[] = [
      '2FA Activated Successfully!',
      '',
      'IMPORTANT: Save these backup codes in a safe place:',
      '',
      ...result.backupCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      'Each backup code can only be used once.',
    ]

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to verify 2FA: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Disable own 2FA (requires password)
 */
export async function handleDisableOwn2FA(args: unknown) {
  const input = Disable2FASchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.disable2FA',
      { password: input.password }
    )

    return success('2FA disabled successfully.')
  } catch (err) {
    return error(`Failed to disable 2FA: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Regenerate backup codes (re-runs setup and verify)
 */
export async function handleRegenerateBackupCodes(_args: unknown) {
  const config = requireAuth()

  try {
    // This requires re-verification, inform user
    return success('To regenerate backup codes, you need to:\n1. Disable 2FA (kanbu_disable_own_2fa)\n2. Re-setup 2FA (kanbu_setup_2fa)\n3. Verify with new code (kanbu_verify_2fa)\n\nNew backup codes will be provided after verification.')
  } catch (err) {
    return error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get public access
 */
export async function handleGetPublicAccess(_args: unknown) {
  const config = requireAuth()

  try {
    const result = await client.call<PublicAccessResponse>(
      config.kanbuUrl,
      config.token,
      'user.getPublicAccess',
      {}
    )

    if (result.enabled) {
      return success(`Public Access: Enabled\nToken: ${result.token}`)
    } else {
      return success('Public Access: Disabled')
    }
  } catch (err) {
    return error(`Failed to get public access: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Enable public access
 */
export async function handleEnablePublicAccess(_args: unknown) {
  const config = requireAuth()

  try {
    const result = await client.call<{ success: boolean; token: string }>(
      config.kanbuUrl,
      config.token,
      'user.enablePublicAccess',
      {}
    )

    return success(`Public access enabled.\nToken: ${result.token}`)
  } catch (err) {
    return error(`Failed to enable public access: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Disable public access
 */
export async function handleDisablePublicAccess(_args: unknown) {
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.disablePublicAccess',
      {}
    )

    return success('Public access disabled.')
  } catch (err) {
    return error(`Failed to disable public access: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Regenerate public token
 */
export async function handleRegeneratePublicToken(_args: unknown) {
  const config = requireAuth()

  try {
    const result = await client.call<{ success: boolean; token: string }>(
      config.kanbuUrl,
      config.token,
      'user.regeneratePublicToken',
      {}
    )

    return success(`Public token regenerated.\nNew Token: ${result.token}`)
  } catch (err) {
    return error(`Failed to regenerate token: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get notification settings
 */
export async function handleGetNotificationSettings(_args: unknown) {
  const config = requireAuth()

  try {
    const result = await client.call<NotificationSettingsResponse>(
      config.kanbuUrl,
      config.token,
      'notification.getSettings',
      {}
    )

    const lines: string[] = [
      'Notification Settings',
      '',
      `Enabled: ${result.enabled ? 'Yes' : 'No'}`,
      `Filter: ${result.filterLabel}`,
      '',
      '== Types ==',
    ]

    for (const type of result.types) {
      lines.push(`  ${type.type}: ${type.enabled ? 'Enabled' : 'Disabled'}`)
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get notification settings: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Update notification settings
 */
export async function handleUpdateNotificationSettings(args: unknown) {
  const input = UpdateNotificationsSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'notification.updateSettings',
      {
        notificationsEnabled: input.enabled,
        notificationFilter: input.filter,
      }
    )

    return success('Notification settings updated.')
  } catch (err) {
    return error(`Failed to update notification settings: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * List external accounts
 */
export async function handleListExternalAccounts(_args: unknown) {
  const config = requireAuth()

  try {
    const result = await client.call<ConnectedAccountsResponse>(
      config.kanbuUrl,
      config.token,
      'user.getConnectedAccounts',
      {}
    )

    const lines: string[] = [
      'Connected OAuth Accounts',
      '',
      `Google: ${result.google.connected ? `Connected (${result.google.id})` : 'Not connected'}`,
      `GitHub: ${result.github.connected ? `Connected (${result.github.id})` : 'Not connected'}`,
      `GitLab: ${result.gitlab.connected ? `Connected (${result.gitlab.id})` : 'Not connected'}`,
    ]

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to list external accounts: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Unlink external account
 */
export async function handleUnlinkExternalAccount(args: unknown) {
  const input = UnlinkAccountSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.unlinkAccount',
      { provider: input.provider }
    )

    return success(`${input.provider} account unlinked successfully.`)
  } catch (err) {
    return error(`Failed to unlink account: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * List API tokens
 */
export async function handleListApiTokens(_args: unknown) {
  const config = requireAuth()

  try {
    const tokens = await client.call<ApiKeyEntry[]>(
      config.kanbuUrl,
      config.token,
      'apiKey.list',
      {}
    )

    if (tokens.length === 0) {
      return success('No API tokens found.')
    }

    const lines: string[] = [
      `API Tokens (${tokens.length})`,
      '',
    ]

    for (const token of tokens) {
      const status = !token.isActive ? ' [Inactive]' : token.isExpired ? ' [Expired]' : ''
      lines.push(`#${token.id} ${token.name}${status}`)
      lines.push(`  Prefix: ${token.keyPrefix}...`)
      lines.push(`  Scope: ${token.scope}${token.workspace ? ` (${token.workspace.name})` : ''}`)
      lines.push(`  Last used: ${formatDate(token.lastUsedAt)}`)
      if (token.isServiceAccount) {
        lines.push(`  Service Account: ${token.serviceAccountName}`)
      }
      lines.push('')
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to list API tokens: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Create API token
 */
export async function handleCreateApiToken(args: unknown) {
  const input = CreateApiTokenSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<ApiKeyCreateResponse>(
      config.kanbuUrl,
      config.token,
      'apiKey.create',
      input
    )

    const lines: string[] = [
      'API Token Created',
      '',
      '⚠️  IMPORTANT: Copy this token now - it will NOT be shown again!',
      '',
      `Token: ${result.key}`,
      '',
      `ID: ${result.id}`,
      `Name: ${result.name}`,
      `Scope: ${result.scope}`,
      `Permissions: ${result.permissions.length > 0 ? result.permissions.join(', ') : 'All'}`,
    ]

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to create API token: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Revoke API token
 */
export async function handleRevokeApiToken(args: unknown) {
  const input = RevokeApiTokenSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'apiKey.revoke',
      { keyId: input.keyId }
    )

    return success(`API token #${input.keyId} revoked successfully.`)
  } catch (err) {
    return error(`Failed to revoke API token: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get API permissions
 */
export async function handleGetApiPermissions(_args: unknown) {
  const config = requireAuth()

  try {
    const permissions = await client.call<Array<{ value: string; label: string; description: string }>>(
      config.kanbuUrl,
      config.token,
      'apiKey.getPermissions',
      {}
    )

    const lines: string[] = [
      'Available API Permissions',
      '',
    ]

    for (const perm of permissions) {
      lines.push(`${perm.value}`)
      lines.push(`  ${perm.description}`)
      lines.push('')
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get API permissions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * List AI bindings
 */
export async function handleListAiBindings(_args: unknown) {
  const config = requireAuth()

  try {
    const bindings = await client.call<AiBindingEntry[]>(
      config.kanbuUrl,
      config.token,
      'assistant.getBindings',
      {}
    )

    if (bindings.length === 0) {
      return success('No AI assistant bindings found.')
    }

    const lines: string[] = [
      `AI Assistant Bindings (${bindings.length})`,
      '',
    ]

    for (const binding of bindings) {
      lines.push(`#${binding.id} ${binding.machineName ?? binding.machineId.substring(0, 8)}`)
      lines.push(`  Machine ID: ${binding.machineId.substring(0, 16)}...`)
      lines.push(`  Connected: ${formatDate(binding.createdAt)}`)
      lines.push(`  Last used: ${formatDate(binding.lastUsedAt)}`)
      lines.push('')
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to list AI bindings: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Revoke AI binding
 */
export async function handleRevokeAiBinding(args: unknown) {
  const input = RevokeAiBindingSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'assistant.revokeBinding',
      { bindingId: input.bindingId }
    )

    return success(`AI binding #${input.bindingId} revoked successfully.`)
  } catch (err) {
    return error(`Failed to revoke AI binding: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get hourly rate
 */
export async function handleGetHourlyRate(_args: unknown) {
  const config = requireAuth()

  try {
    const result = await client.call<{ hourlyRate: number | null }>(
      config.kanbuUrl,
      config.token,
      'user.getHourlyRate',
      {}
    )

    if (result.hourlyRate !== null) {
      return success(`Hourly Rate: €${result.hourlyRate}`)
    } else {
      return success('Hourly Rate: Not set')
    }
  } catch (err) {
    return error(`Failed to get hourly rate: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Set hourly rate
 */
export async function handleSetHourlyRate(args: unknown) {
  const input = HourlyRateSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.updateHourlyRate',
      { hourlyRate: input.hourlyRate }
    )

    if (input.hourlyRate !== null) {
      return success(`Hourly rate set to €${input.hourlyRate}`)
    } else {
      return success('Hourly rate cleared.')
    }
  } catch (err) {
    return error(`Failed to set hourly rate: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Set metadata
 */
export async function handleSetMetadata(args: unknown) {
  const input = SetMetadataSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.setMetadata',
      input
    )

    return success(`Metadata "${input.key}" set successfully.`)
  } catch (err) {
    return error(`Failed to set metadata: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Delete metadata
 */
export async function handleDeleteMetadata(args: unknown) {
  const input = DeleteMetadataSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.deleteMetadata',
      { key: input.key }
    )

    return success(`Metadata "${input.key}" deleted.`)
  } catch (err) {
    return error(`Failed to delete metadata: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Revoke session
 */
export async function handleRevokeSession(args: unknown) {
  const input = RevokeSessionSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'user.revokeSession',
      { sessionId: input.sessionId }
    )

    return success('Session revoked successfully.')
  } catch (err) {
    return error(`Failed to revoke session: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Revoke all sessions
 */
export async function handleRevokeAllSessions(_args: unknown) {
  const config = requireAuth()

  try {
    const result = await client.call<{ success: boolean; count: number }>(
      config.kanbuUrl,
      config.token,
      'user.revokeAllSessions',
      {}
    )

    return success(`All sessions revoked (${result.count} sessions).`)
  } catch (err) {
    return error(`Failed to revoke all sessions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
