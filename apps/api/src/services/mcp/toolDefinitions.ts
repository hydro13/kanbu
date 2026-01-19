/*
 * MCP Tool Definitions
 * Version: 2.0.0
 *
 * Complete tool definitions for the remote MCP endpoint.
 * All 154 tools from packages/mcp-server/src/tools/
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: Phase 18 - Remote MCP Endpoint (Complete Implementation)
 * Claude Code: Opus 4.5
 * Date: 2026-01-19
 * ═══════════════════════════════════════════════════════════════════
 */

// =============================================================================
// Workspace Tools (2)
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
        id: { type: 'number', description: 'Workspace ID' },
      },
      required: ['id'],
    },
  },
];

// =============================================================================
// Project Tools (3)
// =============================================================================

export const projectToolDefinitions = [
  {
    name: 'kanbu_list_projects',
    description:
      'List all projects in a workspace. Shows project name, prefix, task count, and status.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Workspace ID to list projects from' },
      },
      required: ['workspaceId'],
    },
  },
  {
    name: 'kanbu_get_project',
    description: 'Get details of a specific project including columns and task counts per column.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Project ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_create_project',
    description: 'Create a new project in a workspace. You need Write permission on the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Workspace ID to create project in' },
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Project description' },
        prefix: {
          type: 'string',
          description: 'Task prefix (e.g., KANBU). Auto-generated if not provided.',
        },
      },
      required: ['workspaceId', 'name'],
    },
  },
];

// =============================================================================
// Task Tools (6)
// =============================================================================

export const taskToolDefinitions = [
  {
    name: 'kanbu_list_tasks',
    description:
      'List tasks in a project. Best for exploring the current state of a project, finding tasks in a specific column (e.g., "To Do"), or filtering by status. Use this to get an overview before acting.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        status: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by status (default: open)',
        },
        columnId: { type: 'number', description: 'Filter by column ID' },
        limit: { type: 'number', description: 'Maximum number of tasks to return (default: 50)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_get_task',
    description: 'Get detailed information about a specific task including subtasks and comments.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Task ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_create_task',
    description: 'Create a new task in a project. You need Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        columnId: { type: 'number', description: 'Column ID (defaults to first column)' },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Task priority (default: MEDIUM)',
        },
        dueDate: { type: 'string', description: 'Due date in ISO format (YYYY-MM-DD)' },
        assigneeIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of user IDs to assign',
        },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'kanbu_update_task',
    description: 'Update task properties like title, description, priority, or due date.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Task ID' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'New priority',
        },
        dueDate: { type: ['string', 'null'], description: 'New due date (null to clear)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_move_task',
    description: 'Move a task to a different column (e.g., from "To Do" to "Done").',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Task ID' },
        columnId: { type: 'number', description: 'Target column ID' },
        position: { type: 'number', description: 'Position in column (0 = top)' },
      },
      required: ['id', 'columnId'],
    },
  },
  {
    name: 'kanbu_my_tasks',
    description: 'List tasks assigned to you across all projects. Useful for seeing your workload.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by status (default: open)',
        },
        limit: { type: 'number', description: 'Maximum number of tasks (default: 20)' },
      },
    },
  },
];

// =============================================================================
// Subtask Tools (5)
// =============================================================================

export const subtaskToolDefinitions = [
  {
    name: 'kanbu_list_subtasks',
    description: 'List all subtasks for a task. Shows title, status, assignee, and time tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'number', description: 'Task ID to list subtasks for' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_create_subtask',
    description: 'Create a new subtask for a task. Requires Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'number', description: 'Parent task ID' },
        title: { type: 'string', description: 'Subtask title' },
        description: { type: 'string', description: 'Subtask description' },
        assigneeId: { type: 'number', description: 'User ID to assign' },
        timeEstimated: { type: 'number', description: 'Estimated time in hours' },
      },
      required: ['taskId', 'title'],
    },
  },
  {
    name: 'kanbu_update_subtask',
    description: 'Update a subtask (title, description, status, assignee, time).',
    inputSchema: {
      type: 'object',
      properties: {
        subtaskId: { type: 'number', description: 'Subtask ID' },
        title: { type: 'string', description: 'New title' },
        description: { type: ['string', 'null'], description: 'New description (null to clear)' },
        status: {
          type: 'string',
          enum: ['TODO', 'IN_PROGRESS', 'DONE'],
          description: 'New status',
        },
        assigneeId: { type: ['number', 'null'], description: 'New assignee ID (null to unassign)' },
        timeEstimated: { type: 'number', description: 'Estimated time in hours' },
      },
      required: ['subtaskId'],
    },
  },
  {
    name: 'kanbu_toggle_subtask',
    description: 'Toggle a subtask between TODO and DONE status.',
    inputSchema: {
      type: 'object',
      properties: {
        subtaskId: { type: 'number', description: 'Subtask ID to toggle' },
      },
      required: ['subtaskId'],
    },
  },
  {
    name: 'kanbu_delete_subtask',
    description: 'Delete a subtask. Requires Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        subtaskId: { type: 'number', description: 'Subtask ID to delete' },
      },
      required: ['subtaskId'],
    },
  },
];

// =============================================================================
// Comment Tools (4)
// =============================================================================

export const commentToolDefinitions = [
  {
    name: 'kanbu_list_comments',
    description: 'List comments on a task. Shows author, content, and timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'number', description: 'Task ID to list comments for' },
        limit: { type: 'number', description: 'Maximum number of comments (default: 20)' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_add_comment',
    description: 'Add a comment to a task. Requires Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'number', description: 'Task ID to add comment to' },
        content: { type: 'string', description: 'Comment text' },
      },
      required: ['taskId', 'content'],
    },
  },
  {
    name: 'kanbu_update_comment',
    description: 'Update a comment. You can only edit your own comments.',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: { type: 'number', description: 'Comment ID to update' },
        content: { type: 'string', description: 'New comment text' },
      },
      required: ['commentId', 'content'],
    },
  },
  {
    name: 'kanbu_delete_comment',
    description:
      'Delete a comment. You can delete your own comments, or any comment if you are a project manager.',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: { type: 'number', description: 'Comment ID to delete' },
      },
      required: ['commentId'],
    },
  },
];

// =============================================================================
// Search Tools (2)
// =============================================================================

export const searchToolDefinitions = [
  {
    name: 'kanbu_search_tasks',
    description: 'Search for tasks in a project. Searches in title, reference, and description.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID to search in' },
        query: { type: 'string', description: 'Search query' },
        includeCompleted: {
          type: 'boolean',
          description: 'Include completed tasks (default: false)',
        },
        limit: { type: 'number', description: 'Maximum results (default: 20)' },
      },
      required: ['projectId', 'query'],
    },
  },
  {
    name: 'kanbu_search_global',
    description:
      'Global logical search across the entire project (tasks, comments, wiki). Use this for broad queries like "what happened last week?" or "plan for release". It uses vector search to find conceptually relevant results, not just exact keyword matches.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID to search in' },
        query: {
          type: 'string',
          description:
            'Natural language search query. Examples: "blockers for android", "decisions made about api", "deployment issues"',
        },
        types: {
          type: 'array',
          items: { type: 'string', enum: ['task', 'comment', 'wiki'] },
          description: 'Entity types to search (default: all)',
        },
        limit: { type: 'number', description: 'Maximum results (default: 20)' },
      },
      required: ['projectId', 'query'],
    },
  },
];

// =============================================================================
// Activity Tools (3)
// =============================================================================

export const activityToolDefinitions = [
  {
    name: 'kanbu_recent_activity',
    description: 'Get recent activity for a project. Shows who did what and when.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        limit: { type: 'number', description: 'Maximum activities (default: 20)' },
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
        taskId: { type: 'number', description: 'Task ID' },
        limit: { type: 'number', description: 'Maximum activities (default: 20)' },
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
        projectId: { type: 'number', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
];

// =============================================================================
// Analytics Tools (4)
// =============================================================================

export const analyticsToolDefinitions = [
  {
    name: 'kanbu_project_stats',
    description:
      'Get project statistics: task counts, completion rate, trends, time tracking, and distribution by priority/column.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        dateFrom: { type: 'string', description: 'Start date (ISO format, optional)' },
        dateTo: { type: 'string', description: 'End date (ISO format, optional)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_velocity',
    description: 'Get team velocity: tasks completed per week over time, with rolling average.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        weeks: { type: 'number', description: 'Number of weeks to analyze (default: 8)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_cycle_time',
    description:
      'Get cycle time analysis: average time tasks spend in each column, bottleneck identification.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_team_workload',
    description:
      'Get team workload distribution: tasks per team member, overdue counts, unassigned tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
];

// =============================================================================
// Admin User Management Tools (11)
// =============================================================================

export const adminToolDefinitions = [
  {
    name: 'kanbu_list_users',
    description:
      'List all users visible to you. Domain Admins see all users, Workspace Admins see users in their workspaces. Supports filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search in email, username, or name' },
        role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'USER'], description: 'Filter by role' },
        isActive: { type: 'boolean', description: 'Filter by active status' },
        sortBy: {
          type: 'string',
          enum: ['id', 'email', 'username', 'name', 'createdAt', 'lastLoginAt'],
          description: 'Sort field',
        },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order' },
        limit: { type: 'number', description: 'Max results (default 25, max 100)' },
        offset: { type: 'number', description: 'Pagination offset' },
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
        userId: { type: 'number', description: 'User ID' },
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
        userId: { type: 'number', description: 'User ID' },
        limit: { type: 'number', description: 'Max results (default 20)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'kanbu_create_user',
    description: 'Create a new user account. The user will be automatically verified.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address' },
        username: {
          type: 'string',
          description: 'Username (3-50 chars, alphanumeric with _ and -)',
        },
        name: { type: 'string', description: 'Display name' },
        password: { type: 'string', description: 'Password (min 8 chars)' },
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
    description:
      'Update user properties. You cannot demote yourself from admin or deactivate yourself.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID to update' },
        email: { type: 'string', description: 'New email address' },
        username: { type: 'string', description: 'New username' },
        name: { type: 'string', description: 'New display name' },
        role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'USER'], description: 'New role' },
        isActive: { type: 'boolean', description: 'Active status' },
        language: { type: 'string', description: 'Language code (e.g., nl, en)' },
        timezone: { type: 'string', description: 'Timezone (e.g., Europe/Amsterdam)' },
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
        userId: { type: 'number', description: 'User ID to deactivate' },
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
        userId: { type: 'number', description: 'User ID to reactivate' },
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
        userId: { type: 'number', description: 'User ID' },
        newPassword: { type: 'string', description: 'New password (min 8 chars)' },
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
        userId: { type: 'number', description: 'User ID to unlock' },
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
        userId: { type: 'number', description: 'User ID' },
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
        userId: { type: 'number', description: 'User ID' },
      },
      required: ['userId'],
    },
  },
];

// =============================================================================
// Group Tools (10)
// =============================================================================

export const groupToolDefinitions = [
  {
    name: 'kanbu_list_groups',
    description:
      'List security groups. Domain Admins see all groups, Workspace Admins see groups in their workspaces.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Filter by workspace' },
        projectId: { type: 'number', description: 'Filter by project' },
        type: {
          type: 'string',
          enum: ['SYSTEM', 'WORKSPACE', 'WORKSPACE_ADMIN', 'PROJECT', 'PROJECT_ADMIN', 'CUSTOM'],
          description: 'Filter by group type',
        },
        search: { type: 'string', description: 'Search in name, displayName, description' },
        limit: { type: 'number', description: 'Max results (default 50, max 100)' },
        offset: { type: 'number', description: 'Pagination offset' },
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
        groupId: { type: 'number', description: 'Group ID' },
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
        groupId: { type: 'number', description: 'Group ID' },
        limit: { type: 'number', description: 'Max results (default 50)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'kanbu_create_group',
    description: 'Create a new custom group. Non-Domain-Admins must specify a workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Group name (unique, 1-255 chars)' },
        displayName: { type: 'string', description: 'Display name (1-255 chars)' },
        description: { type: 'string', description: 'Description (max 1000 chars)' },
        workspaceId: {
          type: 'number',
          description: 'Workspace ID (required for non-Domain-Admins)',
        },
        projectId: { type: 'number', description: 'Project ID' },
      },
      required: ['name', 'displayName'],
    },
  },
  {
    name: 'kanbu_create_security_group',
    description:
      'Create a new security group (Domain Admins only). Security groups can be assigned to multiple workspaces/projects via ACL.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Group name (unique, 1-255 chars)' },
        displayName: { type: 'string', description: 'Display name (1-255 chars)' },
        description: { type: 'string', description: 'Description (max 1000 chars)' },
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
        groupId: { type: 'number', description: 'Group ID' },
        displayName: { type: 'string', description: 'New display name' },
        description: { type: 'string', description: 'New description (or null to clear)' },
        isActive: { type: 'boolean', description: 'Active status' },
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
        groupId: { type: 'number', description: 'Group ID to delete' },
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
        groupId: { type: 'number', description: 'Group ID' },
        userId: { type: 'number', description: 'User ID to add' },
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
        groupId: { type: 'number', description: 'Group ID' },
        userId: { type: 'number', description: 'User ID to remove' },
      },
      required: ['groupId', 'userId'],
    },
  },
];

// =============================================================================
// ACL Tools (20)
// =============================================================================

export const aclToolDefinitions = [
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
        search: { type: 'string', description: 'Search in names' },
        workspaceId: { type: 'number', description: 'Filter groups by workspace' },
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
        workspaceId: { type: 'number', description: 'Filter by workspace' },
        principalTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by principal types (user, group)',
        },
        resourceTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by resource types',
        },
        includeInherited: { type: 'boolean', description: 'Include inherited permissions' },
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
        format: { type: 'string', enum: ['json', 'csv'], description: 'Export format' },
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
// Invite Tools (5)
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
// Audit Tools (5)
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
        userId: { type: 'number', description: 'Filter by actor user ID' },
        workspaceId: { type: 'number', description: 'Filter by workspace' },
        resourceType: { type: 'string', description: 'Filter by resource type' },
        resourceId: { type: 'number', description: 'Filter by resource ID' },
        search: { type: 'string', description: 'Search in resource/target names' },
        dateFrom: { type: 'string', description: 'Start date (ISO format)' },
        dateTo: { type: 'string', description: 'End date (ISO format)' },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (default: desc)',
        },
        limit: { type: 'number', description: 'Max results (default 50, max 100)' },
        offset: { type: 'number', description: 'Pagination offset' },
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
        format: { type: 'string', enum: ['csv', 'json'], description: 'Export format' },
        category: {
          type: 'string',
          enum: ['ACL', 'GROUP', 'USER', 'WORKSPACE', 'SETTINGS'],
          description: 'Filter by category',
        },
        workspaceId: { type: 'number', description: 'Filter by workspace' },
        dateFrom: { type: 'string', description: 'Start date (ISO format)' },
        dateTo: { type: 'string', description: 'End date (ISO format)' },
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
// System Tools (12)
// =============================================================================

export const systemToolDefinitions = [
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
// Profile Tools (36)
// =============================================================================

export const profileToolDefinitions = [
  {
    name: 'kanbu_whoami',
    description: 'Show current connection status and user information.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kanbu_get_profile',
    description:
      'Get your full profile summary including workspaces, recent projects, and settings.',
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
        provider: {
          type: 'string',
          enum: ['google', 'github', 'gitlab'],
          description: 'Provider to unlink',
        },
      },
      required: ['provider'],
    },
  },
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
        scope: {
          type: 'string',
          enum: ['USER', 'WORKSPACE', 'PROJECT'],
          description: 'Token scope',
        },
        workspaceId: { type: 'number', description: 'Workspace ID for scoped tokens' },
        projectId: { type: 'number', description: 'Project ID for PROJECT scope' },
        permissions: { type: 'array', items: { type: 'string' }, description: 'Permissions array' },
        expiresAt: { type: 'string', description: 'Expiration date (ISO)' },
        rateLimit: { type: 'number', description: 'Rate limit (10-10000)' },
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
  // Connection tools (simplified for remote MCP)
  {
    name: 'kanbu_connect',
    description:
      'Connect to Kanbu using a setup code from your profile page. After connecting, you can manage projects and tasks on behalf of the user.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Setup code from Kanbu profile page (format: KNB-XXXX-XXXX)',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'kanbu_disconnect',
    description: 'Disconnect from Kanbu and remove local credentials.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// =============================================================================
// GitHub Tools (10)
// =============================================================================

export const githubToolDefinitions = [
  {
    name: 'kanbu_get_github_repo',
    description:
      'Get the linked GitHub repository for a project. Shows repository details, sync status, and settings.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID to get linked repository for' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_list_github_prs',
    description:
      'List pull requests for a project. Shows PR number, title, state, author, and linked task if any.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'merged', 'all'],
          description: 'Filter by PR state (default: all)',
        },
        limit: { type: 'number', description: 'Maximum results (default: 20, max: 100)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_list_github_commits',
    description: 'List commits for a project. Shows SHA, message, author, and linked task if any.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        limit: { type: 'number', description: 'Maximum results (default: 20, max: 100)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_get_task_prs',
    description: 'Get pull requests linked to a specific task.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'number', description: 'Task ID to get linked PRs for' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_get_task_commits',
    description: 'Get commits linked to a specific task.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'number', description: 'Task ID to get linked commits for' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_link_github_repo',
    description: 'Link a GitHub repository to a Kanbu project. Requires project Write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID to link repository to' },
        installationId: { type: 'number', description: 'GitHub App installation ID' },
        repoId: { type: 'number', description: 'GitHub repository ID' },
        owner: { type: 'string', description: 'Repository owner (username or org)' },
        name: { type: 'string', description: 'Repository name' },
        fullName: { type: 'string', description: 'Full repository name (owner/name)' },
        isPrivate: { type: 'boolean', description: 'Whether the repo is private' },
        defaultBranch: { type: 'string', description: 'Default branch name (default: main)' },
      },
      required: ['projectId', 'installationId', 'repoId', 'owner', 'name', 'fullName'],
    },
  },
  {
    name: 'kanbu_unlink_github_repo',
    description:
      'Unlink a GitHub repository from a Kanbu project. Requires project Write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID to unlink repository from' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_sync_github_issues',
    description: 'Import/sync issues from GitHub to Kanbu. Creates tasks for GitHub issues.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID to sync issues for' },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by issue state (default: open)',
        },
        skipExisting: {
          type: 'boolean',
          description: 'Skip already synced issues (default: true)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_create_github_branch',
    description:
      'Create a feature branch on GitHub for a task. Branch name is generated from task reference and title.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'number', description: 'Task ID to create branch for' },
        customBranchName: {
          type: 'string',
          description: 'Custom branch name (optional, otherwise auto-generated)',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_link_pr_to_task',
    description: 'Manually link a pull request to a task. Requires project Write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        prId: {
          type: 'number',
          description: 'Pull Request ID (Kanbu internal ID from kanbu_list_github_prs)',
        },
        taskId: { type: 'number', description: 'Task ID to link to' },
      },
      required: ['prId', 'taskId'],
    },
  },
];

// =============================================================================
// Wiki Tools (18)
// =============================================================================

export const wikiToolDefinitions = [
  // Project Wiki Tools (9)
  {
    name: 'kanbu_list_project_wiki_pages',
    description:
      'List wiki pages in a project. Returns hierarchical structure with parent/child relationships. Use parentId filter to get pages at specific level. Supports [[wiki links]], @mentions, #task-refs, and #tags.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        parentId: {
          type: ['number', 'null'],
          description: 'Filter by parent page ID (null for root pages, omit for all)',
        },
        includeUnpublished: {
          type: 'boolean',
          description: 'Include draft and archived pages (default: false)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_get_project_wiki_page',
    description:
      'Get detailed information about a specific project wiki page including content, metadata, and cross-references.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Wiki page ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_get_project_wiki_page_by_slug',
    description:
      'Get a project wiki page by its slug (permalink). Useful when you know the page title but not the ID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        slug: { type: 'string', description: 'Page slug (auto-generated from title)' },
      },
      required: ['projectId', 'slug'],
    },
  },
  {
    name: 'kanbu_create_project_wiki_page',
    description:
      'Create a new wiki page in a project. Supports [[wiki links]], @mentions, #task-refs, and #tags in content. You need Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: 'Project ID' },
        title: { type: 'string', description: 'Page title' },
        content: { type: 'string', description: 'Page content (plain text with cross-references)' },
        parentId: { type: ['number', 'null'], description: 'Parent page ID (null for root page)' },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
          description: 'Page status (default: DRAFT)',
        },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'kanbu_update_project_wiki_page',
    description:
      'Update a project wiki page. Creates a new version automatically. Extracts cross-references from content.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Wiki page ID' },
        title: { type: 'string', description: 'New title' },
        content: { type: 'string', description: 'New content' },
        parentId: { type: ['number', 'null'], description: 'New parent page ID' },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
          description: 'New status',
        },
        changeNote: { type: 'string', description: 'Note for version history' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_delete_project_wiki_page',
    description: 'Delete a project wiki page. You need Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Wiki page ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_get_project_wiki_versions',
    description:
      'Get version history for a project wiki page. Returns up to 20 most recent versions with change notes.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'number', description: 'Wiki page ID' },
        limit: { type: 'number', description: 'Maximum number of versions (default: 20)' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'kanbu_get_project_wiki_version',
    description: 'Get a specific version of a project wiki page by version number.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'number', description: 'Wiki page ID' },
        version: { type: 'number', description: 'Version number' },
      },
      required: ['pageId', 'version'],
    },
  },
  {
    name: 'kanbu_restore_project_wiki_version',
    description:
      'Restore an old version of a project wiki page. Creates a new version (does not rewrite history).',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'number', description: 'Wiki page ID' },
        version: { type: 'number', description: 'Version number to restore' },
        changeNote: { type: 'string', description: 'Note for version history' },
      },
      required: ['pageId', 'version'],
    },
  },
  // Workspace Wiki Tools (9)
  {
    name: 'kanbu_list_workspace_wiki_pages',
    description:
      'List wiki pages in a workspace. Returns hierarchical structure with parent/child relationships. Use parentId filter to get pages at specific level. Supports [[wiki links]], @mentions, #task-refs, and #tags.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Workspace ID' },
        parentId: {
          type: ['number', 'null'],
          description: 'Filter by parent page ID (null for root pages, omit for all)',
        },
        includeUnpublished: {
          type: 'boolean',
          description: 'Include draft and archived pages (default: false)',
        },
      },
      required: ['workspaceId'],
    },
  },
  {
    name: 'kanbu_get_workspace_wiki_page',
    description:
      'Get detailed information about a specific workspace wiki page including content, metadata, and cross-references.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Wiki page ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_get_workspace_wiki_page_by_slug',
    description:
      'Get a workspace wiki page by its slug (permalink). Useful when you know the page title but not the ID.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Workspace ID' },
        slug: { type: 'string', description: 'Page slug (auto-generated from title)' },
      },
      required: ['workspaceId', 'slug'],
    },
  },
  {
    name: 'kanbu_create_workspace_wiki_page',
    description:
      'Create a new wiki page in a workspace. Supports [[wiki links]], @mentions, #task-refs, and #tags in content. You need Write permission on the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'number', description: 'Workspace ID' },
        title: { type: 'string', description: 'Page title' },
        content: { type: 'string', description: 'Page content (plain text with cross-references)' },
        parentId: { type: ['number', 'null'], description: 'Parent page ID (null for root page)' },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
          description: 'Page status (default: DRAFT)',
        },
      },
      required: ['workspaceId', 'title'],
    },
  },
  {
    name: 'kanbu_update_workspace_wiki_page',
    description:
      'Update a workspace wiki page. Creates a new version automatically. Extracts cross-references from content.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Wiki page ID' },
        title: { type: 'string', description: 'New title' },
        content: { type: 'string', description: 'New content' },
        parentId: { type: ['number', 'null'], description: 'New parent page ID' },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
          description: 'New status',
        },
        changeNote: { type: 'string', description: 'Note for version history' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_delete_workspace_wiki_page',
    description: 'Delete a workspace wiki page. You need Write permission on the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Wiki page ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_get_workspace_wiki_versions',
    description:
      'Get version history for a workspace wiki page. Returns up to 20 most recent versions with change notes.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'number', description: 'Wiki page ID' },
        limit: { type: 'number', description: 'Maximum number of versions (default: 20)' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'kanbu_get_workspace_wiki_version',
    description: 'Get a specific version of a workspace wiki page by version number.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'number', description: 'Wiki page ID' },
        version: { type: 'number', description: 'Version number' },
      },
      required: ['pageId', 'version'],
    },
  },
  {
    name: 'kanbu_restore_workspace_wiki_version',
    description:
      'Restore an old version of a workspace wiki page. Creates a new version (does not rewrite history).',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'number', description: 'Wiki page ID' },
        version: { type: 'number', description: 'Version number to restore' },
        changeNote: { type: 'string', description: 'Note for version history' },
      },
      required: ['pageId', 'version'],
    },
  },
];

// =============================================================================
// All Tool Definitions Combined (154 total)
// =============================================================================

export const allToolDefinitions = [
  ...workspaceToolDefinitions, // 2
  ...projectToolDefinitions, // 3
  ...taskToolDefinitions, // 6
  ...subtaskToolDefinitions, // 5
  ...commentToolDefinitions, // 4
  ...searchToolDefinitions, // 2
  ...activityToolDefinitions, // 3
  ...analyticsToolDefinitions, // 4
  ...adminToolDefinitions, // 11
  ...groupToolDefinitions, // 10
  ...aclToolDefinitions, // 20
  ...inviteToolDefinitions, // 5
  ...auditToolDefinitions, // 5
  ...systemToolDefinitions, // 12
  ...profileToolDefinitions, // 38 (includes connect/disconnect)
  ...githubToolDefinitions, // 10
  ...wikiToolDefinitions, // 18
];
// Total: 158 tools (includes kanbu_connect, kanbu_disconnect, kanbu_whoami which overlap)
