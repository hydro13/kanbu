/*
 * Audit Log Tools
 * Version: 1.0.0
 *
 * MCP tools for querying and exporting audit logs.
 * Provides scoped access: Domain Admins see all, Workspace Admins see their workspace.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 10 - Audit Logs
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { requireAuth, client, success, error } from '../tools.js';

// =============================================================================
// Types
// =============================================================================

interface AuditLogEntry {
  id: number;
  category: string;
  action: string;
  resourceType: string;
  resourceId: number | null;
  resourceName: string | null;
  targetType: string | null;
  targetId: number | null;
  targetName: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  userId: number;
  workspaceId: number | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    username: string;
    email?: string;
    avatarUrl: string | null;
  };
  workspace: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

interface AuditLogListResponse {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface AuditStatsResponse {
  totalLogs: number;
  byCategory: Record<string, number>;
  recentActions: Array<{
    id: number;
    action: string;
    resourceName: string | null;
    createdAt: string;
    user: { name: string; username: string };
  }>;
  topActors: Array<{
    user: { id: number; name: string; username: string; avatarUrl: string | null } | undefined;
    count: number;
  }>;
}

interface AuditExportResponse {
  data: string;
  filename: string;
  mimeType: string;
  count: number;
}

// =============================================================================
// Schemas
// =============================================================================

const CategorySchema = z.enum(['ACL', 'GROUP', 'USER', 'WORKSPACE', 'SETTINGS']);

export const ListAuditLogsSchema = z.object({
  category: CategorySchema.optional().describe('Filter by category'),
  action: z.string().optional().describe('Filter by action (partial match)'),
  resourceType: z.string().optional().describe('Filter by resource type'),
  resourceId: z.number().optional().describe('Filter by resource ID'),
  userId: z.number().optional().describe('Filter by actor user ID'),
  workspaceId: z.number().optional().describe('Filter by workspace'),
  dateFrom: z.string().optional().describe('Start date (ISO format)'),
  dateTo: z.string().optional().describe('End date (ISO format)'),
  search: z.string().optional().describe('Search in resource/target names'),
  limit: z.number().optional().describe('Max results (default 50, max 100)'),
  offset: z.number().optional().describe('Pagination offset'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
});

export const GetAuditLogSchema = z.object({
  id: z.number().describe('Audit log entry ID'),
});

export const AuditStatsSchema = z.object({
  workspaceId: z.number().optional().describe('Filter by workspace'),
  dateFrom: z.string().optional().describe('Start date (ISO format)'),
  dateTo: z.string().optional().describe('End date (ISO format)'),
});

export const ExportAuditLogsSchema = z.object({
  category: CategorySchema.optional().describe('Filter by category'),
  dateFrom: z.string().optional().describe('Start date (ISO format)'),
  dateTo: z.string().optional().describe('End date (ISO format)'),
  workspaceId: z.number().optional().describe('Filter by workspace'),
  format: z.enum(['csv', 'json']).describe('Export format'),
});

// =============================================================================
// Tool Definitions
// =============================================================================

export const auditToolDefinitions = [
  {
    name: 'kanbu_list_audit_logs',
    description:
      'List audit logs with filtering and pagination. Domain Admins see all, Workspace Admins see their workspace only.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['ACL', 'GROUP', 'USER', 'WORKSPACE', 'SETTINGS'],
          description: 'Filter by category',
        },
        action: { type: 'string', description: 'Filter by action (partial match)' },
        resourceType: { type: 'string', description: 'Filter by resource type' },
        resourceId: { type: 'number', description: 'Filter by resource ID' },
        userId: { type: 'number', description: 'Filter by actor user ID' },
        workspaceId: { type: 'number', description: 'Filter by workspace' },
        dateFrom: { type: 'string', description: 'Start date (ISO format)' },
        dateTo: { type: 'string', description: 'End date (ISO format)' },
        search: { type: 'string', description: 'Search in resource/target names' },
        limit: { type: 'number', description: 'Max results (default 50, max 100)' },
        offset: { type: 'number', description: 'Pagination offset' },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (default: desc)',
        },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_get_audit_log',
    description: 'Get details of a single audit log entry by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Audit log entry ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_audit_stats',
    description: 'Get audit log statistics: counts by category, recent actions, top actors.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Filter by workspace' },
        dateFrom: { type: 'string', description: 'Start date (ISO format)' },
        dateTo: { type: 'string', description: 'End date (ISO format)' },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_export_audit_logs',
    description: 'Export audit logs to CSV or JSON format. Max 10,000 entries.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['ACL', 'GROUP', 'USER', 'WORKSPACE', 'SETTINGS'],
          description: 'Filter by category',
        },
        dateFrom: { type: 'string', description: 'Start date (ISO format)' },
        dateTo: { type: 'string', description: 'End date (ISO format)' },
        workspaceId: { type: 'number', description: 'Filter by workspace' },
        format: { type: 'string', enum: ['csv', 'json'], description: 'Export format' },
      },
      required: ['format'],
    },
  },
  {
    name: 'kanbu_get_audit_categories',
    description: 'Get available audit log categories for filtering.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'ACL':
      return '🔐';
    case 'GROUP':
      return '👥';
    case 'USER':
      return '👤';
    case 'WORKSPACE':
      return '🏢';
    case 'SETTINGS':
      return '⚙️';
    default:
      return '📝';
  }
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List audit logs
 */
export async function handleListAuditLogs(args: unknown) {
  const input = ListAuditLogsSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<AuditLogListResponse>(
      config.kanbuUrl,
      config.token,
      'auditLog.list',
      {
        ...input,
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
        sortOrder: input.sortOrder ?? 'desc',
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
      }
    );

    if (result.logs.length === 0) {
      return success('No audit logs found matching the criteria.');
    }

    const lines: string[] = [`Audit Logs (${result.total} total)`, ''];

    for (const log of result.logs) {
      const icon = getCategoryIcon(log.category);
      const workspace = log.workspace ? log.workspace.name : 'System';
      lines.push(`${icon} [${log.category}] ${log.action}`);
      lines.push(`   #${log.id} | ${formatDate(log.createdAt)} | ${workspace}`);
      lines.push(`   Actor: ${log.user.name} (@${log.user.username})`);
      if (log.resourceName) {
        lines.push(`   Resource: ${log.resourceType} "${log.resourceName}"`);
      }
      if (log.targetName) {
        lines.push(`   Target: ${log.targetType} "${log.targetName}"`);
      }
      lines.push('');
    }

    if (result.hasMore) {
      lines.push(
        `Showing ${result.logs.length} of ${result.total}. Use offset=${result.offset + result.limit} for more.`
      );
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to list audit logs: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Get single audit log entry
 */
export async function handleGetAuditLog(args: unknown) {
  const input = GetAuditLogSchema.parse(args);
  const config = requireAuth();

  try {
    const log = await client.call<AuditLogEntry>(config.kanbuUrl, config.token, 'auditLog.get', {
      id: input.id,
    });

    const lines: string[] = [
      `Audit Log #${log.id}`,
      '',
      `${getCategoryIcon(log.category)} ${log.category}: ${log.action}`,
      '',
      '== Details ==',
      `Timestamp: ${formatDate(log.createdAt)}`,
      `Actor: ${log.user.name} (@${log.user.username})${log.user.email ? ` <${log.user.email}>` : ''}`,
      `Workspace: ${log.workspace?.name ?? 'System'}`,
      `IP Address: ${log.ipAddress ?? 'N/A'}`,
      '',
    ];

    if (log.resourceType) {
      lines.push('== Resource ==');
      lines.push(`Type: ${log.resourceType}`);
      if (log.resourceId) lines.push(`ID: ${log.resourceId}`);
      if (log.resourceName) lines.push(`Name: ${log.resourceName}`);
      lines.push('');
    }

    if (log.targetType) {
      lines.push('== Target ==');
      lines.push(`Type: ${log.targetType}`);
      if (log.targetId) lines.push(`ID: ${log.targetId}`);
      if (log.targetName) lines.push(`Name: ${log.targetName}`);
      lines.push('');
    }

    if (log.changes && Object.keys(log.changes).length > 0) {
      lines.push('== Changes ==');
      lines.push(JSON.stringify(log.changes, null, 2));
      lines.push('');
    }

    if (log.metadata && Object.keys(log.metadata).length > 0) {
      lines.push('== Metadata ==');
      lines.push(JSON.stringify(log.metadata, null, 2));
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to get audit log: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Get audit stats
 */
export async function handleAuditStats(args: unknown) {
  const input = AuditStatsSchema.parse(args);
  const config = requireAuth();

  try {
    const stats = await client.call<AuditStatsResponse>(
      config.kanbuUrl,
      config.token,
      'auditLog.getStats',
      {
        ...input,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
      }
    );

    const lines: string[] = [
      `Audit Statistics`,
      '',
      `Total Logs: ${stats.totalLogs}`,
      '',
      '== By Category ==',
    ];

    for (const [category, count] of Object.entries(stats.byCategory)) {
      lines.push(`${getCategoryIcon(category)} ${category}: ${count}`);
    }

    lines.push('');
    lines.push('== Recent Actions ==');
    for (const action of stats.recentActions.slice(0, 5)) {
      lines.push(`  ${action.action}: ${action.resourceName ?? 'N/A'} by ${action.user.name}`);
    }

    lines.push('');
    lines.push('== Top Actors ==');
    for (const actor of stats.topActors) {
      if (actor.user) {
        lines.push(`  ${actor.user.name} (@${actor.user.username}): ${actor.count} actions`);
      }
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to get audit stats: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Export audit logs
 */
export async function handleExportAuditLogs(args: unknown) {
  const input = ExportAuditLogsSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<AuditExportResponse>(
      config.kanbuUrl,
      config.token,
      'auditLog.export',
      {
        ...input,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
      }
    );

    const lines: string[] = [
      `Audit Log Export`,
      '',
      `Format: ${input.format.toUpperCase()}`,
      `Entries: ${result.count}`,
      `Filename: ${result.filename}`,
      '',
      '== Data Preview (first 2000 chars) ==',
      result.data.slice(0, 2000),
    ];

    if (result.data.length > 2000) {
      lines.push('');
      lines.push(`... (${result.data.length - 2000} more characters)`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to export audit logs: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Get audit categories
 */
export async function handleGetAuditCategories(_args: unknown) {
  const config = requireAuth();

  try {
    const categories = await client.call<string[]>(
      config.kanbuUrl,
      config.token,
      'auditLog.getCategories',
      {}
    );

    const lines: string[] = [`Available Audit Categories`, ''];

    for (const category of categories) {
      lines.push(`${getCategoryIcon(category)} ${category}`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to get audit categories: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}
