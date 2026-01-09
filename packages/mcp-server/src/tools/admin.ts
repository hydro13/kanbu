/*
 * Admin Tools - User Management
 * Version: 1.0.0
 *
 * MCP tools for user administration.
 * Requires admin permissions (Domain Admin or Workspace Admin).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 6 - User Management
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { requireAuth, client, success, error } from '../tools.js'

// =============================================================================
// Types
// =============================================================================

interface UserListResponse {
  users: Array<{
    id: number
    email: string
    username: string
    name: string
    avatarUrl: string | null
    role: string
    isActive: boolean
    emailVerified: boolean
    twofactorActivated: boolean
    lastLoginAt: string | null
    lockedUntil: string | null
    createdAt: string
    workspaceCount: number
    isLocked: boolean
    isDomainAdmin: boolean
    groups: Array<{ id: number; name: string; displayName: string; type: string }>
  }>
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

interface UserDetailResponse {
  id: number
  email: string
  username: string
  name: string
  avatarUrl: string | null
  role: string
  isActive: boolean
  emailVerified: boolean
  twofactorActivated: boolean
  timezone: string | null
  language: string | null
  theme: string | null
  lastLoginAt: string | null
  failedLoginCount: number
  lockedUntil: string | null
  createdAt: string
  updatedAt: string
  workspaceCount: number
  sessionCount: number
  loginCount: number
  isLocked: boolean
  hasPassword: boolean
  hasGoogle: boolean
  hasGithub: boolean
  hasGitlab: boolean
}

interface UserLoginResponse {
  logins: Array<{
    id: number
    userId: number
    ipAddress: string | null
    userAgent: string | null
    createdAt: string
  }>
  total: number
  hasMore: boolean
}

interface CreateUserResponse {
  id: number
  email: string
  username: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
}

interface UpdateUserResponse {
  id: number
  email: string
  username: string
  name: string
  role: string
  isActive: boolean
  timezone: string | null
  language: string | null
  updatedAt: string
}

interface SimpleResponse {
  success: boolean
  message?: string
  count?: number
}

// =============================================================================
// Schemas
// =============================================================================

export const ListUsersSchema = z.object({
  search: z.string().optional().describe('Search in email, username, or name'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional().describe('Filter by role'),
  isActive: z.boolean().optional().describe('Filter by active status'),
  limit: z.number().optional().describe('Max results (default 25, max 100)'),
  offset: z.number().optional().describe('Pagination offset'),
  sortBy: z.enum(['id', 'email', 'username', 'name', 'createdAt', 'lastLoginAt']).optional().describe('Sort field'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
})

export const GetUserSchema = z.object({
  userId: z.number().describe('User ID'),
})

export const GetUserLoginsSchema = z.object({
  userId: z.number().describe('User ID'),
  limit: z.number().optional().describe('Max results (default 20)'),
  offset: z.number().optional().describe('Pagination offset'),
})

export const CreateUserSchema = z.object({
  email: z.string().email().describe('Email address'),
  username: z.string().describe('Username (3-50 chars, alphanumeric with _ and -)'),
  name: z.string().describe('Display name'),
  password: z.string().describe('Password (min 8 chars)'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional().describe('User role (default: USER)'),
})

export const UpdateUserSchema = z.object({
  userId: z.number().describe('User ID to update'),
  email: z.string().email().optional().describe('New email address'),
  username: z.string().optional().describe('New username'),
  name: z.string().optional().describe('New display name'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional().describe('New role'),
  isActive: z.boolean().optional().describe('Active status'),
  timezone: z.string().optional().describe('Timezone (e.g., Europe/Amsterdam)'),
  language: z.string().optional().describe('Language code (e.g., nl, en)'),
})

export const UserIdSchema = z.object({
  userId: z.number().describe('User ID'),
})

export const ResetPasswordSchema = z.object({
  userId: z.number().describe('User ID'),
  newPassword: z.string().describe('New password (min 8 chars)'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const adminToolDefinitions = [
  // Query Tools
  {
    name: 'kanbu_list_users',
    description:
      'List all users visible to you. Domain Admins see all users, Workspace Admins see users in their workspaces. Supports filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search in email, username, or name',
        },
        role: {
          type: 'string',
          enum: ['ADMIN', 'MANAGER', 'USER'],
          description: 'Filter by role',
        },
        isActive: {
          type: 'boolean',
          description: 'Filter by active status',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 25, max 100)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset',
        },
        sortBy: {
          type: 'string',
          enum: ['id', 'email', 'username', 'name', 'createdAt', 'lastLoginAt'],
          description: 'Sort field',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order',
        },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_get_user',
    description:
      'Get detailed information about a specific user including workspace count, session count, and OAuth connections.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'kanbu_get_user_logins',
    description: 'Get login history for a user, showing IP addresses and timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 20)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset',
        },
      },
      required: ['userId'],
    },
  },

  // Management Tools
  {
    name: 'kanbu_create_user',
    description: 'Create a new user account. The user will be automatically verified.',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Email address',
        },
        username: {
          type: 'string',
          description: 'Username (3-50 chars, alphanumeric with _ and -)',
        },
        name: {
          type: 'string',
          description: 'Display name',
        },
        password: {
          type: 'string',
          description: 'Password (min 8 chars)',
        },
        role: {
          type: 'string',
          enum: ['ADMIN', 'MANAGER', 'USER'],
          description: 'User role (default: USER)',
        },
      },
      required: ['email', 'username', 'name', 'password'],
    },
  },
  {
    name: 'kanbu_update_user',
    description: 'Update user properties. You cannot demote yourself from admin or deactivate yourself.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID to update',
        },
        email: {
          type: 'string',
          description: 'New email address',
        },
        username: {
          type: 'string',
          description: 'New username',
        },
        name: {
          type: 'string',
          description: 'New display name',
        },
        role: {
          type: 'string',
          enum: ['ADMIN', 'MANAGER', 'USER'],
          description: 'New role',
        },
        isActive: {
          type: 'boolean',
          description: 'Active status',
        },
        timezone: {
          type: 'string',
          description: 'Timezone (e.g., Europe/Amsterdam)',
        },
        language: {
          type: 'string',
          description: 'Language code (e.g., nl, en)',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'kanbu_delete_user',
    description: 'Deactivate a user (soft delete). Cannot delete yourself.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID to deactivate',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'kanbu_reactivate_user',
    description: 'Reactivate a previously deactivated user.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID to reactivate',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'kanbu_reset_password',
    description: 'Reset a user password (admin override). Use with caution.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID',
        },
        newPassword: {
          type: 'string',
          description: 'New password (min 8 chars)',
        },
      },
      required: ['userId', 'newPassword'],
    },
  },
  {
    name: 'kanbu_unlock_user',
    description: 'Unlock a locked user account (due to failed login attempts).',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID to unlock',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'kanbu_disable_2fa',
    description: 'Disable two-factor authentication for a user (admin override). Use with caution.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'kanbu_revoke_sessions',
    description: 'Revoke all active sessions for a user, forcing them to log in again.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'User ID',
        },
      },
      required: ['userId'],
    },
  },
]

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: string | null): string {
  if (!date) return 'Never'
  return new Date(date).toLocaleString('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function roleEmoji(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '[A]'
    case 'MANAGER':
      return '[M]'
    default:
      return '[U]'
  }
}

function statusIndicator(user: { isActive: boolean; isLocked: boolean; twofactorActivated: boolean }): string {
  const parts: string[] = []
  if (!user.isActive) parts.push('INACTIVE')
  if (user.isLocked) parts.push('LOCKED')
  if (user.twofactorActivated) parts.push('2FA')
  return parts.length > 0 ? ` (${parts.join(', ')})` : ''
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List all users
 */
export async function handleListUsers(args: unknown) {
  const input = ListUsersSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<UserListResponse>(
      config.kanbuUrl,
      config.token,
      'admin.listUsers',
      {
        search: input.search,
        role: input.role,
        isActive: input.isActive,
        limit: input.limit ?? 25,
        offset: input.offset ?? 0,
        sortBy: input.sortBy ?? 'id',
        sortOrder: input.sortOrder ?? 'asc',
      }
    )

    if (result.users.length === 0) {
      return success('No users found matching the criteria.')
    }

    const lines: string[] = [
      `Users (${result.offset + 1}-${result.offset + result.users.length} of ${result.total})`,
      '',
    ]

    for (const user of result.users) {
      const status = statusIndicator(user)
      const domainAdmin = user.isDomainAdmin ? ' [Domain Admin]' : ''
      lines.push(`${roleEmoji(user.role)} #${user.id} ${user.name} (@${user.username})${domainAdmin}${status}`)
      lines.push(`   Email: ${user.email}`)
      lines.push(`   Last login: ${formatDate(user.lastLoginAt)} | Workspaces: ${user.workspaceCount}`)
      if (user.groups.length > 0) {
        const groupNames = user.groups.map((g) => g.displayName).join(', ')
        lines.push(`   Groups: ${groupNames}`)
      }
      lines.push('')
    }

    if (result.hasMore) {
      lines.push(`... and ${result.total - result.offset - result.users.length} more`)
      lines.push(`Use offset=${result.offset + result.users.length} to see next page`)
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to list users: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get user details
 */
export async function handleGetUser(args: unknown) {
  const input = GetUserSchema.parse(args)
  const config = requireAuth()

  try {
    const user = await client.call<UserDetailResponse>(
      config.kanbuUrl,
      config.token,
      'admin.getUser',
      { userId: input.userId }
    )

    const lines: string[] = [
      `User Details: ${user.name} (@${user.username})`,
      '',
      '== Basic Info ==',
      `ID: ${user.id}`,
      `Email: ${user.email}`,
      `Role: ${user.role}`,
      `Status: ${user.isActive ? 'Active' : 'Inactive'}${user.isLocked ? ' (LOCKED)' : ''}`,
      '',
      '== Account ==',
      `Email verified: ${user.emailVerified ? 'Yes' : 'No'}`,
      `2FA enabled: ${user.twofactorActivated ? 'Yes' : 'No'}`,
      `Has password: ${user.hasPassword ? 'Yes' : 'No'}`,
      `OAuth: ${[
        user.hasGoogle ? 'Google' : '',
        user.hasGithub ? 'GitHub' : '',
        user.hasGitlab ? 'GitLab' : '',
      ].filter(Boolean).join(', ') || 'None'}`,
      '',
      '== Activity ==',
      `Last login: ${formatDate(user.lastLoginAt)}`,
      `Sessions: ${user.sessionCount}`,
      `Total logins: ${user.loginCount}`,
      `Workspaces: ${user.workspaceCount}`,
      '',
      '== Settings ==',
      `Timezone: ${user.timezone ?? 'Default'}`,
      `Language: ${user.language ?? 'Default'}`,
      `Theme: ${user.theme ?? 'Default'}`,
      '',
      '== Dates ==',
      `Created: ${formatDate(user.createdAt)}`,
      `Updated: ${formatDate(user.updatedAt)}`,
    ]

    if (user.failedLoginCount > 0) {
      lines.push('')
      lines.push('== Security ==')
      lines.push(`Failed logins: ${user.failedLoginCount}`)
      if (user.lockedUntil) {
        lines.push(`Locked until: ${formatDate(user.lockedUntil)}`)
      }
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get user: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get user login history
 */
export async function handleGetUserLogins(args: unknown) {
  const input = GetUserLoginsSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<UserLoginResponse>(
      config.kanbuUrl,
      config.token,
      'admin.getUserLogins',
      {
        userId: input.userId,
        limit: input.limit ?? 20,
        offset: input.offset ?? 0,
      }
    )

    if (result.logins.length === 0) {
      return success('No login history found for this user.')
    }

    const lines: string[] = [
      `Login History for User #${input.userId} (${result.logins.length} of ${result.total})`,
      '',
    ]

    for (const login of result.logins) {
      lines.push(`${formatDate(login.createdAt)} - IP: ${login.ipAddress ?? 'Unknown'}`)
      if (login.userAgent) {
        // Truncate long user agents
        const ua = login.userAgent.length > 60 ? login.userAgent.slice(0, 60) + '...' : login.userAgent
        lines.push(`   ${ua}`)
      }
    }

    if (result.hasMore) {
      lines.push('')
      lines.push('... more logins available')
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get user logins: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Create a new user
 */
export async function handleCreateUser(args: unknown) {
  const input = CreateUserSchema.parse(args)
  const config = requireAuth()

  try {
    const user = await client.call<CreateUserResponse>(
      config.kanbuUrl,
      config.token,
      'admin.createUser',
      {
        email: input.email,
        username: input.username,
        name: input.name,
        password: input.password,
        role: input.role ?? 'USER',
      }
    )

    return success([
      `User created successfully!`,
      '',
      `ID: ${user.id}`,
      `Name: ${user.name}`,
      `Username: @${user.username}`,
      `Email: ${user.email}`,
      `Role: ${user.role}`,
      `Status: ${user.isActive ? 'Active' : 'Inactive'}`,
    ].join('\n'))
  } catch (err) {
    return error(`Failed to create user: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Update a user
 */
export async function handleUpdateUser(args: unknown) {
  const input = UpdateUserSchema.parse(args)
  const config = requireAuth()

  try {
    const user = await client.call<UpdateUserResponse>(
      config.kanbuUrl,
      config.token,
      'admin.updateUser',
      input
    )

    return success([
      `User #${user.id} updated successfully!`,
      '',
      `Name: ${user.name}`,
      `Username: @${user.username}`,
      `Email: ${user.email}`,
      `Role: ${user.role}`,
      `Status: ${user.isActive ? 'Active' : 'Inactive'}`,
    ].join('\n'))
  } catch (err) {
    return error(`Failed to update user: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Delete (deactivate) a user
 */
export async function handleDeleteUser(args: unknown) {
  const input = UserIdSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<SimpleResponse>(
      config.kanbuUrl,
      config.token,
      'admin.deleteUser',
      { userId: input.userId }
    )

    return success(`User #${input.userId} deactivated successfully. ${result.message ?? ''}`)
  } catch (err) {
    return error(`Failed to deactivate user: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Reactivate a user
 */
export async function handleReactivateUser(args: unknown) {
  const input = UserIdSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<SimpleResponse>(
      config.kanbuUrl,
      config.token,
      'admin.reactivateUser',
      { userId: input.userId }
    )

    return success(`User #${input.userId} reactivated successfully. ${result.message ?? ''}`)
  } catch (err) {
    return error(`Failed to reactivate user: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Reset user password
 */
export async function handleResetPassword(args: unknown) {
  const input = ResetPasswordSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<SimpleResponse>(
      config.kanbuUrl,
      config.token,
      'admin.resetPassword',
      input
    )

    return success(`Password reset successfully for user #${input.userId}. ${result.message ?? ''}`)
  } catch (err) {
    return error(`Failed to reset password: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Unlock a locked user
 */
export async function handleUnlockUser(args: unknown) {
  const input = UserIdSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<SimpleResponse>(
      config.kanbuUrl,
      config.token,
      'admin.unlockUser',
      { userId: input.userId }
    )

    return success(`User #${input.userId} unlocked successfully. ${result.message ?? ''}`)
  } catch (err) {
    return error(`Failed to unlock user: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Disable 2FA for a user
 */
export async function handleDisable2FA(args: unknown) {
  const input = UserIdSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<SimpleResponse>(
      config.kanbuUrl,
      config.token,
      'admin.disable2FA',
      { userId: input.userId }
    )

    return success(`2FA disabled for user #${input.userId}. ${result.message ?? ''}`)
  } catch (err) {
    return error(`Failed to disable 2FA: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Revoke all sessions for a user
 */
export async function handleRevokeSessions(args: unknown) {
  const input = UserIdSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<SimpleResponse>(
      config.kanbuUrl,
      config.token,
      'admin.revokeSessions',
      { userId: input.userId }
    )

    return success(`All sessions revoked for user #${input.userId}. ${result.count ?? 0} session(s) terminated.`)
  } catch (err) {
    return error(`Failed to revoke sessions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
