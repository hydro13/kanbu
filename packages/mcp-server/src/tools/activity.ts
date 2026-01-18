/*
 * Activity Tools
 * Version: 1.0.0
 *
 * MCP tools for activity log queries.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 4 - Search & Smart Features
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { requireAuth, client, success, formatRelativeTime } from '../tools.js';

// =============================================================================
// Types
// =============================================================================

interface Activity {
  id: number;
  eventType: string;
  entityType: string;
  entityId: number;
  changes: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: number;
    username: string;
    name: string;
  };
}

interface ActivityListResponse {
  activities: Activity[];
  total: number;
  hasMore: boolean;
}

interface ActivityStatsResponse {
  byEventType: Array<{ eventType: string; count: number }>;
  total: number;
  periodDays: number;
}

// =============================================================================
// Schemas
// =============================================================================

export const RecentActivitySchema = z.object({
  projectId: z.number().describe('Project ID'),
  limit: z.number().optional().describe('Maximum activities (default: 20)'),
});

export const TaskActivitySchema = z.object({
  taskId: z.number().describe('Task ID to get activity for'),
  limit: z.number().optional().describe('Maximum activities (default: 20)'),
});

export const ActivityStatsSchema = z.object({
  projectId: z.number().describe('Project ID'),
});

// =============================================================================
// Tool Definitions
// =============================================================================

export const activityToolDefinitions = [
  {
    name: 'kanbu_recent_activity',
    description: 'Get recent activity for a project. Shows who did what and when.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum activities (default: 20)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_task_activity',
    description: 'Get activity history for a specific task. Includes subtask and comment changes.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'number',
          description: 'Task ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum activities (default: 20)',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_activity_stats',
    description:
      'Get activity statistics for a project. Shows counts by event type for the last 30 days.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
      },
      required: ['projectId'],
    },
  },
];

// =============================================================================
// Helpers
// =============================================================================

function formatEventType(eventType: string): string {
  // Convert EVENT_TYPE to "Event Type"
  return eventType
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatActivityLine(activity: Activity): string {
  const time = formatRelativeTime(activity.createdAt);
  const event = formatEventType(activity.eventType);
  const entity = activity.entityType.charAt(0).toUpperCase() + activity.entityType.slice(1);

  // Extract meaningful info from changes
  let detail = '';
  if (activity.changes) {
    const changes = activity.changes as Record<string, unknown>;
    if (changes.title) {
      detail = ` "${changes.title}"`;
    } else if (changes.name) {
      detail = ` "${changes.name}"`;
    } else if (changes.content) {
      const content = String(changes.content);
      detail = ` "${content.length > 30 ? content.slice(0, 30) + '...' : content}"`;
    }
  }

  return `${time} - ${activity.user.name}: ${event} ${entity}${detail}`;
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * Get recent project activity
 */
export async function handleRecentActivity(args: unknown) {
  const input = RecentActivitySchema.parse(args);
  const config = requireAuth();

  const result = await client.call<{ activities: Activity[] }>(
    config.kanbuUrl,
    config.token,
    'activity.getRecent',
    {
      projectId: input.projectId,
      limit: input.limit ?? 20,
    }
  );

  if (result.activities.length === 0) {
    return success('No recent activity in this project.');
  }

  const lines: string[] = [`Recent Activity (${result.activities.length}):`, ''];

  result.activities.forEach((activity) => {
    lines.push(formatActivityLine(activity));
  });

  return success(lines.join('\n'));
}

/**
 * Get task activity history
 */
export async function handleTaskActivity(args: unknown) {
  const input = TaskActivitySchema.parse(args);
  const config = requireAuth();

  const result = await client.call<ActivityListResponse>(
    config.kanbuUrl,
    config.token,
    'activity.forTask',
    {
      taskId: input.taskId,
      limit: input.limit ?? 20,
      offset: 0,
    }
  );

  if (result.activities.length === 0) {
    return success('No activity found for this task.');
  }

  const lines: string[] = [`Task Activity (${result.total} total):`, ''];

  result.activities.forEach((activity) => {
    lines.push(formatActivityLine(activity));
  });

  if (result.hasMore) {
    lines.push('');
    lines.push(`... and ${result.total - result.activities.length} more activities`);
  }

  return success(lines.join('\n'));
}

/**
 * Get activity statistics
 */
export async function handleActivityStats(args: unknown) {
  const input = ActivityStatsSchema.parse(args);
  const config = requireAuth();

  const stats = await client.call<ActivityStatsResponse>(
    config.kanbuUrl,
    config.token,
    'activity.getStats',
    { projectId: input.projectId }
  );

  if (stats.total === 0) {
    return success('No activity in the last 30 days.');
  }

  const lines: string[] = [
    `Activity Stats (Last ${stats.periodDays} days)`,
    `Total: ${stats.total} activities`,
    '',
    'By Event Type:',
  ];

  // Sort by count descending
  const sorted = [...stats.byEventType].sort((a, b) => b.count - a.count);

  sorted.forEach((stat) => {
    const event = formatEventType(stat.eventType);
    const percent = Math.round((stat.count / stats.total) * 100);
    lines.push(`  ${event}: ${stat.count} (${percent}%)`);
  });

  return success(lines.join('\n'));
}
