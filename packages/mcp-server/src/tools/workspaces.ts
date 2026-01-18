/*
 * Workspace Tools
 * Version: 1.0.0
 *
 * MCP tools for workspace management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 2 - Core Kanbu Tools
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { requireAuth, client, success, Workspace } from '../tools.js';

// =============================================================================
// Schemas
// =============================================================================

export const ListWorkspacesSchema = z.object({});

export const GetWorkspaceSchema = z.object({
  id: z.number().describe('Workspace ID'),
});

// =============================================================================
// Tool Definitions
// =============================================================================

export const workspaceToolDefinitions = [
  {
    name: 'kanbu_list_workspaces',
    description:
      'List all workspaces you have access to. Shows workspace name, slug, number of projects, and your role.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'kanbu_get_workspace',
    description:
      'Get details of a specific workspace including its projects. Requires workspace ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Workspace ID',
        },
      },
      required: ['id'],
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List all accessible workspaces
 */
export async function handleListWorkspaces(_args: unknown) {
  const config = requireAuth();

  const workspaces = await client.call<Workspace[]>(
    config.kanbuUrl,
    config.token,
    'workspace.list',
    {}
  );

  if (workspaces.length === 0) {
    return success('No workspaces found. You may not have access to any workspaces yet.');
  }

  const lines: string[] = [`Workspaces (${workspaces.length}):`, ''];

  workspaces.forEach((ws, index) => {
    lines.push(`${index + 1}. ${ws.name}`);
    lines.push(`   ID: ${ws.id} | Slug: ${ws.slug}`);
    if (ws._count) {
      lines.push(`   Projects: ${ws._count.projects} | Members: ${ws._count.members}`);
    }
    if (ws.role) {
      lines.push(`   Your role: ${ws.role}`);
    }
    if (ws.description) {
      lines.push(`   ${ws.description}`);
    }
    lines.push('');
  });

  return success(lines.join('\n'));
}

/**
 * Get workspace details with projects
 */
export async function handleGetWorkspace(args: unknown) {
  const { id } = GetWorkspaceSchema.parse(args);
  const config = requireAuth();

  interface WorkspaceWithProjects extends Workspace {
    projects: Array<{
      id: number;
      name: string;
      slug: string;
      prefix: string;
      _count?: { tasks: number };
    }>;
    members: Array<{
      id: number;
      role: string;
      user: { id: number; name: string; email: string };
    }>;
  }

  const workspace = await client.call<WorkspaceWithProjects>(
    config.kanbuUrl,
    config.token,
    'workspace.get',
    { workspaceId: id }
  );

  const lines: string[] = [
    `Workspace: ${workspace.name}`,
    `ID: ${workspace.id} | Slug: ${workspace.slug}`,
    '',
  ];

  if (workspace.description) {
    lines.push(`Description: ${workspace.description}`);
    lines.push('');
  }

  if (workspace.projects && workspace.projects.length > 0) {
    lines.push(`Projects (${workspace.projects.length}):`);
    workspace.projects.forEach((project) => {
      const taskCount = project._count?.tasks ?? 0;
      lines.push(`  - ${project.name} (${project.prefix}) - ${taskCount} tasks`);
    });
    lines.push('');
  } else {
    lines.push('No projects in this workspace.');
    lines.push('');
  }

  if (workspace.members && workspace.members.length > 0) {
    lines.push(`Members (${workspace.members.length}):`);
    workspace.members.slice(0, 10).forEach((member) => {
      lines.push(`  - ${member.user.name} (${member.role})`);
    });
    if (workspace.members.length > 10) {
      lines.push(`  ... and ${workspace.members.length - 10} more`);
    }
  }

  return success(lines.join('\n'));
}
