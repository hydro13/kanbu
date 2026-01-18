/*
 * Invite Management Tools
 * Version: 1.0.0
 *
 * MCP tools for managing user invitations.
 * Allows sending, tracking, and managing email invites.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 9 - Invites
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { requireAuth, client, success, error } from '../tools.js';

// =============================================================================
// Types
// =============================================================================

interface InviteResponse {
  id: number;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy: {
    id: number;
    name: string;
    email: string;
  };
  status: 'pending' | 'accepted' | 'expired';
}

interface InviteListResponse {
  invites: InviteResponse[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface SendInviteResult {
  email: string;
  success: boolean;
  message: string;
  inviteId?: number;
}

interface SendInviteResponse {
  results: SendInviteResult[];
  successCount: number;
  failedCount: number;
}

// =============================================================================
// Schemas
// =============================================================================

export const ListInvitesSchema = z.object({
  status: z
    .enum(['all', 'pending', 'accepted', 'expired'])
    .optional()
    .describe('Filter by status (default: all)'),
  limit: z.number().optional().describe('Max results (default 50)'),
  offset: z.number().optional().describe('Pagination offset'),
});

export const GetInviteSchema = z.object({
  inviteId: z.number().describe('Invite ID'),
});

export const SendInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50).describe('Email addresses to invite'),
  role: z.enum(['user', 'admin']).optional().describe('Role for invited users (default: user)'),
  expiresInDays: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .describe('Days until invite expires (default: 7)'),
});

export const CancelInviteSchema = z.object({
  inviteId: z.number().describe('Invite ID to cancel'),
});

export const ResendInviteSchema = z.object({
  inviteId: z.number().describe('Invite ID to resend'),
  expiresInDays: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .describe('Days until invite expires (default: 7)'),
});

// =============================================================================
// Tool Definitions
// =============================================================================

export const inviteToolDefinitions = [
  {
    name: 'kanbu_list_invites',
    description:
      'List all invites with status filtering. Shows pending, accepted, and expired invitations.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'pending', 'accepted', 'expired'],
          description: 'Filter by status (default: all)',
        },
        limit: { type: 'number', description: 'Max results (default 50)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_get_invite',
    description: 'Get details of a specific invite by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        inviteId: { type: 'number', description: 'Invite ID' },
      },
      required: ['inviteId'],
    },
  },
  {
    name: 'kanbu_send_invite',
    description: 'Send invites to one or more email addresses. Requires admin privileges.',
    inputSchema: {
      type: 'object',
      properties: {
        emails: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses to invite (max 50)',
        },
        role: {
          type: 'string',
          enum: ['user', 'admin'],
          description: 'Role for invited users (default: user)',
        },
        expiresInDays: {
          type: 'number',
          description: 'Days until invite expires (default: 7, max 30)',
        },
      },
      required: ['emails'],
    },
  },
  {
    name: 'kanbu_cancel_invite',
    description: 'Cancel a pending invite. Cannot cancel already accepted invites.',
    inputSchema: {
      type: 'object',
      properties: {
        inviteId: { type: 'number', description: 'Invite ID to cancel' },
      },
      required: ['inviteId'],
    },
  },
  {
    name: 'kanbu_resend_invite',
    description: 'Resend an invite with a new token and expiration date.',
    inputSchema: {
      type: 'object',
      properties: {
        inviteId: { type: 'number', description: 'Invite ID to resend' },
        expiresInDays: {
          type: 'number',
          description: 'Days until invite expires (default: 7, max 30)',
        },
      },
      required: ['inviteId'],
    },
  },
];

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: string | null): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleString('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'accepted':
      return '✅';
    case 'expired':
      return '❌';
    default:
      return '❓';
  }
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List all invites
 */
export async function handleListInvites(args: unknown) {
  const input = ListInvitesSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<InviteListResponse>(
      config.kanbuUrl,
      config.token,
      'admin.listInvites',
      {
        status: input.status ?? 'all',
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
      }
    );

    if (result.invites.length === 0) {
      return success('No invites found.');
    }

    const lines: string[] = [`Invites (${result.total} total)`, ''];

    // Group by status
    const pending = result.invites.filter((i) => i.status === 'pending');
    const accepted = result.invites.filter((i) => i.status === 'accepted');
    const expired = result.invites.filter((i) => i.status === 'expired');

    if (pending.length > 0) {
      lines.push('== Pending ==');
      for (const invite of pending) {
        lines.push(`#${invite.id} ${invite.email}`);
        lines.push(`   Role: ${invite.role} | Invited by: ${invite.invitedBy.name}`);
        lines.push(`   Expires: ${formatDate(invite.expiresAt)}`);
      }
      lines.push('');
    }

    if (accepted.length > 0) {
      lines.push('== Accepted ==');
      for (const invite of accepted) {
        lines.push(`#${invite.id} ${invite.email}`);
        lines.push(`   Role: ${invite.role} | Accepted: ${formatDate(invite.acceptedAt)}`);
      }
      lines.push('');
    }

    if (expired.length > 0) {
      lines.push('== Expired ==');
      for (const invite of expired) {
        lines.push(`#${invite.id} ${invite.email}`);
        lines.push(`   Role: ${invite.role} | Expired: ${formatDate(invite.expiresAt)}`);
      }
    }

    if (result.hasMore) {
      lines.push('');
      lines.push(
        `Showing ${result.invites.length} of ${result.total}. Use offset=${result.offset + result.limit} for more.`
      );
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(`Failed to list invites: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Get invite details
 */
export async function handleGetInvite(args: unknown) {
  const input = GetInviteSchema.parse(args);
  const config = requireAuth();

  try {
    const invite = await client.call<InviteResponse>(
      config.kanbuUrl,
      config.token,
      'admin.getInvite',
      { inviteId: input.inviteId }
    );

    const lines: string[] = [
      `Invite #${invite.id}`,
      '',
      `Email: ${invite.email}`,
      `Status: ${getStatusIcon(invite.status)} ${invite.status.toUpperCase()}`,
      `Role: ${invite.role}`,
      '',
      `Invited by: ${invite.invitedBy.name} (${invite.invitedBy.email})`,
      `Created: ${formatDate(invite.createdAt)}`,
      `Expires: ${formatDate(invite.expiresAt)}`,
    ];

    if (invite.acceptedAt) {
      lines.push(`Accepted: ${formatDate(invite.acceptedAt)}`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(`Failed to get invite: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Send invites
 */
export async function handleSendInvite(args: unknown) {
  const input = SendInviteSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<SendInviteResponse>(
      config.kanbuUrl,
      config.token,
      'admin.sendInvite',
      {
        emails: input.emails,
        role: input.role ?? 'user',
        expiresInDays: input.expiresInDays ?? 7,
      }
    );

    const lines: string[] = [
      `Invite Results`,
      '',
      `Success: ${result.successCount}`,
      `Failed: ${result.failedCount}`,
      '',
    ];

    for (const r of result.results) {
      const icon = r.success ? '✅' : '❌';
      lines.push(`${icon} ${r.email}: ${r.message}${r.inviteId ? ` (ID: ${r.inviteId})` : ''}`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(`Failed to send invites: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Cancel invite
 */
export async function handleCancelInvite(args: unknown) {
  const input = CancelInviteSchema.parse(args);
  const config = requireAuth();

  try {
    await client.call<{ success: boolean; message: string }>(
      config.kanbuUrl,
      config.token,
      'admin.cancelInvite',
      { inviteId: input.inviteId }
    );

    return success(`Invite #${input.inviteId} cancelled successfully.`);
  } catch (err) {
    return error(
      `Failed to cancel invite: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Resend invite
 */
export async function handleResendInvite(args: unknown) {
  const input = ResendInviteSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<InviteResponse>(
      config.kanbuUrl,
      config.token,
      'admin.resendInvite',
      {
        inviteId: input.inviteId,
        expiresInDays: input.expiresInDays ?? 7,
      }
    );

    const lines: string[] = [
      `Invite #${input.inviteId} resent!`,
      '',
      `Email: ${result.email}`,
      `New expiration: ${formatDate(result.expiresAt)}`,
    ];

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to resend invite: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}
