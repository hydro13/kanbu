/*
 * MCP Remote Endpoint
 * Version: 2.1.0
 *
 * HTTP endpoint for Model Context Protocol (MCP) integration.
 * Enables Claude.ai and other MCP clients to connect directly to Kanbu.
 *
 * Protocol: JSON-RPC 2.0 over HTTP with SSE responses
 * Auth:
 *   - API key (Bearer kb_xxx) - Phase 18
 *   - OAuth 2.1 access token (Bearer kat_xxx) - Phase 19.6
 *
 * Tools: 154+ (all Kanbu MCP tools)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: Phase 19.6 - OAuth Middleware for MCP
 * Claude Code: Opus 4.5
 * Date: 2026-01-19
 * ═══════════════════════════════════════════════════════════════════
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';
import { hashApiKey } from '../trpc/procedures/apiKey';
import { appRouter, type Context } from '../trpc';
import type { AuthSource } from '../trpc/context';
import { rateLimitService } from '../services/rateLimitService';
import type { AppRole } from '@prisma/client';
import { allToolDefinitions } from '../services/mcp/toolDefinitions';

// =============================================================================
// Types
// =============================================================================

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: string | number | null;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number | null;
}

interface McpApiKeyContext {
  authType: 'apiKey';
  userId: number;
  keyId: number;
  keyName: string;
  rateLimit: number;
  user: {
    id: number;
    email: string;
    username: string;
    role: AppRole;
  };
}

interface McpOAuthContext {
  authType: 'oauth';
  userId: number;
  tokenId: number;
  clientId: string;
  scope: string[];
  rateLimit: number;
  user: {
    id: number;
    email: string;
    username: string;
    role: AppRole;
  };
}

type McpAuthContext = McpApiKeyContext | McpOAuthContext;

// MCP Protocol version
const MCP_PROTOCOL_VERSION = '2024-11-05';
const SERVER_NAME = 'kanbu';
const SERVER_VERSION = '0.1.0';

// =============================================================================
// Authentication Functions
// =============================================================================

/**
 * Hash OAuth token using SHA-256 (same as token.ts)
 */
function hashOAuthToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Authenticate via API key (kb_ prefix)
 */
async function authenticateApiKey(key: string): Promise<McpApiKeyContext | null> {
  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
    },
    include: {
      user: { select: { id: true, email: true, username: true, role: true, isActive: true } },
    },
  });

  if (!apiKey || !apiKey.user.isActive) {
    return null;
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors
    });

  return {
    authType: 'apiKey',
    userId: apiKey.userId,
    keyId: apiKey.id,
    keyName: apiKey.name,
    rateLimit: apiKey.rateLimit,
    user: {
      id: apiKey.user.id,
      email: apiKey.user.email,
      username: apiKey.user.username,
      role: apiKey.user.role,
    },
  };
}

/**
 * Authenticate via OAuth 2.1 access token (kat_ prefix)
 */
async function authenticateOAuthToken(token: string): Promise<McpOAuthContext | null> {
  const tokenHash = hashOAuthToken(token);

  const oauthToken = await prisma.oAuthToken.findUnique({
    where: { tokenHash },
    include: {
      client: { select: { clientId: true } },
      user: { select: { id: true, email: true, username: true, role: true, isActive: true } },
    },
  });

  // Token not found or not an access token
  if (!oauthToken || oauthToken.tokenType !== 'access') {
    return null;
  }

  // Token revoked
  if (oauthToken.revokedAt) {
    return null;
  }

  // Token expired
  if (oauthToken.expiresAt < new Date()) {
    return null;
  }

  // User inactive
  if (!oauthToken.user.isActive) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  prisma.oAuthToken
    .update({
      where: { id: oauthToken.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors
    });

  // Parse scope string into array
  const scope = oauthToken.scope?.split(' ').filter(Boolean) || ['read'];

  return {
    authType: 'oauth',
    userId: oauthToken.userId,
    tokenId: oauthToken.id,
    clientId: oauthToken.client.clientId,
    scope,
    rateLimit: 100, // Default rate limit for OAuth tokens
    user: {
      id: oauthToken.user.id,
      email: oauthToken.user.email,
      username: oauthToken.user.username,
      role: oauthToken.user.role,
    },
  };
}

/**
 * Authenticate request using API key or OAuth token
 * Detects token type by prefix:
 *   - kb_  -> API key
 *   - kat_ -> OAuth access token
 */
async function authenticate(request: FastifyRequest): Promise<McpAuthContext | null> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  if (token.startsWith('kb_')) {
    // API key authentication
    return authenticateApiKey(token);
  } else if (token.startsWith('kat_')) {
    // OAuth access token authentication
    return authenticateOAuthToken(token);
  }

  // Unknown token format
  return null;
}

// =============================================================================
// Tool Execution
// =============================================================================

/**
 * Execute an MCP tool call by routing to the appropriate tRPC procedure
 */
async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  context: McpAuthContext
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  // Create a tRPC caller with the user context
  // Context differs based on auth type (API key vs OAuth)
  const callerContext = {
    req: {} as FastifyRequest,
    res: {} as FastifyReply,
    prisma,
    user: {
      id: context.user.id,
      email: context.user.email,
      username: context.user.username,
      role: context.user.role,
    },
    // API key context is only set for API key auth
    apiKeyContext:
      context.authType === 'apiKey'
        ? {
            userId: context.userId,
            keyId: context.keyId,
            keyName: context.keyName,
            scope: 'USER' as const,
            workspaceId: null,
            projectId: null,
            isServiceAccount: false,
            serviceAccountName: null,
            rateLimit: context.rateLimit,
          }
        : null,
    // OAuth context is set for OAuth auth
    oauthContext:
      context.authType === 'oauth'
        ? {
            userId: context.userId,
            tokenId: context.tokenId,
            clientId: context.clientId,
            scope: context.scope,
          }
        : null,
    authSource: (context.authType === 'apiKey' ? 'apiKey' : 'oauth') as AuthSource,
    assistantContext: null,
  } as Context;
  const caller = appRouter.createCaller(callerContext);

  try {
    // Route tool calls to tRPC procedures
    const result = await routeToolCall(caller, toolName, args);
    return {
      content: [{ type: 'text', text: formatToolResult(result) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
}

/**
 * Route a tool call to the appropriate tRPC procedure
 */
async function routeToolCall(
  caller: ReturnType<typeof appRouter.createCaller>,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  // Map tool names to tRPC procedures
  switch (toolName) {
    // =========================================================================
    // Workspace Tools (2)
    // =========================================================================
    case 'kanbu_list_workspaces':
      return caller.workspace.list();
    case 'kanbu_get_workspace':
      return caller.workspace.get({ workspaceId: args.id as number });

    // =========================================================================
    // Project Tools (3)
    // =========================================================================
    case 'kanbu_list_projects':
      return caller.project.list({ workspaceId: args.workspaceId as number });
    case 'kanbu_get_project':
      return caller.project.get({ projectId: args.id as number });
    case 'kanbu_create_project':
      return caller.project.create({
        workspaceId: args.workspaceId as number,
        name: args.name as string,
        description: args.description as string | undefined,
        identifier: args.prefix as string | undefined,
      });

    // =========================================================================
    // Task Tools (6)
    // =========================================================================
    case 'kanbu_list_tasks':
      return caller.task.list({
        projectId: args.projectId as number,
        isActive: args.status === 'closed' ? false : args.status === 'all' ? undefined : true,
        columnId: args.columnId as number | undefined,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_get_task':
      return caller.task.get({ taskId: args.id as number });
    case 'kanbu_create_task': {
      // Get first column if not specified
      let columnId = args.columnId as number | undefined;
      if (!columnId) {
        const columns = await caller.column.list({ projectId: args.projectId as number });
        const firstColumn = columns?.[0];
        if (firstColumn) {
          columnId = firstColumn.id;
        } else {
          throw new Error('No columns found in project. Cannot create task.');
        }
      }
      return caller.task.create({
        projectId: args.projectId as number,
        columnId,
        title: args.title as string,
        description: args.description as string | undefined,
        priority: args.priority as number | undefined,
        dateDue: args.dueDate as string | undefined,
        assigneeIds: args.assigneeIds as number[] | undefined,
      });
    }
    case 'kanbu_update_task':
      return caller.task.update({
        taskId: args.id as number,
        title: args.title as string | undefined,
        description: args.description as string | undefined,
        priority: args.priority as number | undefined,
        dateDue: args.dueDate as string | null | undefined,
      });
    case 'kanbu_move_task':
      return caller.task.move({
        taskId: args.id as number,
        columnId: args.columnId as number,
        position: args.position as number | undefined,
      });
    case 'kanbu_my_tasks':
      return caller.task.getAssignedToMe({
        status: args.status as 'open' | 'closed' | 'all' | undefined,
        limit: args.limit as number | undefined,
      });

    // =========================================================================
    // Subtask Tools (5)
    // =========================================================================
    case 'kanbu_list_subtasks':
      return caller.subtask.list({ taskId: args.taskId as number });
    case 'kanbu_create_subtask':
      return caller.subtask.create({
        taskId: args.taskId as number,
        title: args.title as string,
        description: args.description as string | undefined,
        assigneeId: args.assigneeId as number | undefined,
        timeEstimated: args.timeEstimated as number | undefined,
      });
    case 'kanbu_update_subtask':
      return caller.subtask.update({
        subtaskId: args.subtaskId as number,
        title: args.title as string | undefined,
        description: args.description as string | null | undefined,
        status: args.status as 'TODO' | 'IN_PROGRESS' | 'DONE' | undefined,
        assigneeId: args.assigneeId as number | null | undefined,
        timeEstimated: args.timeEstimated as number | undefined,
      });
    case 'kanbu_toggle_subtask': {
      // Toggle between TODO and DONE
      const subtask = await caller.subtask.get({ subtaskId: args.subtaskId as number });
      if (!subtask) {
        throw new Error(`Subtask ${args.subtaskId} not found`);
      }
      const newStatus = subtask.status === 'DONE' ? 'TODO' : 'DONE';
      return caller.subtask.update({
        subtaskId: args.subtaskId as number,
        status: newStatus,
      });
    }
    case 'kanbu_delete_subtask':
      return caller.subtask.delete({ subtaskId: args.subtaskId as number });

    // =========================================================================
    // Comment Tools (4)
    // =========================================================================
    case 'kanbu_list_comments':
      return caller.comment.list({
        taskId: args.taskId as number,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_add_comment':
      return caller.comment.create({
        taskId: args.taskId as number,
        content: args.content as string,
      });
    case 'kanbu_update_comment':
      return caller.comment.update({
        commentId: args.commentId as number,
        content: args.content as string,
      });
    case 'kanbu_delete_comment':
      return caller.comment.delete({ commentId: args.commentId as number });

    // =========================================================================
    // Search Tools (2)
    // =========================================================================
    case 'kanbu_search_tasks':
      return caller.task.list({
        projectId: args.projectId as number,
        search: args.query as string,
        isActive: args.includeCompleted ? undefined : true,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_search_global':
      return caller.search.global({
        projectId: args.projectId as number,
        query: args.query as string,
        entityTypes: args.types as ('task' | 'comment' | 'wiki')[] | undefined,
        limit: args.limit as number | undefined,
      });

    // =========================================================================
    // Activity Tools (3)
    // =========================================================================
    case 'kanbu_recent_activity':
      return caller.activity.list({
        projectId: args.projectId as number,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_task_activity':
      return caller.activity.list({
        projectId: 0, // Will be looked up from task
        entityType: 'task',
        entityId: args.taskId as number,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_activity_stats':
      return caller.activity.list({
        projectId: args.projectId as number,
        limit: 100,
      });

    // =========================================================================
    // Analytics Tools (4)
    // =========================================================================
    case 'kanbu_project_stats':
      return caller.analytics.getProjectStats({
        projectId: args.projectId as number,
        dateFrom: args.dateFrom as string | undefined,
        dateTo: args.dateTo as string | undefined,
      });
    case 'kanbu_velocity':
      return caller.analytics.getVelocity({
        projectId: args.projectId as number,
        weeks: args.weeks as number | undefined,
      });
    case 'kanbu_cycle_time':
      return caller.analytics.getCycleTime({
        projectId: args.projectId as number,
      });
    case 'kanbu_team_workload':
      return caller.analytics.getTeamWorkload({
        projectId: args.projectId as number,
      });

    // =========================================================================
    // Admin User Management Tools (11)
    // =========================================================================
    case 'kanbu_list_users':
      return caller.admin.listUsers({
        search: args.search as string | undefined,
        role: args.role as 'ADMIN' | 'MANAGER' | 'USER' | undefined,
        isActive: args.isActive as boolean | undefined,
        sortBy: args.sortBy as
          | 'id'
          | 'email'
          | 'username'
          | 'name'
          | 'createdAt'
          | 'lastLoginAt'
          | undefined,
        sortOrder: args.sortOrder as 'asc' | 'desc' | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_get_user':
      return caller.admin.getUser({ userId: args.userId as number });
    case 'kanbu_get_user_logins':
      return caller.admin.getUserLogins({
        userId: args.userId as number,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_create_user':
      return caller.admin.createUser({
        email: args.email as string,
        username: args.username as string,
        name: args.name as string,
        password: args.password as string,
        role: args.role as 'ADMIN' | 'MANAGER' | 'USER' | undefined,
      });
    case 'kanbu_update_user':
      return caller.admin.updateUser({
        userId: args.userId as number,
        email: args.email as string | undefined,
        username: args.username as string | undefined,
        name: args.name as string | undefined,
        role: args.role as 'ADMIN' | 'MANAGER' | 'USER' | undefined,
        isActive: args.isActive as boolean | undefined,
        language: args.language as string | undefined,
        timezone: args.timezone as string | undefined,
      });
    case 'kanbu_delete_user':
      return caller.admin.deleteUser({ userId: args.userId as number });
    case 'kanbu_reactivate_user':
      return caller.admin.reactivateUser({ userId: args.userId as number });
    case 'kanbu_reset_password':
      return caller.admin.resetPassword({
        userId: args.userId as number,
        newPassword: args.newPassword as string,
      });
    case 'kanbu_unlock_user':
      return caller.admin.unlockUser({ userId: args.userId as number });
    case 'kanbu_disable_2fa':
      return caller.admin.disable2FA({ userId: args.userId as number });
    case 'kanbu_revoke_sessions':
      return caller.admin.revokeSessions({ userId: args.userId as number });

    // =========================================================================
    // Group Tools (10)
    // =========================================================================
    case 'kanbu_list_groups':
      return caller.group.list({
        workspaceId: args.workspaceId as number | undefined,
        projectId: args.projectId as number | undefined,
        type: args.type as
          | 'SYSTEM'
          | 'WORKSPACE'
          | 'WORKSPACE_ADMIN'
          | 'PROJECT'
          | 'PROJECT_ADMIN'
          | 'CUSTOM'
          | undefined,
        search: args.search as string | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_get_group':
      return caller.group.get({ groupId: args.groupId as number });
    case 'kanbu_my_groups':
      return caller.group.myGroups({});
    case 'kanbu_list_group_members':
      return caller.group.listMembers({
        groupId: args.groupId as number,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_create_group':
      return caller.group.create({
        name: args.name as string,
        displayName: args.displayName as string,
        type: 'CUSTOM',
        description: args.description as string | undefined,
        workspaceId: args.workspaceId as number | undefined,
        projectId: args.projectId as number | undefined,
      });
    case 'kanbu_create_security_group':
      return caller.group.createSecurityGroup({
        name: args.name as string,
        displayName: args.displayName as string,
        description: args.description as string | undefined,
      });
    case 'kanbu_update_group':
      return caller.group.update({
        groupId: args.groupId as number,
        displayName: args.displayName as string | undefined,
        description: args.description as string | undefined,
        isActive: args.isActive as boolean | undefined,
      });
    case 'kanbu_delete_group':
      return caller.group.delete({ groupId: args.groupId as number });
    case 'kanbu_add_group_member':
      return caller.group.addMember({
        groupId: args.groupId as number,
        userId: args.userId as number,
      });
    case 'kanbu_remove_group_member':
      return caller.group.removeMember({
        groupId: args.groupId as number,
        userId: args.userId as number,
      });

    // =========================================================================
    // ACL Tools (20)
    // =========================================================================
    case 'kanbu_list_acl':
      return caller.acl.list({
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
      });
    case 'kanbu_check_permission':
      return caller.acl.checkPermission({
        userId: args.userId as number,
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
      });
    case 'kanbu_my_permission':
      return caller.acl.myPermission({
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
      });
    case 'kanbu_get_principals':
      return caller.acl.getPrincipals({
        search: args.search as string | undefined,
        workspaceId: args.workspaceId as number | undefined,
      });
    case 'kanbu_get_resources':
      return caller.acl.getResources();
    case 'kanbu_get_acl_presets':
      return caller.acl.getPresets();
    case 'kanbu_get_permission_matrix':
      return caller.acl.getPermissionMatrix({
        workspaceId: args.workspaceId as number | undefined,
        principalTypes: args.principalTypes as ('user' | 'group')[] | undefined,
        resourceTypes: args.resourceTypes as
          | (
              | 'root'
              | 'system'
              | 'dashboard'
              | 'workspace'
              | 'project'
              | 'feature'
              | 'admin'
              | 'profile'
            )[]
          | undefined,
        includeInherited: args.includeInherited as boolean | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_calculate_effective':
      return caller.acl.calculateEffective({
        userId: args.userId as number,
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
      });
    case 'kanbu_grant_permission':
      return caller.acl.grant({
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
        principalType: args.principalType as 'user' | 'group',
        principalId: args.principalId as number,
        permissions: args.permissions as number,
        inheritToChildren: args.inheritToChildren as boolean | undefined,
      });
    case 'kanbu_deny_permission':
      return caller.acl.deny({
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
        principalType: args.principalType as 'user' | 'group',
        principalId: args.principalId as number,
        permissions: args.permissions as number,
        inheritToChildren: args.inheritToChildren as boolean | undefined,
      });
    case 'kanbu_revoke_permission':
      return caller.acl.revoke({
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
        principalType: args.principalType as 'user' | 'group',
        principalId: args.principalId as number,
      });
    case 'kanbu_update_acl':
      return caller.acl.update({
        id: args.id as number,
        permissions: args.permissions as number,
        inheritToChildren: args.inheritToChildren as boolean | undefined,
      });
    case 'kanbu_delete_acl':
      return caller.acl.delete({ id: args.id as number });
    case 'kanbu_bulk_grant':
      return caller.acl.bulkGrant({
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
        principals: args.principals as Array<{ type: 'user' | 'group'; id: number }>,
        permissions: args.permissions as number,
        inheritToChildren: args.inheritToChildren as boolean | undefined,
      });
    case 'kanbu_bulk_revoke':
      return caller.acl.bulkRevoke({
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
        principals: args.principals as Array<{ type: 'user' | 'group'; id: number }>,
      });
    case 'kanbu_copy_permissions':
      return caller.acl.copyPermissions({
        sourceResourceType: args.sourceResourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        sourceResourceId: args.sourceResourceId as number | null,
        targetResources: args.targetResources as Array<{
          type:
            | 'root'
            | 'system'
            | 'dashboard'
            | 'workspace'
            | 'project'
            | 'feature'
            | 'admin'
            | 'profile';
          id: number | null;
        }>,
        overwrite: args.overwrite as boolean | undefined,
      });
    case 'kanbu_apply_template':
      return caller.acl.applyTemplate({
        templateName: args.templateName as 'read_only' | 'contributor' | 'editor' | 'full_control',
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
        principals: args.principals as Array<{ type: 'user' | 'group'; id: number }>,
        inheritToChildren: args.inheritToChildren as boolean | undefined,
      });
    case 'kanbu_simulate_change':
      return caller.acl.simulateChange({
        action: args.action as 'grant' | 'deny' | 'revoke' | 'template',
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile',
        resourceId: args.resourceId as number | null,
        principals: args.principals as Array<{ type: 'user' | 'group'; id: number }>,
        permissions: args.permissions as number | undefined,
        templateName: args.templateName as
          | 'read_only'
          | 'contributor'
          | 'editor'
          | 'full_control'
          | undefined,
      });
    case 'kanbu_export_acl':
      return caller.acl.exportAcl({
        format: args.format as 'json' | 'csv',
        resourceType: args.resourceType as
          | 'root'
          | 'system'
          | 'dashboard'
          | 'workspace'
          | 'project'
          | 'feature'
          | 'admin'
          | 'profile'
          | undefined,
        resourceId: args.resourceId as number | null | undefined,
        includeChildren: args.includeChildren as boolean | undefined,
      });
    case 'kanbu_import_acl':
      return caller.acl.importExecute({
        data: args.data as string,
        format: args.format as 'json' | 'csv',
        mode: args.mode as 'skip' | 'overwrite' | 'merge',
      });

    // =========================================================================
    // Invite Tools (5)
    // =========================================================================
    case 'kanbu_list_invites':
      return caller.admin.listInvites({
        status: args.status as 'all' | 'pending' | 'accepted' | 'expired' | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_get_invite':
      return caller.admin.getInvite({ inviteId: args.inviteId as number });
    case 'kanbu_send_invite':
      return caller.admin.sendInvite({
        emails: args.emails as string[],
        role: args.role as 'ADMIN' | 'MANAGER' | 'USER' | undefined,
        expiresInDays: args.expiresInDays as number | undefined,
      });
    case 'kanbu_cancel_invite':
      return caller.admin.cancelInvite({ inviteId: args.inviteId as number });
    case 'kanbu_resend_invite':
      return caller.admin.resendInvite({
        inviteId: args.inviteId as number,
        expiresInDays: args.expiresInDays as number | undefined,
      });

    // =========================================================================
    // Audit Tools (5)
    // =========================================================================
    case 'kanbu_list_audit_logs':
      return caller.auditLog.list({
        category: args.category as
          | 'USER'
          | 'WORKSPACE'
          | 'PROJECT'
          | 'TASK'
          | 'ACL'
          | 'GROUP'
          | 'SETTINGS'
          | 'SUBTASK'
          | 'COMMENT'
          | undefined,
        action: args.action as string | undefined,
        userId: args.userId as number | undefined,
        workspaceId: args.workspaceId as number | undefined,
        resourceType: args.resourceType as string | undefined,
        resourceId: args.resourceId as number | undefined,
        search: args.search as string | undefined,
        dateFrom: args.dateFrom ? new Date(args.dateFrom as string) : undefined,
        dateTo: args.dateTo ? new Date(args.dateTo as string) : undefined,
        sortOrder: args.sortOrder as 'asc' | 'desc' | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_get_audit_log':
      return caller.auditLog.get({ id: args.id as number });
    case 'kanbu_audit_stats':
      return caller.auditLog.getStats({
        workspaceId: args.workspaceId as number | undefined,
        dateFrom: args.dateFrom ? new Date(args.dateFrom as string) : undefined,
        dateTo: args.dateTo ? new Date(args.dateTo as string) : undefined,
      });
    case 'kanbu_export_audit_logs':
      return caller.auditLog.export({
        format: args.format as 'csv' | 'json',
        category: args.category as
          | 'USER'
          | 'WORKSPACE'
          | 'PROJECT'
          | 'TASK'
          | 'ACL'
          | 'GROUP'
          | 'SETTINGS'
          | 'SUBTASK'
          | 'COMMENT'
          | undefined,
        workspaceId: args.workspaceId as number | undefined,
        dateFrom: args.dateFrom ? new Date(args.dateFrom as string) : undefined,
        dateTo: args.dateTo ? new Date(args.dateTo as string) : undefined,
      });
    case 'kanbu_get_audit_categories':
      return caller.auditLog.getCategories();

    // =========================================================================
    // System Tools (12)
    // =========================================================================
    case 'kanbu_get_settings':
      return caller.admin.getSettings();
    case 'kanbu_get_setting':
      return caller.admin.getSetting({ key: args.key as string });
    case 'kanbu_set_setting':
      return caller.admin.setSetting({
        key: args.key as string,
        value: args.value as string | null,
      });
    case 'kanbu_set_settings':
      return caller.admin.setSettings({
        settings: args.settings as Record<string, string | null>,
      });
    case 'kanbu_delete_setting':
      return caller.admin.deleteSetting({ key: args.key as string });
    case 'kanbu_create_db_backup':
      return caller.admin.createBackup();
    case 'kanbu_create_source_backup':
      return caller.admin.createSourceBackup();
    case 'kanbu_admin_list_workspaces':
      return caller.admin.listAllWorkspaces({
        search: args.search as string | undefined,
        isActive: args.isActive as boolean | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_admin_get_workspace':
      return caller.admin.getWorkspace({ workspaceId: args.workspaceId as number });
    case 'kanbu_admin_update_workspace':
      return caller.admin.updateWorkspace({
        workspaceId: args.workspaceId as number,
        name: args.name as string | undefined,
        description: args.description as string | null | undefined,
        logoUrl: args.logoUrl as string | null | undefined,
        isActive: args.isActive as boolean | undefined,
      });
    case 'kanbu_admin_delete_workspace':
      return caller.admin.deleteWorkspace({ workspaceId: args.workspaceId as number });
    case 'kanbu_admin_reactivate_workspace':
      return caller.admin.reactivateWorkspace({ workspaceId: args.workspaceId as number });

    // =========================================================================
    // Profile Tools (36)
    // =========================================================================
    case 'kanbu_whoami':
    case 'kanbu_get_profile':
      return caller.user.getProfile();
    case 'kanbu_get_time_tracking':
      return caller.user.getTimeTracking({
        dateFrom: args.dateFrom as string | undefined,
        dateTo: args.dateTo as string | undefined,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_get_logins':
      return caller.user.getLastLogins({
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_get_sessions':
      return caller.user.getSessions();
    case 'kanbu_get_password_history':
      return caller.user.getPasswordResets({
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
    case 'kanbu_get_metadata':
      return caller.user.getMetadata();
    case 'kanbu_update_profile':
      return caller.user.updateProfile({
        name: args.name as string | undefined,
        timezone: args.timezone as string | undefined,
        language: args.language as string | undefined,
        theme: args.theme as 'light' | 'dark' | 'system' | undefined,
      });
    case 'kanbu_remove_avatar':
      return caller.user.removeAvatar();
    case 'kanbu_change_password':
      return caller.user.changePassword({
        currentPassword: args.currentPassword as string,
        newPassword: args.newPassword as string,
      });
    case 'kanbu_get_2fa_status':
      return caller.user.get2FAStatus();
    case 'kanbu_setup_2fa':
      return caller.user.setup2FA();
    case 'kanbu_verify_2fa':
      return caller.user.verify2FA({ token: args.token as string });
    case 'kanbu_disable_own_2fa':
      return caller.user.disable2FA({ password: args.password as string });
    case 'kanbu_regenerate_backup_codes':
      // Note: This might need a re-verification first
      return {
        message: 'Backup code regeneration requires re-verification. Please use the web UI.',
      };
    case 'kanbu_get_public_access':
      return caller.user.getPublicAccess();
    case 'kanbu_enable_public_access':
      return caller.user.enablePublicAccess();
    case 'kanbu_disable_public_access':
      return caller.user.disablePublicAccess();
    case 'kanbu_regenerate_public_token':
      return caller.user.regeneratePublicToken();
    case 'kanbu_get_notification_settings':
      return caller.notification.getSettings();
    case 'kanbu_update_notification_settings':
      return caller.notification.updateSettings({
        notificationsEnabled: args.enabled as boolean | undefined,
        notificationFilter: args.filter as number | undefined,
      });
    case 'kanbu_list_external_accounts':
      return caller.user.getConnectedAccounts();
    case 'kanbu_unlink_external_account':
      return caller.user.unlinkAccount({
        provider: args.provider as 'google' | 'github' | 'gitlab',
      });
    case 'kanbu_list_api_tokens':
      return caller.apiKey.list();
    case 'kanbu_create_api_token':
      return caller.apiKey.create({
        name: args.name as string,
        scope: args.scope as 'USER' | 'WORKSPACE' | 'PROJECT' | undefined,
        workspaceId: args.workspaceId as number | undefined,
        projectId: args.projectId as number | undefined,
        permissions: args.permissions as
          | (
              | 'tasks:read'
              | 'tasks:write'
              | 'projects:read'
              | 'projects:write'
              | 'comments:read'
              | 'comments:write'
              | 'webhooks:read'
              | 'webhooks:write'
            )[]
          | undefined,
        expiresAt: args.expiresAt as string | undefined,
        rateLimit: args.rateLimit as number | undefined,
        isServiceAccount: args.isServiceAccount as boolean | undefined,
        serviceAccountName: args.serviceAccountName as string | undefined,
      });
    case 'kanbu_revoke_api_token':
      return caller.apiKey.revoke({ keyId: args.keyId as number });
    case 'kanbu_get_api_permissions':
      return caller.apiKey.getPermissions();
    case 'kanbu_list_ai_bindings':
      return caller.assistant.getBindings();
    case 'kanbu_revoke_ai_binding':
      return caller.assistant.revokeBinding({ bindingId: args.bindingId as number });
    case 'kanbu_get_hourly_rate':
      return caller.user.getHourlyRate();
    case 'kanbu_set_hourly_rate':
      return caller.user.updateHourlyRate({ hourlyRate: args.hourlyRate as number });
    case 'kanbu_set_metadata':
      return caller.user.setMetadata({
        key: args.key as string,
        value: args.value as string,
      });
    case 'kanbu_delete_metadata':
      return caller.user.deleteMetadata({ key: args.key as string });
    case 'kanbu_revoke_session':
      return caller.user.revokeSession({ sessionId: args.sessionId as string });
    case 'kanbu_revoke_all_sessions':
      return caller.user.revokeAllSessions();
    // Connection tools (not needed for remote MCP - already authenticated)
    case 'kanbu_connect':
      return { message: 'Already connected via API key authentication.' };
    case 'kanbu_disconnect':
      return { message: 'Disconnect not needed for remote MCP. Just stop using the API key.' };

    // =========================================================================
    // GitHub Tools (10)
    // =========================================================================
    case 'kanbu_get_github_repo':
      return caller.github.getLinkedRepository({ projectId: args.projectId as number });
    case 'kanbu_list_github_prs':
      return caller.github.listProjectPRs({
        projectId: args.projectId as number,
        state: args.state as 'open' | 'closed' | 'all' | undefined,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_list_github_commits':
      return caller.github.listProjectCommits({
        projectId: args.projectId as number,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_get_task_prs':
      return caller.github.getTaskPRs({ taskId: args.taskId as number });
    case 'kanbu_get_task_commits':
      return caller.github.getTaskCommits({ taskId: args.taskId as number });
    case 'kanbu_link_github_repo':
      return caller.github.linkRepository({
        projectId: args.projectId as number,
        installationId: args.installationId as number,
        repoId: args.repoId as number,
        owner: args.owner as string,
        name: args.name as string,
        fullName: args.fullName as string,
        isPrivate: args.isPrivate as boolean | undefined,
        defaultBranch: args.defaultBranch as string | undefined,
      });
    case 'kanbu_unlink_github_repo':
      return caller.github.unlinkRepository({ projectId: args.projectId as number });
    case 'kanbu_sync_github_issues':
      return caller.github.importIssues({
        projectId: args.projectId as number,
        state: args.state as 'open' | 'closed' | 'all' | undefined,
      });
    case 'kanbu_create_github_branch':
      return caller.github.createBranch({
        taskId: args.taskId as number,
        customBranchName: args.customBranchName as string | undefined,
      });
    case 'kanbu_link_pr_to_task':
      return caller.github.linkPRToTask({
        prId: args.prId as number,
        taskId: args.taskId as number,
      });

    // =========================================================================
    // Wiki Tools (18) - Project & Workspace
    // =========================================================================
    // Project Wiki
    case 'kanbu_list_project_wiki_pages':
      return caller.projectWiki.list({
        projectId: args.projectId as number,
        parentId: args.parentId as number | null | undefined,
        includeUnpublished: args.includeUnpublished as boolean | undefined,
      });
    case 'kanbu_get_project_wiki_page':
      return caller.projectWiki.get({ id: args.id as number });
    case 'kanbu_get_project_wiki_page_by_slug':
      return caller.projectWiki.getBySlug({
        projectId: args.projectId as number,
        slug: args.slug as string,
      });
    case 'kanbu_create_project_wiki_page':
      return caller.projectWiki.create({
        projectId: args.projectId as number,
        title: args.title as string,
        content: args.content as string | undefined,
        parentId: args.parentId as number | null | undefined,
        status: args.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined,
      });
    case 'kanbu_update_project_wiki_page':
      return caller.projectWiki.update({
        id: args.id as number,
        title: args.title as string | undefined,
        content: args.content as string | undefined,
        parentId: args.parentId as number | null | undefined,
        status: args.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined,
        changeNote: args.changeNote as string | undefined,
      });
    case 'kanbu_delete_project_wiki_page':
      return caller.projectWiki.delete({ id: args.id as number });
    case 'kanbu_get_project_wiki_versions':
      return caller.projectWiki.getVersions({
        pageId: args.pageId as number,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_get_project_wiki_version':
      return caller.projectWiki.getVersion({
        pageId: args.pageId as number,
        version: args.version as number,
      });
    case 'kanbu_restore_project_wiki_version':
      return caller.projectWiki.restoreVersion({
        pageId: args.pageId as number,
        version: args.version as number,
        changeNote: args.changeNote as string | undefined,
      });
    // Workspace Wiki
    case 'kanbu_list_workspace_wiki_pages':
      return caller.workspaceWiki.list({
        workspaceId: args.workspaceId as number,
        parentId: args.parentId as number | null | undefined,
        includeUnpublished: args.includeUnpublished as boolean | undefined,
      });
    case 'kanbu_get_workspace_wiki_page':
      return caller.workspaceWiki.get({ id: args.id as number });
    case 'kanbu_get_workspace_wiki_page_by_slug':
      return caller.workspaceWiki.getBySlug({
        workspaceId: args.workspaceId as number,
        slug: args.slug as string,
      });
    case 'kanbu_create_workspace_wiki_page':
      return caller.workspaceWiki.create({
        workspaceId: args.workspaceId as number,
        title: args.title as string,
        content: args.content as string | undefined,
        parentId: args.parentId as number | null | undefined,
        status: args.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined,
      });
    case 'kanbu_update_workspace_wiki_page':
      return caller.workspaceWiki.update({
        id: args.id as number,
        title: args.title as string | undefined,
        content: args.content as string | undefined,
        parentId: args.parentId as number | null | undefined,
        status: args.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined,
        changeNote: args.changeNote as string | undefined,
      });
    case 'kanbu_delete_workspace_wiki_page':
      return caller.workspaceWiki.delete({ id: args.id as number });
    case 'kanbu_get_workspace_wiki_versions':
      return caller.workspaceWiki.getVersions({
        pageId: args.pageId as number,
        limit: args.limit as number | undefined,
      });
    case 'kanbu_get_workspace_wiki_version':
      return caller.workspaceWiki.getVersion({
        pageId: args.pageId as number,
        version: args.version as number,
      });
    case 'kanbu_restore_workspace_wiki_version':
      return caller.workspaceWiki.restoreVersion({
        pageId: args.pageId as number,
        version: args.version as number,
        changeNote: args.changeNote as string | undefined,
      });

    // =========================================================================
    // Default - Unknown Tool
    // =========================================================================
    default:
      throw new Error(
        `Unknown tool: ${toolName}. This tool may not be available via the remote MCP endpoint yet.`
      );
  }
}

/**
 * Format a tool result for MCP response
 */
function formatToolResult(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }
  if (result === null || result === undefined) {
    return 'Success (no data returned)';
  }
  // Format as readable JSON
  return JSON.stringify(result, null, 2);
}

// =============================================================================
// MCP Request Handler
// =============================================================================

async function handleMcpRequest(
  request: JsonRpcRequest,
  context: McpAuthContext
): Promise<JsonRpcResponse> {
  const { method, params, id } = request;

  try {
    let result: unknown;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: MCP_PROTOCOL_VERSION,
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION,
          },
          capabilities: {
            tools: {},
          },
        };
        break;

      case 'notifications/initialized':
        // Client acknowledgment - no response needed
        return { jsonrpc: '2.0', result: {}, id };

      case 'tools/list':
        result = {
          tools: allToolDefinitions,
        };
        break;

      case 'tools/call':
        if (!params?.name) {
          return {
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Missing tool name' },
            id,
          };
        }
        result = await executeToolCall(
          params.name as string,
          (params.arguments as Record<string, unknown>) || {},
          context
        );
        break;

      case 'ping':
        result = {};
        break;

      default:
        return {
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${method}` },
          id,
        };
    }

    return { jsonrpc: '2.0', result, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return {
      jsonrpc: '2.0',
      error: { code: -32603, message },
      id,
    };
  }
}

// =============================================================================
// Route Registration
// =============================================================================

export async function registerMcpRoutes(fastify: FastifyInstance) {
  // Check if MCP endpoint is enabled
  if (process.env.MCP_ENABLED === 'false') {
    fastify.log.info('[MCP] Remote MCP endpoint disabled via MCP_ENABLED=false');
    return;
  }

  fastify.log.info('[MCP] Registering remote MCP endpoint at /mcp');

  // MCP endpoint - POST /mcp
  fastify.post('/mcp', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate (supports both API key and OAuth token)
    const context = await authenticate(request);
    if (!context) {
      return reply.status(401).send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message:
            'Unauthorized. Use Authorization: Bearer kb_xxx (API key) or Bearer kat_xxx (OAuth token)',
        },
        id: null,
      });
    }

    // Rate limit - use different key prefix for API key vs OAuth
    const rateLimitKey =
      context.authType === 'apiKey' ? `mcp:key:${context.keyId}` : `mcp:oauth:${context.tokenId}`;
    const rateLimit = process.env.MCP_RATE_LIMIT
      ? parseInt(process.env.MCP_RATE_LIMIT, 10)
      : context.rateLimit;

    if (!rateLimitService.check(rateLimitKey, rateLimit)) {
      return reply.status(429).send({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Rate limit exceeded' },
        id: null,
      });
    }

    // Parse request
    const body = request.body as JsonRpcRequest | JsonRpcRequest[];

    // Handle batch requests
    if (Array.isArray(body)) {
      const responses = await Promise.all(body.map((req) => handleMcpRequest(req, context)));
      // Return as SSE
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');
      return reply.send(responses.map((r) => `data: ${JSON.stringify(r)}\n\n`).join(''));
    }

    // Handle single request
    const response = await handleMcpRequest(body, context);

    // Return as SSE (MCP HTTP transport uses SSE)
    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');

    return reply.send(`data: ${JSON.stringify(response)}\n\n`);
  });

  // Also support GET for info
  fastify.get('/mcp', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      name: 'Kanbu MCP Endpoint',
      version: SERVER_VERSION,
      protocol: MCP_PROTOCOL_VERSION,
      tools: allToolDefinitions.length,
      documentation: 'Use POST /mcp with JSON-RPC 2.0 requests',
    });
  });
}
