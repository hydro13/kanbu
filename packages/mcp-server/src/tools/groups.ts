/*
 * Groups Management Tools
 * Version: 1.0.0
 *
 * MCP tools for security group management.
 * Supports AD-style groups with privilege escalation prevention.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 7 - Groups Management
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { requireAuth, client, success, error } from '../tools.js'

// =============================================================================
// Types
// =============================================================================

interface GroupListResponse {
  groups: Array<{
    id: number
    name: string
    displayName: string
    description: string | null
    type: 'SYSTEM' | 'WORKSPACE' | 'WORKSPACE_ADMIN' | 'PROJECT' | 'PROJECT_ADMIN' | 'CUSTOM'
    workspaceId: number | null
    projectId: number | null
    source: string
    isSystem: boolean
    isSecurityGroup: boolean
    isActive: boolean
    createdAt: string
    workspace: { id: number; name: string; slug: string } | null
    project: { id: number; name: string; identifier: string } | null
    memberCount: number
    assignmentCount: number
    canManage: boolean
  }>
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

interface GroupDetailResponse {
  id: number
  name: string
  displayName: string
  description: string | null
  type: string
  workspaceId: number | null
  projectId: number | null
  externalId: string | null
  source: string
  isSystem: boolean
  isSecurityGroup: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  workspace: { id: number; name: string; slug: string } | null
  project: { id: number; name: string; identifier: string } | null
  memberCount: number
  assignmentCount: number
  canManage: boolean
}

interface MyGroupsResponse extends Array<{
  groupId: number
  groupName: string
  groupDisplayName: string
  groupType: string
  addedAt: string
  role: string | null
}>{}

interface GroupMembersResponse {
  members: Array<{
    id: number
    user: {
      id: number
      username: string
      name: string
      email: string
      avatarUrl: string | null
      isActive: boolean
    }
    addedAt: string
    addedBy: { id: number; name: string } | null
    externalSync: boolean
  }>
  total: number
  limit: number
  offset: number
  hasMore: boolean
  canManage: boolean
}

interface CreateGroupResponse {
  id: number
  name: string
  displayName: string
  type: string
  createdAt: string
}

interface UpdateGroupResponse {
  id: number
  name: string
  displayName: string
  description: string | null
  isActive: boolean
  updatedAt: string
}

interface AddMemberResponse {
  id: number
  addedAt: string
  user: {
    id: number
    username: string
    name: string
    email: string
  }
}

interface SimpleResponse {
  success: boolean
  message?: string
}

// =============================================================================
// Schemas
// =============================================================================

export const ListGroupsSchema = z.object({
  type: z.enum(['SYSTEM', 'WORKSPACE', 'WORKSPACE_ADMIN', 'PROJECT', 'PROJECT_ADMIN', 'CUSTOM']).optional()
    .describe('Filter by group type'),
  workspaceId: z.number().optional().describe('Filter by workspace'),
  projectId: z.number().optional().describe('Filter by project'),
  search: z.string().optional().describe('Search in name, displayName, description'),
  limit: z.number().optional().describe('Max results (default 50, max 100)'),
  offset: z.number().optional().describe('Pagination offset'),
})

export const GetGroupSchema = z.object({
  groupId: z.number().describe('Group ID'),
})

export const ListGroupMembersSchema = z.object({
  groupId: z.number().describe('Group ID'),
  limit: z.number().optional().describe('Max results (default 50)'),
  offset: z.number().optional().describe('Pagination offset'),
})

export const CreateGroupSchema = z.object({
  name: z.string().describe('Group name (unique, 1-255 chars)'),
  displayName: z.string().describe('Display name (1-255 chars)'),
  description: z.string().optional().describe('Description (max 1000 chars)'),
  workspaceId: z.number().optional().describe('Workspace ID (required for non-Domain-Admins)'),
  projectId: z.number().optional().describe('Project ID'),
})

export const CreateSecurityGroupSchema = z.object({
  name: z.string().describe('Group name (unique, 1-255 chars)'),
  displayName: z.string().describe('Display name (1-255 chars)'),
  description: z.string().optional().describe('Description (max 1000 chars)'),
})

export const UpdateGroupSchema = z.object({
  groupId: z.number().describe('Group ID'),
  displayName: z.string().optional().describe('New display name'),
  description: z.string().nullable().optional().describe('New description (or null to clear)'),
  isActive: z.boolean().optional().describe('Active status'),
})

export const GroupIdSchema = z.object({
  groupId: z.number().describe('Group ID'),
})

export const AddMemberSchema = z.object({
  groupId: z.number().describe('Group ID'),
  userId: z.number().describe('User ID to add'),
})

export const RemoveMemberSchema = z.object({
  groupId: z.number().describe('Group ID'),
  userId: z.number().describe('User ID to remove'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const groupToolDefinitions = [
  // Query Tools
  {
    name: 'kanbu_list_groups',
    description:
      'List security groups. Domain Admins see all groups, Workspace Admins see groups in their workspaces.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['SYSTEM', 'WORKSPACE', 'WORKSPACE_ADMIN', 'PROJECT', 'PROJECT_ADMIN', 'CUSTOM'],
          description: 'Filter by group type',
        },
        workspaceId: {
          type: 'number',
          description: 'Filter by workspace',
        },
        projectId: {
          type: 'number',
          description: 'Filter by project',
        },
        search: {
          type: 'string',
          description: 'Search in name, displayName, description',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 50, max 100)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset',
        },
      },
      required: [],
    },
  },
  {
    name: 'kanbu_get_group',
    description: 'Get detailed information about a specific group.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'number',
          description: 'Group ID',
        },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'kanbu_my_groups',
    description: 'Get groups you are a member of.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_list_group_members',
    description: 'List members of a group.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'number',
          description: 'Group ID',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 50)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset',
        },
      },
      required: ['groupId'],
    },
  },

  // Management Tools
  {
    name: 'kanbu_create_group',
    description: 'Create a new custom group. Non-Domain-Admins must specify a workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Group name (unique, 1-255 chars)',
        },
        displayName: {
          type: 'string',
          description: 'Display name (1-255 chars)',
        },
        description: {
          type: 'string',
          description: 'Description (max 1000 chars)',
        },
        workspaceId: {
          type: 'number',
          description: 'Workspace ID (required for non-Domain-Admins)',
        },
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
      },
      required: ['name', 'displayName'],
    },
  },
  {
    name: 'kanbu_create_security_group',
    description: 'Create a new security group (Domain Admins only). Security groups can be assigned to multiple workspaces/projects via ACL.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Group name (unique, 1-255 chars)',
        },
        displayName: {
          type: 'string',
          description: 'Display name (1-255 chars)',
        },
        description: {
          type: 'string',
          description: 'Description (max 1000 chars)',
        },
      },
      required: ['name', 'displayName'],
    },
  },
  {
    name: 'kanbu_update_group',
    description: 'Update a group. Cannot modify system groups.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'number',
          description: 'Group ID',
        },
        displayName: {
          type: 'string',
          description: 'New display name',
        },
        description: {
          type: 'string',
          description: 'New description (or null to clear)',
        },
        isActive: {
          type: 'boolean',
          description: 'Active status',
        },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'kanbu_delete_group',
    description: 'Delete a group. Cannot delete system groups.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'number',
          description: 'Group ID to delete',
        },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'kanbu_add_group_member',
    description: 'Add a user to a group. Has privilege escalation prevention.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'number',
          description: 'Group ID',
        },
        userId: {
          type: 'number',
          description: 'User ID to add',
        },
      },
      required: ['groupId', 'userId'],
    },
  },
  {
    name: 'kanbu_remove_group_member',
    description: 'Remove a user from a group. Cannot remove the last Domain Admin.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'number',
          description: 'Group ID',
        },
        userId: {
          type: 'number',
          description: 'User ID to remove',
        },
      },
      required: ['groupId', 'userId'],
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

function groupTypeLabel(type: string): string {
  switch (type) {
    case 'SYSTEM':
      return '[SYSTEM]'
    case 'WORKSPACE':
      return '[WS-Members]'
    case 'WORKSPACE_ADMIN':
      return '[WS-Admin]'
    case 'PROJECT':
      return '[Proj-Members]'
    case 'PROJECT_ADMIN':
      return '[Proj-Admin]'
    case 'CUSTOM':
      return '[Custom]'
    default:
      return `[${type}]`
  }
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List groups
 */
export async function handleListGroups(args: unknown) {
  const input = ListGroupsSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<GroupListResponse>(
      config.kanbuUrl,
      config.token,
      'group.list',
      {
        type: input.type,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        search: input.search,
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
      }
    )

    if (result.groups.length === 0) {
      return success('No groups found matching the criteria.')
    }

    const lines: string[] = [
      `Groups (${result.offset + 1}-${result.offset + result.groups.length} of ${result.total})`,
      '',
    ]

    for (const group of result.groups) {
      const typeLabel = groupTypeLabel(group.type)
      const status = group.isActive ? '' : ' [INACTIVE]'
      const secGroup = group.isSecurityGroup ? ' [SecurityGroup]' : ''

      lines.push(`${typeLabel} #${group.id} ${group.displayName}${secGroup}${status}`)
      lines.push(`   Name: ${group.name}`)

      if (group.workspace) {
        lines.push(`   Workspace: ${group.workspace.name}`)
      }
      if (group.project) {
        lines.push(`   Project: ${group.project.name}`)
      }

      lines.push(`   Members: ${group.memberCount} | Can manage: ${group.canManage ? 'Yes' : 'No'}`)

      if (group.description) {
        const desc = group.description.length > 60
          ? group.description.slice(0, 60) + '...'
          : group.description
        lines.push(`   "${desc}"`)
      }
      lines.push('')
    }

    if (result.hasMore) {
      lines.push(`... and ${result.total - result.offset - result.groups.length} more`)
      lines.push(`Use offset=${result.offset + result.groups.length} to see next page`)
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to list groups: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get group details
 */
export async function handleGetGroup(args: unknown) {
  const input = GetGroupSchema.parse(args)
  const config = requireAuth()

  try {
    const group = await client.call<GroupDetailResponse>(
      config.kanbuUrl,
      config.token,
      'group.get',
      { groupId: input.groupId }
    )

    const lines: string[] = [
      `Group: ${group.displayName}`,
      '',
      '== Basic Info ==',
      `ID: ${group.id}`,
      `Name: ${group.name}`,
      `Type: ${group.type}`,
      `Status: ${group.isActive ? 'Active' : 'Inactive'}`,
      `System group: ${group.isSystem ? 'Yes' : 'No'}`,
      `Security group: ${group.isSecurityGroup ? 'Yes' : 'No'}`,
    ]

    if (group.description) {
      lines.push('')
      lines.push('== Description ==')
      lines.push(group.description)
    }

    lines.push('')
    lines.push('== Scope ==')
    if (group.workspace) {
      lines.push(`Workspace: ${group.workspace.name} (${group.workspace.slug})`)
    }
    if (group.project) {
      lines.push(`Project: ${group.project.name} (${group.project.identifier})`)
    }
    if (!group.workspace && !group.project) {
      lines.push('Scope: Global (no workspace/project binding)')
    }

    lines.push('')
    lines.push('== Membership ==')
    lines.push(`Members: ${group.memberCount}`)
    lines.push(`Role assignments: ${group.assignmentCount}`)
    lines.push(`Can manage: ${group.canManage ? 'Yes' : 'No'}`)

    lines.push('')
    lines.push('== Metadata ==')
    lines.push(`Source: ${group.source}`)
    if (group.externalId) {
      lines.push(`External ID: ${group.externalId}`)
    }
    lines.push(`Created: ${formatDate(group.createdAt)}`)
    lines.push(`Updated: ${formatDate(group.updatedAt)}`)

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get group: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Get my groups
 */
export async function handleMyGroups(_args: unknown) {
  const config = requireAuth()

  try {
    const groups = await client.call<MyGroupsResponse>(
      config.kanbuUrl,
      config.token,
      'group.myGroups',
      {}
    )

    if (groups.length === 0) {
      return success('You are not a member of any groups.')
    }

    const lines: string[] = [
      `Your Groups (${groups.length})`,
      '',
    ]

    for (const group of groups) {
      const typeLabel = groupTypeLabel(group.groupType)
      lines.push(`${typeLabel} ${group.groupDisplayName}`)
      lines.push(`   ID: ${group.groupId} | Name: ${group.groupName}`)
      lines.push(`   Added: ${formatDate(group.addedAt)}`)
      lines.push('')
    }

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to get your groups: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * List group members
 */
export async function handleListGroupMembers(args: unknown) {
  const input = ListGroupMembersSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<GroupMembersResponse>(
      config.kanbuUrl,
      config.token,
      'group.listMembers',
      {
        groupId: input.groupId,
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
      }
    )

    if (result.members.length === 0) {
      return success('This group has no members.')
    }

    const lines: string[] = [
      `Group Members (${result.members.length} of ${result.total})`,
      '',
    ]

    for (const member of result.members) {
      const status = member.user.isActive ? '' : ' [INACTIVE]'
      const sync = member.externalSync ? ' [External sync]' : ''

      lines.push(`#${member.user.id} ${member.user.name} (@${member.user.username})${status}${sync}`)
      lines.push(`   Email: ${member.user.email}`)
      lines.push(`   Added: ${formatDate(member.addedAt)}${member.addedBy ? ` by ${member.addedBy.name}` : ''}`)
      lines.push('')
    }

    if (result.hasMore) {
      lines.push(`... and ${result.total - result.members.length} more`)
    }

    lines.push(`Can manage members: ${result.canManage ? 'Yes' : 'No'}`)

    return success(lines.join('\n'))
  } catch (err) {
    return error(`Failed to list group members: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Create a custom group
 */
export async function handleCreateGroup(args: unknown) {
  const input = CreateGroupSchema.parse(args)
  const config = requireAuth()

  try {
    const group = await client.call<CreateGroupResponse>(
      config.kanbuUrl,
      config.token,
      'group.create',
      {
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        type: 'CUSTOM', // Only custom groups can be created manually
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }
    )

    return success([
      `Group created successfully!`,
      '',
      `ID: ${group.id}`,
      `Name: ${group.name}`,
      `Display Name: ${group.displayName}`,
      `Type: ${group.type}`,
    ].join('\n'))
  } catch (err) {
    return error(`Failed to create group: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Create a security group (Domain Admin only)
 */
export async function handleCreateSecurityGroup(args: unknown) {
  const input = CreateSecurityGroupSchema.parse(args)
  const config = requireAuth()

  try {
    const group = await client.call<CreateGroupResponse>(
      config.kanbuUrl,
      config.token,
      'group.createSecurityGroup',
      {
        name: input.name,
        displayName: input.displayName,
        description: input.description,
      }
    )

    return success([
      `Security group created successfully!`,
      '',
      `ID: ${group.id}`,
      `Name: ${group.name}`,
      `Display Name: ${group.displayName}`,
      `Type: ${group.type} [Security Group]`,
      '',
      'This group has no workspace/project binding and can be assigned',
      'to multiple resources via ACL entries.',
    ].join('\n'))
  } catch (err) {
    return error(`Failed to create security group: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Update a group
 */
export async function handleUpdateGroup(args: unknown) {
  const input = UpdateGroupSchema.parse(args)
  const config = requireAuth()

  try {
    const group = await client.call<UpdateGroupResponse>(
      config.kanbuUrl,
      config.token,
      'group.update',
      input
    )

    return success([
      `Group #${group.id} updated successfully!`,
      '',
      `Name: ${group.name}`,
      `Display Name: ${group.displayName}`,
      `Description: ${group.description ?? '(none)'}`,
      `Status: ${group.isActive ? 'Active' : 'Inactive'}`,
    ].join('\n'))
  } catch (err) {
    return error(`Failed to update group: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Delete a group
 */
export async function handleDeleteGroup(args: unknown) {
  const input = GroupIdSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<SimpleResponse>(
      config.kanbuUrl,
      config.token,
      'group.delete',
      { groupId: input.groupId }
    )

    return success(`Group #${input.groupId} deleted successfully.`)
  } catch (err) {
    return error(`Failed to delete group: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Add a member to a group
 */
export async function handleAddGroupMember(args: unknown) {
  const input = AddMemberSchema.parse(args)
  const config = requireAuth()

  try {
    const result = await client.call<AddMemberResponse>(
      config.kanbuUrl,
      config.token,
      'group.addMember',
      input
    )

    return success([
      `User added to group successfully!`,
      '',
      `User: ${result.user.name} (@${result.user.username})`,
      `Email: ${result.user.email}`,
      `Added: ${formatDate(result.addedAt)}`,
    ].join('\n'))
  } catch (err) {
    return error(`Failed to add member: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Remove a member from a group
 */
export async function handleRemoveGroupMember(args: unknown) {
  const input = RemoveMemberSchema.parse(args)
  const config = requireAuth()

  try {
    await client.call<SimpleResponse>(
      config.kanbuUrl,
      config.token,
      'group.removeMember',
      input
    )

    return success(`User #${input.userId} removed from group #${input.groupId} successfully.`)
  } catch (err) {
    return error(`Failed to remove member: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
