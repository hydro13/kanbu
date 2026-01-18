/*
 * ACL Management Tools
 * Version: 1.0.0
 *
 * MCP tools for Access Control List management.
 * Supports NTFS-style RWXDP permissions with inheritance.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 8 - ACL Manager
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { requireAuth, client, success, error } from '../tools.js';

// =============================================================================
// Types
// =============================================================================

interface AclEntryResponse {
  id: number;
  resourceType: string;
  resourceId: number | null;
  principalType: 'user' | 'group';
  principalId: number;
  permissions: number;
  deny: boolean;
  inheritToChildren: boolean;
  createdAt: string;
  createdBy: { id: number; username: string; name: string } | null;
  principalName: string;
  principalDisplayName: string;
  permissionNames: string[];
  presetName: string | null;
}

interface CheckPermissionResponse {
  allowed: boolean;
  effectivePermissions: number;
  deniedPermissions: number;
  effectivePermissionNames: string[];
  deniedPermissionNames: string[];
  presetName: string | null;
  entries: Array<{
    id: number;
    source: 'direct' | 'group' | 'inherited';
    permissions: number;
    deny: boolean;
  }>;
}

interface MyPermissionResponse {
  allowed: boolean;
  effectivePermissions: number;
  deniedPermissions: number;
  effectivePermissionNames: string[];
  deniedPermissionNames: string[];
  presetName: string | null;
  canRead: boolean;
  canWrite: boolean;
  canExecute: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
}

interface PrincipalsResponse {
  users: Array<{
    id: number;
    type: 'user';
    name: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
  }>;
  groups: Array<{
    id: number;
    type: 'group';
    name: string;
    displayName: string;
    groupType: string;
    workspaceId: number | null;
    memberCount: number;
  }>;
}

interface ResourcesResponse {
  resourceTypes: Array<{ type: string; label: string; supportsRoot: boolean }>;
  workspaces: Array<{ id: number; name: string; slug: string; resourceType: 'workspace' }>;
  projects: Array<{
    id: number;
    name: string;
    identifier: string;
    workspaceId: number;
    workspaceName: string;
    resourceType: 'project';
  }>;
  features: Array<{
    id: number;
    scope: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    sortOrder: number;
    resourceType: 'feature';
  }>;
}

interface PresetsResponse {
  permissions: {
    READ: number;
    WRITE: number;
    EXECUTE: number;
    DELETE: number;
    PERMISSIONS: number;
  };
  presets: {
    NONE: { value: number; label: string; description: string };
    READ_ONLY: { value: number; label: string; description: string };
    CONTRIBUTOR: { value: number; label: string; description: string };
    EDITOR: { value: number; label: string; description: string };
    FULL_CONTROL: { value: number; label: string; description: string };
  };
}

interface PermissionMatrixResponse {
  principals: Array<{ type: 'user' | 'group'; id: number; name: string; displayName: string }>;
  resources: Array<{ type: string; id: number | null; name: string; path: string }>;
  cells: Array<{
    principalType: string;
    principalId: number;
    resourceType: string;
    resourceId: number | null;
    effectivePermissions: number;
    isDirect: boolean;
    isDenied: boolean;
    inheritedFrom?: string;
  }>;
  totals: { principals: number; resources: number };
}

interface CalculateEffectiveResponse {
  user: { id: number; username: string; name: string; email: string };
  resource: { type: string; id: number | null; name: string; path: string };
  effectivePermissions: number;
  effectivePreset: string | null;
  directEntries: Array<{
    id: number;
    permissions: number;
    presetName: string | null;
    deny: boolean;
    inheritToChildren: boolean;
  }>;
  groupEntries: Array<{
    groupId: number;
    groupName: string;
    permissions: number;
    presetName: string | null;
    deny: boolean;
  }>;
  inheritedEntries: Array<{
    fromResourceType: string;
    fromResourceId: number | null;
    fromResourceName: string;
    permissions: number;
    presetName: string | null;
    deny: boolean;
    source: 'user' | 'group';
    groupName?: string;
  }>;
  calculation: { allowedBits: number; deniedBits: number; finalBits: number; formula: string };
}

interface SimulateChangeResponse {
  changes: Array<{
    principal: { type: string; id: number; name: string };
    before: { permissions: number; presetName: string | null; deny: boolean } | null;
    after: { permissions: number; presetName: string | null; deny: boolean } | null;
    impact: 'new' | 'upgraded' | 'downgraded' | 'unchanged' | 'removed';
    bitsDiff: number;
  }>;
  summary: {
    new: number;
    upgraded: number;
    downgraded: number;
    unchanged: number;
    removed: number;
  };
  warnings: string[];
}

interface ExportResponse {
  format: 'json' | 'csv';
  data: string;
}

interface BulkResponse {
  success: number;
  failed: number;
}

interface CopyResponse {
  copiedCount: number;
  skippedCount: number;
}

interface SimpleResponse {
  success: boolean;
  message?: string;
}

// =============================================================================
// Schemas
// =============================================================================

const ResourceTypeSchema = z.enum([
  'root',
  'system',
  'dashboard',
  'workspace',
  'project',
  'feature',
  'admin',
  'profile',
]);
const PrincipalTypeSchema = z.enum(['user', 'group']);

export const ListAclSchema = z.object({
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID (null for root)'),
});

export const CheckPermissionSchema = z.object({
  userId: z.number().describe('User ID to check'),
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID (null for root)'),
});

export const MyPermissionSchema = z.object({
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID (null for root)'),
});

export const GrantPermissionSchema = z.object({
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID (null for root)'),
  principalType: PrincipalTypeSchema.describe('Principal type'),
  principalId: z.number().describe('Principal ID'),
  permissions: z.number().min(0).max(31).describe('Permission bitmask (0-31)'),
  inheritToChildren: z.boolean().optional().describe('Inherit to child resources (default true)'),
});

export const DenyPermissionSchema = z.object({
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID (null for root)'),
  principalType: PrincipalTypeSchema.describe('Principal type'),
  principalId: z.number().describe('Principal ID'),
  permissions: z.number().min(0).max(31).describe('Permission bitmask to deny'),
  inheritToChildren: z.boolean().optional().describe('Inherit to child resources (default true)'),
});

export const RevokePermissionSchema = z.object({
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID (null for root)'),
  principalType: PrincipalTypeSchema.describe('Principal type'),
  principalId: z.number().describe('Principal ID'),
});

export const UpdateAclSchema = z.object({
  id: z.number().describe('ACL entry ID'),
  permissions: z.number().min(0).max(31).describe('New permission bitmask'),
  inheritToChildren: z.boolean().optional().describe('Inherit to children'),
});

export const DeleteAclSchema = z.object({
  id: z.number().describe('ACL entry ID to delete'),
  dryRun: z.boolean().optional().describe('Simulate the action without applying changes'),
});

export const BulkGrantSchema = z.object({
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID (null for root)'),
  principals: z
    .array(
      z.object({
        type: PrincipalTypeSchema,
        id: z.number(),
      })
    )
    .min(1)
    .max(100)
    .describe('Principals to grant permissions to'),
  permissions: z.number().min(0).max(31).describe('Permission bitmask'),
  inheritToChildren: z.boolean().optional().describe('Inherit to children'),
});

export const BulkRevokeSchema = z.object({
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID (null for root)'),
  principals: z
    .array(
      z.object({
        type: PrincipalTypeSchema,
        id: z.number(),
      })
    )
    .min(1)
    .max(100)
    .describe('Principals to revoke permissions from'),
  dryRun: z.boolean().optional().describe('Simulate the action without applying changes'),
});

export const CopyPermissionsSchema = z.object({
  sourceResourceType: ResourceTypeSchema.describe('Source resource type'),
  sourceResourceId: z.number().nullable().describe('Source resource ID'),
  targetResources: z
    .array(
      z.object({
        type: ResourceTypeSchema,
        id: z.number().nullable(),
      })
    )
    .min(1)
    .max(50)
    .describe('Target resources'),
  overwrite: z.boolean().optional().describe('Overwrite existing entries'),
});

export const ApplyTemplateSchema = z.object({
  templateName: z
    .enum(['read_only', 'contributor', 'editor', 'full_control'])
    .describe('Template name'),
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID (null for root)'),
  principals: z
    .array(
      z.object({
        type: PrincipalTypeSchema,
        id: z.number(),
      })
    )
    .min(1)
    .max(100)
    .describe('Principals to apply template to'),
  inheritToChildren: z.boolean().optional().describe('Inherit to children'),
});

export const GetPrincipalsSchema = z.object({
  workspaceId: z.number().optional().describe('Filter groups by workspace'),
  search: z.string().optional().describe('Search in names'),
});

export const PermissionMatrixSchema = z.object({
  resourceTypes: z.array(ResourceTypeSchema).optional().describe('Filter by resource types'),
  workspaceId: z.number().optional().describe('Filter by workspace'),
  includeInherited: z.boolean().optional().describe('Include inherited permissions'),
  principalTypes: z.array(PrincipalTypeSchema).optional().describe('Filter by principal types'),
  limit: z.number().optional().describe('Max principals (default 50)'),
  offset: z.number().optional().describe('Pagination offset'),
});

export const CalculateEffectiveSchema = z.object({
  userId: z.number().describe('User ID'),
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID'),
});

export const SimulateChangeSchema = z.object({
  action: z.enum(['grant', 'deny', 'revoke', 'template']).describe('Action to simulate'),
  resourceType: ResourceTypeSchema.describe('Resource type'),
  resourceId: z.number().nullable().describe('Resource ID'),
  principals: z
    .array(
      z.object({
        type: PrincipalTypeSchema,
        id: z.number(),
      })
    )
    .min(1)
    .max(100)
    .describe('Principals'),
  permissions: z.number().optional().describe('Permission bitmask (for grant/deny)'),
  templateName: z
    .enum(['read_only', 'contributor', 'editor', 'full_control'])
    .optional()
    .describe('Template name (for template action)'),
});

export const ExportAclSchema = z.object({
  resourceType: ResourceTypeSchema.optional().describe('Resource type filter'),
  resourceId: z.number().nullable().optional().describe('Resource ID filter'),
  format: z.enum(['json', 'csv']).describe('Export format'),
  includeChildren: z.boolean().optional().describe('Include child resources'),
});

export const ImportAclSchema = z.object({
  data: z.string().describe('ACL data (JSON or CSV)'),
  format: z.enum(['json', 'csv']).describe('Data format'),
  mode: z.enum(['skip', 'overwrite', 'merge']).describe('Import mode'),
});

// =============================================================================
// Tool Definitions
// =============================================================================

export const aclToolDefinitions = [
  // Query Tools
  {
    name: 'kanbu_list_acl',
    description: 'List ACL entries for a resource. Shows who has what permissions.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID (null for root)' },
      },
      required: ['resourceType', 'resourceId'],
    },
  },
  {
    name: 'kanbu_check_permission',
    description:
      'Check effective permissions for a user on a resource. Shows the permission calculation breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID to check' },
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID (null for root)' },
      },
      required: ['userId', 'resourceType', 'resourceId'],
    },
  },
  {
    name: 'kanbu_my_permission',
    description:
      'Get your effective permissions on a resource. Quick way to check what you can do.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID (null for root)' },
      },
      required: ['resourceType', 'resourceId'],
    },
  },
  {
    name: 'kanbu_get_principals',
    description: 'Get all users and groups that can be assigned permissions.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Filter groups by workspace' },
        search: { type: 'string', description: 'Search in names' },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_get_resources',
    description: 'Get all resources that can have ACLs (workspaces, projects, features).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_get_acl_presets',
    description: 'Get available permission presets and their bitmask values.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_get_permission_matrix',
    description: 'Get a matrix view of principals x resources with their effective permissions.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by resource types',
        },
        workspaceId: { type: 'number', description: 'Filter by workspace' },
        includeInherited: { type: 'boolean', description: 'Include inherited permissions' },
        principalTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by principal types (user, group)',
        },
        limit: { type: 'number', description: 'Max principals (default 50)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_calculate_effective',
    description:
      'Calculate effective permissions with detailed breakdown. Shows direct, group, and inherited entries.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID' },
      },
      required: ['userId', 'resourceType', 'resourceId'],
    },
  },

  // Management Tools
  {
    name: 'kanbu_grant_permission',
    description:
      'Grant permissions to a user or group on a resource. Requires P (manage permissions) on the resource.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID (null for root)' },
        principalType: { type: 'string', enum: ['user', 'group'], description: 'Principal type' },
        principalId: { type: 'number', description: 'Principal ID' },
        permissions: {
          type: 'number',
          description:
            'Permission bitmask (1=R, 2=W, 4=X, 8=D, 16=P, or presets: 1=Read, 7=Contributor, 15=Editor, 31=Full)',
        },
        inheritToChildren: {
          type: 'boolean',
          description: 'Inherit to child resources (default true)',
        },
      },
      required: ['resourceType', 'resourceId', 'principalType', 'principalId', 'permissions'],
    },
  },
  {
    name: 'kanbu_deny_permission',
    description:
      'Deny specific permissions to a user or group. Deny entries override grants (like NTFS).',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID (null for root)' },
        principalType: { type: 'string', enum: ['user', 'group'], description: 'Principal type' },
        principalId: { type: 'number', description: 'Principal ID' },
        permissions: { type: 'number', description: 'Permission bitmask to deny' },
        inheritToChildren: {
          type: 'boolean',
          description: 'Inherit to child resources (default true)',
        },
      },
      required: ['resourceType', 'resourceId', 'principalType', 'principalId', 'permissions'],
    },
  },
  {
    name: 'kanbu_revoke_permission',
    description: 'Remove all ACL entries for a principal on a resource.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID (null for root)' },
        principalType: { type: 'string', enum: ['user', 'group'], description: 'Principal type' },
        principalId: { type: 'number', description: 'Principal ID' },
      },
      required: ['resourceType', 'resourceId', 'principalType', 'principalId'],
    },
  },
  {
    name: 'kanbu_update_acl',
    description: 'Update an existing ACL entry by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ACL entry ID' },
        permissions: { type: 'number', description: 'New permission bitmask (0-31)' },
        inheritToChildren: { type: 'boolean', description: 'Inherit to children' },
      },
      required: ['id', 'permissions'],
    },
  },
  {
    name: 'kanbu_delete_acl',
    description: 'Delete a specific ACL entry by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ACL entry ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_bulk_grant',
    description: 'Grant permissions to multiple principals at once.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID (null for root)' },
        principals: {
          type: 'array',
          items: {
            type: 'object',
            properties: { type: { type: 'string' }, id: { type: 'number' } },
          },
          description: 'Principals [{type, id}, ...]',
        },
        permissions: { type: 'number', description: 'Permission bitmask' },
        inheritToChildren: { type: 'boolean', description: 'Inherit to children' },
      },
      required: ['resourceType', 'resourceId', 'principals', 'permissions'],
    },
  },
  {
    name: 'kanbu_bulk_revoke',
    description: 'Revoke permissions from multiple principals at once.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID (null for root)' },
        principals: {
          type: 'array',
          items: {
            type: 'object',
            properties: { type: { type: 'string' }, id: { type: 'number' } },
          },
          description: 'Principals [{type, id}, ...]',
        },
      },
      required: ['resourceType', 'resourceId', 'principals'],
    },
  },
  {
    name: 'kanbu_copy_permissions',
    description: 'Copy ACL entries from one resource to other resources.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceResourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Source resource type',
        },
        sourceResourceId: { type: ['number', 'null'], description: 'Source resource ID' },
        targetResources: {
          type: 'array',
          items: {
            type: 'object',
            properties: { type: { type: 'string' }, id: { type: ['number', 'null'] } },
          },
          description: 'Target resources [{type, id}, ...]',
        },
        overwrite: { type: 'boolean', description: 'Overwrite existing entries' },
      },
      required: ['sourceResourceType', 'sourceResourceId', 'targetResources'],
    },
  },
  {
    name: 'kanbu_apply_template',
    description:
      'Apply a permission template (read_only, contributor, editor, full_control) to multiple principals.',
    inputSchema: {
      type: 'object',
      properties: {
        templateName: {
          type: 'string',
          enum: ['read_only', 'contributor', 'editor', 'full_control'],
          description: 'Template name',
        },
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID (null for root)' },
        principals: {
          type: 'array',
          items: {
            type: 'object',
            properties: { type: { type: 'string' }, id: { type: 'number' } },
          },
          description: 'Principals [{type, id}, ...]',
        },
        inheritToChildren: { type: 'boolean', description: 'Inherit to children' },
      },
      required: ['templateName', 'resourceType', 'resourceId', 'principals'],
    },
  },
  {
    name: 'kanbu_simulate_change',
    description: 'Preview what would happen if an ACL change is applied. Use for What-If analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['grant', 'deny', 'revoke', 'template'],
          description: 'Action to simulate',
        },
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID' },
        principals: {
          type: 'array',
          items: {
            type: 'object',
            properties: { type: { type: 'string' }, id: { type: 'number' } },
          },
          description: 'Principals',
        },
        permissions: { type: 'number', description: 'Permission bitmask (for grant/deny)' },
        templateName: {
          type: 'string',
          enum: ['read_only', 'contributor', 'editor', 'full_control'],
          description: 'Template name (for template action)',
        },
      },
      required: ['action', 'resourceType', 'resourceId', 'principals'],
    },
  },
  {
    name: 'kanbu_export_acl',
    description: 'Export ACL configuration to JSON or CSV format.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          enum: [
            'root',
            'system',
            'dashboard',
            'workspace',
            'project',
            'feature',
            'admin',
            'profile',
          ],
          description: 'Resource type filter (optional)',
        },
        resourceId: { type: ['number', 'null'], description: 'Resource ID filter (optional)' },
        format: { type: 'string', enum: ['json', 'csv'], description: 'Export format' },
        includeChildren: { type: 'boolean', description: 'Include child resources' },
      },
      required: ['format'],
    },
  },
  {
    name: 'kanbu_import_acl',
    description: 'Import ACL configuration from JSON or CSV. Domain Admins only.',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'ACL data (JSON or CSV string)' },
        format: { type: 'string', enum: ['json', 'csv'], description: 'Data format' },
        mode: {
          type: 'string',
          enum: ['skip', 'overwrite', 'merge'],
          description: 'Import mode: skip existing, overwrite, or merge',
        },
      },
      required: ['data', 'format', 'mode'],
    },
  },
];

// =============================================================================
// Helpers
// =============================================================================

function permissionBitsToString(bits: number): string {
  const parts: string[] = [];
  if (bits & 1) parts.push('R');
  if (bits & 2) parts.push('W');
  if (bits & 4) parts.push('X');
  if (bits & 8) parts.push('D');
  if (bits & 16) parts.push('P');
  return parts.length > 0 ? `[${parts.join('')}]` : '[-----]';
}

function formatDate(date: string | null): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleString('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List ACL entries for a resource
 */
export async function handleListAcl(args: unknown) {
  const input = ListAclSchema.parse(args);
  const config = requireAuth();

  try {
    const entries = await client.call<AclEntryResponse[]>(
      config.kanbuUrl,
      config.token,
      'acl.list',
      input
    );

    if (entries.length === 0) {
      return success(
        `No ACL entries for ${input.resourceType}${input.resourceId ? ` #${input.resourceId}` : ' (root)'}.`
      );
    }

    const lines: string[] = [
      `ACL Entries for ${input.resourceType}${input.resourceId ? ` #${input.resourceId}` : ' (root)'}`,
      '',
    ];

    // Group by deny/allow
    const denyEntries = entries.filter((e) => e.deny);
    const allowEntries = entries.filter((e) => !e.deny);

    if (denyEntries.length > 0) {
      lines.push('== DENY Entries ==');
      for (const entry of denyEntries) {
        lines.push(
          `[DENY] ${entry.principalType}:${entry.principalDisplayName} ${permissionBitsToString(entry.permissions)}`
        );
        lines.push(
          `   Preset: ${entry.presetName ?? 'Custom'} | Inherit: ${entry.inheritToChildren ? 'Yes' : 'No'}`
        );
      }
      lines.push('');
    }

    if (allowEntries.length > 0) {
      lines.push('== ALLOW Entries ==');
      for (const entry of allowEntries) {
        lines.push(
          `${entry.principalType}:${entry.principalDisplayName} ${permissionBitsToString(entry.permissions)}`
        );
        lines.push(
          `   ID: ${entry.id} | Preset: ${entry.presetName ?? 'Custom'} | Inherit: ${entry.inheritToChildren ? 'Yes' : 'No'}`
        );
      }
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to list ACL entries: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Check permission for a user
 */
export async function handleCheckPermission(args: unknown) {
  const input = CheckPermissionSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<CheckPermissionResponse>(
      config.kanbuUrl,
      config.token,
      'acl.checkPermission',
      input
    );

    const lines: string[] = [
      `Permission Check for User #${input.userId}`,
      `Resource: ${input.resourceType}${input.resourceId ? ` #${input.resourceId}` : ' (root)'}`,
      '',
      `Access: ${result.allowed ? 'ALLOWED' : 'DENIED'}`,
      `Effective: ${permissionBitsToString(result.effectivePermissions)} (${result.presetName ?? 'Custom'})`,
    ];

    if (result.deniedPermissions > 0) {
      lines.push(`Denied: ${permissionBitsToString(result.deniedPermissions)}`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to check permission: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Get my permission on a resource
 */
export async function handleMyPermission(args: unknown) {
  const input = MyPermissionSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<MyPermissionResponse>(
      config.kanbuUrl,
      config.token,
      'acl.myPermission',
      input
    );

    const lines: string[] = [
      `Your Permissions on ${input.resourceType}${input.resourceId ? ` #${input.resourceId}` : ' (root)'}`,
      '',
      `Effective: ${permissionBitsToString(result.effectivePermissions)} (${result.presetName ?? 'Custom'})`,
      '',
      '== Capabilities ==',
      `Read: ${result.canRead ? 'Yes' : 'No'}`,
      `Write: ${result.canWrite ? 'Yes' : 'No'}`,
      `Execute: ${result.canExecute ? 'Yes' : 'No'}`,
      `Delete: ${result.canDelete ? 'Yes' : 'No'}`,
      `Manage Permissions: ${result.canManagePermissions ? 'Yes' : 'No'}`,
    ];

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to get your permissions: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Get principals for ACL assignment
 */
export async function handleGetPrincipals(args: unknown) {
  const input = GetPrincipalsSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<PrincipalsResponse>(
      config.kanbuUrl,
      config.token,
      'acl.getPrincipals',
      input
    );

    const lines: string[] = [`Available Principals`, '', `== Users (${result.users.length}) ==`];

    for (const user of result.users.slice(0, 20)) {
      lines.push(`  #${user.id} ${user.displayName} (@${user.name})`);
    }
    if (result.users.length > 20) {
      lines.push(`  ... and ${result.users.length - 20} more`);
    }

    lines.push('');
    lines.push(`== Groups (${result.groups.length}) ==`);
    for (const group of result.groups.slice(0, 20)) {
      lines.push(
        `  #${group.id} ${group.displayName} [${group.groupType}] (${group.memberCount} members)`
      );
    }
    if (result.groups.length > 20) {
      lines.push(`  ... and ${result.groups.length - 20} more`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to get principals: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Get resources for ACL assignment
 */
export async function handleGetResources(_args: unknown) {
  const config = requireAuth();

  try {
    const result = await client.call<ResourcesResponse>(
      config.kanbuUrl,
      config.token,
      'acl.getResources',
      {}
    );

    const lines: string[] = [`Available Resources`, '', `== Resource Types ==`];

    for (const rt of result.resourceTypes) {
      lines.push(`  ${rt.type}: ${rt.label}${rt.supportsRoot ? ' (supports root)' : ''}`);
    }

    lines.push('');
    lines.push(`== Workspaces (${result.workspaces.length}) ==`);
    for (const ws of result.workspaces.slice(0, 10)) {
      lines.push(`  #${ws.id} ${ws.name} (${ws.slug})`);
    }
    if (result.workspaces.length > 10) {
      lines.push(`  ... and ${result.workspaces.length - 10} more`);
    }

    lines.push('');
    lines.push(`== Projects (${result.projects.length}) ==`);
    for (const proj of result.projects.slice(0, 10)) {
      lines.push(
        `  #${proj.id} ${proj.name} (${proj.identifier}) - Workspace: ${proj.workspaceName}`
      );
    }
    if (result.projects.length > 10) {
      lines.push(`  ... and ${result.projects.length - 10} more`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to get resources: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Get ACL presets
 */
export async function handleGetAclPresets(_args: unknown) {
  const config = requireAuth();

  try {
    const result = await client.call<PresetsResponse>(
      config.kanbuUrl,
      config.token,
      'acl.getPresets',
      {}
    );

    const lines: string[] = [
      `Permission Presets`,
      '',
      '== Permission Bits ==',
      `R (Read): ${result.permissions.READ}`,
      `W (Write): ${result.permissions.WRITE}`,
      `X (Execute): ${result.permissions.EXECUTE}`,
      `D (Delete): ${result.permissions.DELETE}`,
      `P (Permissions): ${result.permissions.PERMISSIONS}`,
      '',
      '== Presets ==',
    ];

    for (const [name, preset] of Object.entries(result.presets)) {
      lines.push(`${name}: ${preset.value} = ${permissionBitsToString(preset.value)}`);
      lines.push(`   ${preset.description}`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(`Failed to get presets: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Get permission matrix
 */
export async function handleGetPermissionMatrix(args: unknown) {
  const input = PermissionMatrixSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<PermissionMatrixResponse>(
      config.kanbuUrl,
      config.token,
      'acl.getPermissionMatrix',
      input
    );

    if (result.cells.length === 0) {
      return success('No ACL entries found matching the criteria.');
    }

    const lines: string[] = [
      `Permission Matrix (${result.totals.principals} principals × ${result.totals.resources} resources)`,
      '',
    ];

    // Group cells by principal
    const cellsByPrincipal = new Map<string, typeof result.cells>();
    for (const cell of result.cells) {
      const key = `${cell.principalType}:${cell.principalId}`;
      const existing = cellsByPrincipal.get(key) ?? [];
      existing.push(cell);
      cellsByPrincipal.set(key, existing);
    }

    for (const principal of result.principals) {
      const key = `${principal.type}:${principal.id}`;
      const cells = cellsByPrincipal.get(key) ?? [];

      lines.push(`${principal.type}:${principal.displayName}`);
      for (const cell of cells) {
        const resource = result.resources.find(
          (r) => r.type === cell.resourceType && r.id === cell.resourceId
        );
        const denied = cell.isDenied ? ' [DENIED]' : '';
        const inherited = !cell.isDirect ? ' (inherited)' : '';
        lines.push(
          `  ${resource?.path ?? cell.resourceType}: ${permissionBitsToString(cell.effectivePermissions)}${denied}${inherited}`
        );
      }
      lines.push('');
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to get permission matrix: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate effective permissions
 */
export async function handleCalculateEffective(args: unknown) {
  const input = CalculateEffectiveSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<CalculateEffectiveResponse>(
      config.kanbuUrl,
      config.token,
      'acl.calculateEffective',
      input
    );

    const lines: string[] = [
      `Effective Permissions Calculator`,
      '',
      `User: ${result.user.name} (@${result.user.username})`,
      `Resource: ${result.resource.path}`,
      '',
      `== RESULT ==`,
      `Effective: ${permissionBitsToString(result.effectivePermissions)} (${result.effectivePreset ?? 'Custom'})`,
      '',
    ];

    if (result.directEntries.length > 0) {
      lines.push('== Direct Entries ==');
      for (const entry of result.directEntries) {
        const deny = entry.deny ? '[DENY] ' : '';
        lines.push(
          `  ${deny}${permissionBitsToString(entry.permissions)} (${entry.presetName ?? 'Custom'})`
        );
      }
      lines.push('');
    }

    if (result.groupEntries.length > 0) {
      lines.push('== Via Groups ==');
      for (const entry of result.groupEntries) {
        const deny = entry.deny ? '[DENY] ' : '';
        lines.push(`  ${deny}${entry.groupName}: ${permissionBitsToString(entry.permissions)}`);
      }
      lines.push('');
    }

    if (result.inheritedEntries.length > 0) {
      lines.push('== Inherited ==');
      for (const entry of result.inheritedEntries) {
        const deny = entry.deny ? '[DENY] ' : '';
        const via = entry.groupName ? ` via ${entry.groupName}` : '';
        lines.push(
          `  ${deny}From ${entry.fromResourceName}: ${permissionBitsToString(entry.permissions)}${via}`
        );
      }
      lines.push('');
    }

    lines.push('== Calculation ==');
    lines.push(`Formula: ${result.calculation.formula}`);
    lines.push(`Allow bits: ${result.calculation.allowedBits}`);
    lines.push(`Deny bits: ${result.calculation.deniedBits}`);
    lines.push(`Final: ${result.calculation.finalBits}`);

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to calculate effective permissions: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Grant permission
 */
export async function handleGrantPermission(args: unknown) {
  const input = GrantPermissionSchema.parse(args);
  const config = requireAuth();

  try {
    await client.call<SimpleResponse>(config.kanbuUrl, config.token, 'acl.grant', input);

    return success(
      [
        `Permission granted!`,
        '',
        `Resource: ${input.resourceType}${input.resourceId ? ` #${input.resourceId}` : ' (root)'}`,
        `Principal: ${input.principalType} #${input.principalId}`,
        `Permissions: ${permissionBitsToString(input.permissions)}`,
        `Inherit: ${input.inheritToChildren !== false ? 'Yes' : 'No'}`,
      ].join('\n')
    );
  } catch (err) {
    return error(
      `Failed to grant permission: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Deny permission
 */
export async function handleDenyPermission(args: unknown) {
  const input = DenyPermissionSchema.parse(args);
  const config = requireAuth();

  try {
    await client.call<SimpleResponse>(config.kanbuUrl, config.token, 'acl.deny', input);

    return success(
      [
        `Permission denied (DENY entry created)!`,
        '',
        `Resource: ${input.resourceType}${input.resourceId ? ` #${input.resourceId}` : ' (root)'}`,
        `Principal: ${input.principalType} #${input.principalId}`,
        `Denied: ${permissionBitsToString(input.permissions)}`,
        `Inherit: ${input.inheritToChildren !== false ? 'Yes' : 'No'}`,
      ].join('\n')
    );
  } catch (err) {
    return error(
      `Failed to deny permission: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Revoke permission
 */
export async function handleRevokePermission(args: unknown) {
  const input = RevokePermissionSchema.parse(args);
  const config = requireAuth();

  try {
    await client.call<SimpleResponse>(config.kanbuUrl, config.token, 'acl.revoke', input);

    return success(
      [
        `Permission revoked!`,
        '',
        `Resource: ${input.resourceType}${input.resourceId ? ` #${input.resourceId}` : ' (root)'}`,
        `Principal: ${input.principalType} #${input.principalId}`,
        `All ACL entries for this principal on this resource have been removed.`,
      ].join('\n')
    );
  } catch (err) {
    return error(
      `Failed to revoke permission: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Update ACL entry
 */
export async function handleUpdateAcl(args: unknown) {
  const input = UpdateAclSchema.parse(args);
  const config = requireAuth();

  try {
    await client.call<SimpleResponse>(config.kanbuUrl, config.token, 'acl.update', input);

    return success(
      `ACL entry #${input.id} updated to ${permissionBitsToString(input.permissions)}.`
    );
  } catch (err) {
    return error(
      `Failed to update ACL entry: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete ACL entry
 */
export async function handleDeleteAcl(args: unknown) {
  const input = DeleteAclSchema.parse(args);
  const config = requireAuth();

  if (input.dryRun) {
    // Ideally we would fetch the entry to show what would be deleted, but for now a summary is sufficient
    return success(`[DRY RUN] Would delete ACL entry #${input.id}. No changes made.`);
  }

  try {
    await client.call<SimpleResponse>(config.kanbuUrl, config.token, 'acl.delete', input);

    return success(`ACL entry #${input.id} deleted.`);
  } catch (err) {
    return error(
      `Failed to delete ACL entry: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Bulk grant permissions
 */
export async function handleBulkGrant(args: unknown) {
  const input = BulkGrantSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<BulkResponse>(
      config.kanbuUrl,
      config.token,
      'acl.bulkGrant',
      input
    );

    return success(
      [
        `Bulk grant completed!`,
        '',
        `Success: ${result.success}`,
        `Failed: ${result.failed}`,
        `Total: ${input.principals.length}`,
      ].join('\n')
    );
  } catch (err) {
    return error(`Failed to bulk grant: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Bulk revoke permissions
 */
export async function handleBulkRevoke(args: unknown) {
  const input = BulkRevokeSchema.parse(args);
  const config = requireAuth();

  if (input.dryRun) {
    return success(
      `[DRY RUN] Would revoke permissions for ${input.principals.length} principals on ${input.resourceType}${input.resourceId ? ` #${input.resourceId}` : ''}. No changes made.`
    );
  }

  try {
    const result = await client.call<BulkResponse>(
      config.kanbuUrl,
      config.token,
      'acl.bulkRevoke',
      input
    );

    return success(
      [
        `Bulk revoke completed!`,
        '',
        `Success: ${result.success}`,
        `Failed: ${result.failed}`,
        `Total: ${input.principals.length}`,
      ].join('\n')
    );
  } catch (err) {
    return error(`Failed to bulk revoke: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Copy permissions
 */
export async function handleCopyPermissions(args: unknown) {
  const input = CopyPermissionsSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<CopyResponse>(
      config.kanbuUrl,
      config.token,
      'acl.copyPermissions',
      input
    );

    return success(
      [
        `Copy permissions completed!`,
        '',
        `Copied: ${result.copiedCount}`,
        `Skipped: ${result.skippedCount}`,
        `Target resources: ${input.targetResources.length}`,
      ].join('\n')
    );
  } catch (err) {
    return error(
      `Failed to copy permissions: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Apply template
 */
export async function handleApplyTemplate(args: unknown) {
  const input = ApplyTemplateSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<BulkResponse>(
      config.kanbuUrl,
      config.token,
      'acl.applyTemplate',
      input
    );

    return success(
      [
        `Template "${input.templateName}" applied!`,
        '',
        `Success: ${result.success}`,
        `Failed: ${result.failed}`,
        `Total principals: ${input.principals.length}`,
      ].join('\n')
    );
  } catch (err) {
    return error(
      `Failed to apply template: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Simulate ACL change
 */
export async function handleSimulateChange(args: unknown) {
  const input = SimulateChangeSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<SimulateChangeResponse>(
      config.kanbuUrl,
      config.token,
      'acl.simulateChange',
      input
    );

    const lines: string[] = [`What-If Simulation: ${input.action}`, '', '== Changes =='];

    for (const change of result.changes) {
      const before = change.before ? permissionBitsToString(change.before.permissions) : 'none';
      const after = change.after ? permissionBitsToString(change.after.permissions) : 'none';
      lines.push(`${change.principal.type}:${change.principal.name}`);
      lines.push(`  ${before} -> ${after} [${change.impact.toUpperCase()}]`);
    }

    lines.push('');
    lines.push('== Summary ==');
    lines.push(`New: ${result.summary.new}`);
    lines.push(`Upgraded: ${result.summary.upgraded}`);
    lines.push(`Downgraded: ${result.summary.downgraded}`);
    lines.push(`Unchanged: ${result.summary.unchanged}`);
    lines.push(`Removed: ${result.summary.removed}`);

    if (result.warnings.length > 0) {
      lines.push('');
      lines.push('== Warnings ==');
      for (const warning of result.warnings) {
        lines.push(`! ${warning}`);
      }
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(
      `Failed to simulate change: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Export ACL
 */
export async function handleExportAcl(args: unknown) {
  const input = ExportAclSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<ExportResponse>(
      config.kanbuUrl,
      config.token,
      'acl.exportAcl',
      input
    );

    const lines: string[] = [
      `ACL Export (${input.format.toUpperCase()})`,
      '',
      '== Data ==',
      result.data.slice(0, 2000), // Truncate if too long
    ];

    if (result.data.length > 2000) {
      lines.push('');
      lines.push(`... (${result.data.length - 2000} more characters)`);
    }

    return success(lines.join('\n'));
  } catch (err) {
    return error(`Failed to export ACL: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Import ACL
 */
export async function handleImportAcl(args: unknown) {
  const input = ImportAclSchema.parse(args);
  const config = requireAuth();

  try {
    const result = await client.call<{ created: number; updated: number; skipped: number }>(
      config.kanbuUrl,
      config.token,
      'acl.importExecute',
      input
    );

    return success(
      [
        `ACL Import completed!`,
        '',
        `Created: ${result.created}`,
        `Updated: ${result.updated}`,
        `Skipped: ${result.skipped}`,
      ].join('\n')
    );
  } catch (err) {
    return error(`Failed to import ACL: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
