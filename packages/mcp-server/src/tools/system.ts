/*
 * System Settings & Backup Tools
 * Version: 1.0.0
 *
 * MCP tools for system settings, backups, and admin workspace management.
 * Requires Domain Admin privileges.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 11 - System Settings & Backup
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { requireAuth, client, success, error } from '../tools.js';

// =============================================================================
// Types
// =============================================================================

interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SettingsListResponse {
  settings: SystemSetting[];
}

interface BackupResponse {
  success: boolean;
  fileName: string;
  timestamp: string;
  fileSizeKB?: number;
  fileSizeMB?: number;
  backupsKept: number;
  message: string;
  instructions?: string[];
}

interface AdminWorkspace {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  projectCount?: number;
  owner?: {
    id: number;
    name: string;
    email: string;
  };
  stats?: {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
  };
}

interface AdminWorkspaceListResponse {
  workspaces: AdminWorkspace[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// =============================================================================
// Schemas
// =============================================================================

export const GetSettingsSchema = z.object({});

export const GetSettingSchema = z.object({
  key: z.string().describe('Setting key'),
});

export const SetSettingSchema = z.object({
  key: z.string().min(1).max(100).describe('Setting key'),
  value: z.string().nullable().describe('Setting value (null to clear)'),
  description: z.string().optional().describe('Optional description'),
});

export const SetSettingsSchema = z.object({
  settings: z.record(z.string(), z.string().nullable()).describe('Key-value pairs of settings'),
});

export const DeleteSettingSchema = z.object({
  key: z.string().describe('Setting key to delete'),
});

export const AdminListWorkspacesSchema = z.object({
  search: z.string().optional().describe('Search in name/slug'),
  isActive: z.boolean().optional().describe('Filter by active status'),
  limit: z.number().optional().describe('Max results (default 50)'),
  offset: z.number().optional().describe('Pagination offset'),
});

export const AdminWorkspaceIdSchema = z.object({
  workspaceId: z.number().describe('Workspace ID'),
});

export const AdminUpdateWorkspaceSchema = z.object({
  workspaceId: z.number().describe('Workspace ID'),
  name: z.string().min(1).max(255).optional().describe('Workspace name'),
  description: z.string().max(2000).nullable().optional().describe('Description'),
  logoUrl: z.string().url().max(500).nullable().optional().describe('Logo URL'),
  isActive: z.boolean().optional().describe('Active status'),
});

// =============================================================================
// Tool Definitions
// =============================================================================

export const systemToolDefinitions = [
  // Settings Tools
  {
    name: 'kanbu_get_settings',
    description: 'Get all system settings. Domain Admin only.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_get_setting',
    description: 'Get a single system setting by key.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Setting key' },
      },
      required: ['key'],
    },
  },
  {
    name: 'kanbu_set_setting',
    description: 'Set a system setting. Creates if not exists, updates if exists.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Setting key (max 100 chars)' },
        value: { type: ['string', 'null'], description: 'Setting value (null to clear)' },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'kanbu_set_settings',
    description: 'Set multiple system settings at once.',
    inputSchema: {
      type: 'object',
      properties: {
        settings: { type: 'object', description: 'Key-value pairs of settings' },
      },
      required: ['settings'],
    },
  },
  {
    name: 'kanbu_delete_setting',
    description: 'Delete a system setting.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Setting key to delete' },
      },
      required: ['key'],
    },
  },

  // Backup Tools
  {
    name: 'kanbu_create_db_backup',
    description: 'Create a database backup and save to Google Drive. Keeps last 10 backups.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_create_source_backup',
    description:
      'Create a full source code backup to Google Drive. Includes everything needed to deploy Kanbu. Keeps last 5 backups.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // Admin Workspace Tools
  {
    name: 'kanbu_admin_list_workspaces',
    description:
      'List all workspaces (admin view). Domain Admins see all, Workspace Admins see only their workspaces.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search in name/slug' },
        isActive: { type: 'boolean', description: 'Filter by active status' },
        limit: { type: 'number', description: 'Max results (default 50)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_admin_get_workspace',
    description:
      'Get detailed workspace information (admin view). Includes member count, project count, and stats.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Workspace ID' },
      },
      required: ['workspaceId'],
    },
  },
  {
    name: 'kanbu_admin_update_workspace',
    description:
      'Update workspace properties. Domain Admins can update any, Workspace Admins only their own.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Workspace ID' },
        name: { type: 'string', description: 'New name' },
        description: { type: ['string', 'null'], description: 'Description' },
        logoUrl: { type: ['string', 'null'], description: 'Logo URL' },
        isActive: { type: 'boolean', description: 'Active status' },
      },
      required: ['workspaceId'],
    },
  },
  {
    name: 'kanbu_admin_delete_workspace',
    description: 'Deactivate a workspace (soft delete). Domain Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Workspace ID' },
      },
      required: ['workspaceId'],
    },
  },
  {
    name: 'kanbu_admin_reactivate_workspace',
    description: 'Reactivate a deactivated workspace. Domain Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Workspace ID' },
      },
      required: ['workspaceId'],
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

// =============================================================================
// Tool Handlers - Settings
// =============================================================================

/**
 * Get all system settings
 */
export async function handleGetSettings(_args: unknown) {
  const config = requireAuth();

  try {
    const result = await client.call<SystemSetting[]>(
      config.kanbuUrl,
      config.token,
      'admin.getSettings',
      {}
    );

    if (result.length === 0) {
      return success('No system settings configured.');
    }

    const lines: string[] = [`System Settings (${result.length})`, ''];

    for (const setting of result) {
      lines.push(`${setting.key}: ${setting.value ?? '(null)'}`);
      if (setting.description) {
        lines.push(`   ${setting.description}`);
      }
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(`Failed to get settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Get a single setting
 */
export async function handleGetSetting(args: unknown) {
  const input = GetSettingSchema.parse(args);
  const config = requireAuth();

  try {
    const setting = await client.call<SystemSetting | null>(
      config.kanbuUrl,
      config.token,
      'admin.getSetting',
      { key: input.key }
    );

    if (!setting) {
      return success(`Setting "${input.key}" not found.`);
    }

    const lines: string[] = [
      `Setting: ${setting.key}`,
      '',
      `Value: ${setting.value ?? '(null)'}`,
      `Description: ${setting.description ?? 'N/A'}`,
      `Updated: ${formatDate(setting.updatedAt)}`,
    ];

    return success(lines.join('\n'));
  } catch (err) {
    return error(`Failed to get setting: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Set a system setting
 */
export async function handleSetSetting(args: unknown) {
  const input = SetSettingSchema.parse(args);
  const config = requireAuth();

  try {
    const setting = await client.call<SystemSetting>(
      config.kanbuUrl,
      config.token,
      'admin.setSetting',
      input
    );

    return success(
      [`Setting updated!`, '', `Key: ${setting.key}`, `Value: ${setting.value ?? '(null)'}`].join(
        '\n'
      )
    );
  } catch (err) {
    return error(`Failed to set setting: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Set multiple settings
 */
export async function handleSetSettings(args: unknown) {
  const input = SetSettingsSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<{ updated: number }>(
      config.kanbuUrl,
      config.token,
      'admin.setSettings',
      input
    );

    return success(`Updated ${result.updated} settings.`);
  } catch (err) {
    return error(`Failed to set settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Delete a setting
 */
export async function handleDeleteSetting(args: unknown) {
  const input = DeleteSettingSchema.parse(args);
  const config = requireAuth();

  try {
    await client.call<{ success: boolean }>(config.kanbuUrl, config.token, 'admin.deleteSetting', {
      key: input.key,
    });

    return success(`Setting "${input.key}" deleted.`);
  } catch (err) {
    return error(
      `Failed to delete setting: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

// =============================================================================
// Tool Handlers - Backup
// =============================================================================

/**
 * Create database backup
 */
export async function handleCreateDbBackup(_args: unknown) {
  const config = requireAuth();

  try {
    const result = await client.call<BackupResponse>(
      config.kanbuUrl,
      config.token,
      'admin.createBackup',
      {}
    );

    const lines: string[] = [
      `Database Backup Created!`,
      '',
      `Filename: ${result.fileName}`,
      `Size: ${result.fileSizeKB} KB`,
      `Timestamp: ${result.timestamp}`,
      `Backups kept: ${result.backupsKept}`,
      '',
      `Location: Google Drive (max-backups)`,
    ];

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to create database backup: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Create source backup
 */
export async function handleCreateSourceBackup(_args: unknown) {
  const config = requireAuth();

  try {
    const result = await client.call<BackupResponse>(
      config.kanbuUrl,
      config.token,
      'admin.createSourceBackup',
      {}
    );

    const lines: string[] = [
      `Source Backup Created!`,
      '',
      `Filename: ${result.fileName}`,
      `Size: ${result.fileSizeMB} MB`,
      `Timestamp: ${result.timestamp}`,
      `Backups kept: ${result.backupsKept}`,
      '',
      `Location: Google Drive (max-backups)`,
    ];

    if (result.instructions) {
      lines.push('');
      lines.push('== Deployment Instructions ==');
      for (const instruction of result.instructions) {
        lines.push(instruction);
      }
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to create source backup: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

// =============================================================================
// Tool Handlers - Admin Workspaces
// =============================================================================

/**
 * List all workspaces (admin view)
 */
export async function handleAdminListWorkspaces(args: unknown) {
  const input = AdminListWorkspacesSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<AdminWorkspaceListResponse>(
      config.kanbuUrl,
      config.token,
      'admin.listAllWorkspaces',
      {
        search: input.search,
        isActive: input.isActive,
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
      }
    );

    if (result.workspaces.length === 0) {
      return success('No workspaces found.');
    }

    const lines: string[] = [`Workspaces (${result.total} total)`, ''];

    for (const ws of result.workspaces) {
      const status = ws.isActive ? '✅' : '❌';
      lines.push(`${status} #${ws.id} ${ws.name} (${ws.slug})`);
      if (ws.memberCount !== undefined) {
        lines.push(`   Members: ${ws.memberCount} | Projects: ${ws.projectCount ?? 0}`);
      }
    }

    if (result.hasMore) {
      lines.push('');
      lines.push(
        `Showing ${result.workspaces.length} of ${result.total}. Use offset=${result.offset + result.limit} for more.`
      );
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to list workspaces: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Get workspace details (admin view)
 */
export async function handleAdminGetWorkspace(args: unknown) {
  const input = AdminWorkspaceIdSchema.parse(args);
  const config = requireAuth();

  try {
    const ws = await client.call<AdminWorkspace>(
      config.kanbuUrl,
      config.token,
      'admin.getWorkspace',
      { workspaceId: input.workspaceId }
    );

    const lines: string[] = [
      `Workspace #${ws.id}`,
      '',
      `Name: ${ws.name}`,
      `Slug: ${ws.slug}`,
      `Status: ${ws.isActive ? 'Active' : 'Inactive'}`,
      `Description: ${ws.description ?? 'N/A'}`,
      `Logo: ${ws.logoUrl ?? 'None'}`,
      '',
      `Created: ${formatDate(ws.createdAt)}`,
      `Updated: ${formatDate(ws.updatedAt)}`,
    ];

    if (ws.owner) {
      lines.push('');
      lines.push(`Owner: ${ws.owner.name} (${ws.owner.email})`);
    }

    if (ws.memberCount !== undefined) {
      lines.push('');
      lines.push('== Statistics ==');
      lines.push(`Members: ${ws.memberCount}`);
      lines.push(`Projects: ${ws.projectCount ?? 0}`);
    }

    if (ws.stats) {
      lines.push(`Total Tasks: ${ws.stats.totalTasks}`);
      lines.push(`Completed: ${ws.stats.completedTasks}`);
      lines.push(`Active: ${ws.stats.activeTasks}`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to get workspace: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Update workspace (admin)
 */
export async function handleAdminUpdateWorkspace(args: unknown) {
  const input = AdminUpdateWorkspaceSchema.parse(args);
  const config = requireAuth();

  try {
    const ws = await client.call<AdminWorkspace>(
      config.kanbuUrl,
      config.token,
      'admin.updateWorkspace',
      input
    );

    const lines: string[] = [
      `Workspace updated!`,
      '',
      `ID: ${ws.id}`,
      `Name: ${ws.name}`,
      `Slug: ${ws.slug}`,
      `Status: ${ws.isActive ? 'Active' : 'Inactive'}`,
    ];

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to update workspace: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete (deactivate) workspace
 */
export async function handleAdminDeleteWorkspace(args: unknown) {
  const input = AdminWorkspaceIdSchema.parse(args);
  const config = requireAuth();

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'admin.deleteWorkspace',
      { workspaceId: input.workspaceId }
    );

    return success(`Workspace #${input.workspaceId} has been deactivated.`);
  } catch (err) {
    return error(
      `Failed to delete workspace: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Reactivate workspace
 */
export async function handleAdminReactivateWorkspace(args: unknown) {
  const input = AdminWorkspaceIdSchema.parse(args);
  const config = requireAuth();

  try {
    await client.call<{ success: boolean }>(
      config.kanbuUrl,
      config.token,
      'admin.reactivateWorkspace',
      { workspaceId: input.workspaceId }
    );

    return success(`Workspace #${input.workspaceId} has been reactivated.`);
  } catch (err) {
    return error(
      `Failed to reactivate workspace: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}
