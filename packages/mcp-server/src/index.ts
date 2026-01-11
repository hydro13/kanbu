#!/usr/bin/env node
/*
 * Kanbu MCP Server
 * Version: 2.0.0
 *
 * MCP Server for Claude Code integration with Kanbu.
 * Implements pairing flow and provides tools for project/task management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 12 - Profile Management (ALL PHASES COMPLETE!)
 * ═══════════════════════════════════════════════════════════════════
 */

// Allow self-signed certificates for local development
// This must be set before any fetch calls
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { TokenStorage } from './storage.js'
import { KanbuClient } from './client.js'
import { getMachineId, getMachineName } from './machine.js'

// Tool imports
import {
  workspaceToolDefinitions,
  handleListWorkspaces,
  handleGetWorkspace,
} from './tools/workspaces.js'
import {
  projectToolDefinitions,
  handleListProjects,
  handleGetProject,
  handleCreateProject,
} from './tools/projects.js'
import {
  taskToolDefinitions,
  handleListTasks,
  handleGetTask,
  handleCreateTask,
  handleUpdateTask,
  handleMoveTask,
  handleMyTasks,
} from './tools/tasks.js'
import {
  subtaskToolDefinitions,
  handleListSubtasks,
  handleCreateSubtask,
  handleUpdateSubtask,
  handleToggleSubtask,
  handleDeleteSubtask,
} from './tools/subtasks.js'
import {
  commentToolDefinitions,
  handleListComments,
  handleAddComment,
  handleUpdateComment,
  handleDeleteComment,
} from './tools/comments.js'
import {
  searchToolDefinitions,
  handleSearchTasks,
  handleSearchGlobal,
} from './tools/search.js'
import {
  activityToolDefinitions,
  handleRecentActivity,
  handleTaskActivity,
  handleActivityStats,
} from './tools/activity.js'
import {
  analyticsToolDefinitions,
  handleProjectStats,
  handleVelocity,
  handleCycleTime,
  handleTeamWorkload,
} from './tools/analytics.js'
import {
  adminToolDefinitions,
  handleListUsers,
  handleGetUser,
  handleGetUserLogins,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleReactivateUser,
  handleResetPassword,
  handleUnlockUser,
  handleDisable2FA,
  handleRevokeSessions,
} from './tools/admin.js'
import {
  groupToolDefinitions,
  handleListGroups,
  handleGetGroup,
  handleMyGroups,
  handleListGroupMembers,
  handleCreateGroup,
  handleCreateSecurityGroup,
  handleUpdateGroup,
  handleDeleteGroup,
  handleAddGroupMember,
  handleRemoveGroupMember,
} from './tools/groups.js'
import {
  aclToolDefinitions,
  handleListAcl,
  handleCheckPermission,
  handleMyPermission,
  handleGetPrincipals,
  handleGetResources,
  handleGetAclPresets,
  handleGetPermissionMatrix,
  handleCalculateEffective,
  handleGrantPermission,
  handleDenyPermission,
  handleRevokePermission,
  handleUpdateAcl,
  handleDeleteAcl,
  handleBulkGrant,
  handleBulkRevoke,
  handleCopyPermissions,
  handleApplyTemplate,
  handleSimulateChange,
  handleExportAcl,
  handleImportAcl,
} from './tools/acl.js'
import {
  inviteToolDefinitions,
  handleListInvites,
  handleGetInvite,
  handleSendInvite,
  handleCancelInvite,
  handleResendInvite,
} from './tools/invites.js'
import {
  auditToolDefinitions,
  handleListAuditLogs,
  handleGetAuditLog,
  handleAuditStats,
  handleExportAuditLogs,
  handleGetAuditCategories,
} from './tools/audit.js'
import {
  systemToolDefinitions,
  handleGetSettings,
  handleGetSetting,
  handleSetSetting,
  handleSetSettings,
  handleDeleteSetting,
  handleCreateDbBackup,
  handleCreateSourceBackup,
  handleAdminListWorkspaces,
  handleAdminGetWorkspace,
  handleAdminUpdateWorkspace,
  handleAdminDeleteWorkspace,
  handleAdminReactivateWorkspace,
} from './tools/system.js'
import {
  profileToolDefinitions,
  handleGetProfile,
  handleGetTimeTracking,
  handleGetLogins,
  handleGetSessions,
  handleGetPasswordHistory,
  handleGetMetadata,
  handleUpdateProfile,
  handleRemoveAvatar,
  handleChangePassword,
  handleGet2FAStatus,
  handleSetup2FA,
  handleVerify2FA,
  handleDisableOwn2FA,
  handleRegenerateBackupCodes,
  handleGetPublicAccess,
  handleEnablePublicAccess,
  handleDisablePublicAccess,
  handleRegeneratePublicToken,
  handleGetNotificationSettings,
  handleUpdateNotificationSettings,
  handleListExternalAccounts,
  handleUnlinkExternalAccount,
  handleListApiTokens,
  handleCreateApiToken,
  handleRevokeApiToken,
  handleGetApiPermissions,
  handleListAiBindings,
  handleRevokeAiBinding,
  handleGetHourlyRate,
  handleSetHourlyRate,
  handleSetMetadata,
  handleDeleteMetadata,
  handleRevokeSession,
  handleRevokeAllSessions,
} from './tools/profile.js'
import {
  githubToolDefinitions,
  handleGetGitHubRepo,
  handleListGitHubPRs,
  handleListGitHubCommits,
  handleGetTaskPRs,
  handleGetTaskCommits,
  handleLinkGitHubRepo,
  handleUnlinkGitHubRepo,
  handleSyncGitHubIssues,
  handleCreateGitHubBranch,
  handleLinkPRToTask,
} from './tools/github.js'

// =============================================================================
// Tool Schemas
// =============================================================================

const ConnectSchema = z.object({
  code: z.string().describe('Setup code from Kanbu profile page (format: KNB-XXXX-XXXX)'),
})

const DisconnectSchema = z.object({})

const WhoAmISchema = z.object({})

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  {
    name: 'kanbu-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Storage and client instances
const storage = new TokenStorage()
const client = new KanbuClient()

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Pairing tools (Fase 1)
      {
        name: 'kanbu_connect',
        description: 'Connect to Kanbu using a setup code from your profile page. After connecting, you can manage projects and tasks on behalf of the user.',
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
        name: 'kanbu_whoami',
        description: 'Show current connection status and user information.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'kanbu_disconnect',
        description: 'Disconnect from Kanbu and remove local credentials.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // Workspace tools (Fase 2)
      ...workspaceToolDefinitions,
      // Project tools (Fase 2)
      ...projectToolDefinitions,
      // Task tools (Fase 2)
      ...taskToolDefinitions,
      // Subtask tools (Fase 3)
      ...subtaskToolDefinitions,
      // Comment tools (Fase 3)
      ...commentToolDefinitions,
      // Search tools (Fase 4)
      ...searchToolDefinitions,
      // Activity tools (Fase 4)
      ...activityToolDefinitions,
      // Analytics tools (Fase 5)
      ...analyticsToolDefinitions,
      // Admin tools (Fase 6)
      ...adminToolDefinitions,
      // Group tools (Fase 7)
      ...groupToolDefinitions,
      // ACL tools (Fase 8)
      ...aclToolDefinitions,
      // Invite tools (Fase 9)
      ...inviteToolDefinitions,
      // Audit tools (Fase 10)
      ...auditToolDefinitions,
      // System tools (Fase 11)
      ...systemToolDefinitions,
      // Profile tools (Fase 12)
      ...profileToolDefinitions,
      // GitHub tools (GitHub Connector Fase 9)
      ...githubToolDefinitions,
    ],
  }
})

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      // Pairing tools (Fase 1)
      case 'kanbu_connect':
        return await handleConnect(args)
      case 'kanbu_whoami':
        return await handleWhoAmI()
      case 'kanbu_disconnect':
        return await handleDisconnect()

      // Workspace tools (Fase 2)
      case 'kanbu_list_workspaces':
        return await handleListWorkspaces(args)
      case 'kanbu_get_workspace':
        return await handleGetWorkspace(args)

      // Project tools (Fase 2)
      case 'kanbu_list_projects':
        return await handleListProjects(args)
      case 'kanbu_get_project':
        return await handleGetProject(args)
      case 'kanbu_create_project':
        return await handleCreateProject(args)

      // Task tools (Fase 2)
      case 'kanbu_list_tasks':
        return await handleListTasks(args)
      case 'kanbu_get_task':
        return await handleGetTask(args)
      case 'kanbu_create_task':
        return await handleCreateTask(args)
      case 'kanbu_update_task':
        return await handleUpdateTask(args)
      case 'kanbu_move_task':
        return await handleMoveTask(args)
      case 'kanbu_my_tasks':
        return await handleMyTasks(args)

      // Subtask tools (Fase 3)
      case 'kanbu_list_subtasks':
        return await handleListSubtasks(args)
      case 'kanbu_create_subtask':
        return await handleCreateSubtask(args)
      case 'kanbu_update_subtask':
        return await handleUpdateSubtask(args)
      case 'kanbu_toggle_subtask':
        return await handleToggleSubtask(args)
      case 'kanbu_delete_subtask':
        return await handleDeleteSubtask(args)

      // Comment tools (Fase 3)
      case 'kanbu_list_comments':
        return await handleListComments(args)
      case 'kanbu_add_comment':
        return await handleAddComment(args)
      case 'kanbu_update_comment':
        return await handleUpdateComment(args)
      case 'kanbu_delete_comment':
        return await handleDeleteComment(args)

      // Search tools (Fase 4)
      case 'kanbu_search_tasks':
        return await handleSearchTasks(args)
      case 'kanbu_search_global':
        return await handleSearchGlobal(args)

      // Activity tools (Fase 4)
      case 'kanbu_recent_activity':
        return await handleRecentActivity(args)
      case 'kanbu_task_activity':
        return await handleTaskActivity(args)
      case 'kanbu_activity_stats':
        return await handleActivityStats(args)

      // Analytics tools (Fase 5)
      case 'kanbu_project_stats':
        return await handleProjectStats(args)
      case 'kanbu_velocity':
        return await handleVelocity(args)
      case 'kanbu_cycle_time':
        return await handleCycleTime(args)
      case 'kanbu_team_workload':
        return await handleTeamWorkload(args)

      // Admin tools (Fase 6)
      case 'kanbu_list_users':
        return await handleListUsers(args)
      case 'kanbu_get_user':
        return await handleGetUser(args)
      case 'kanbu_get_user_logins':
        return await handleGetUserLogins(args)
      case 'kanbu_create_user':
        return await handleCreateUser(args)
      case 'kanbu_update_user':
        return await handleUpdateUser(args)
      case 'kanbu_delete_user':
        return await handleDeleteUser(args)
      case 'kanbu_reactivate_user':
        return await handleReactivateUser(args)
      case 'kanbu_reset_password':
        return await handleResetPassword(args)
      case 'kanbu_unlock_user':
        return await handleUnlockUser(args)
      case 'kanbu_disable_2fa':
        return await handleDisable2FA(args)
      case 'kanbu_revoke_sessions':
        return await handleRevokeSessions(args)

      // Group tools (Fase 7)
      case 'kanbu_list_groups':
        return await handleListGroups(args)
      case 'kanbu_get_group':
        return await handleGetGroup(args)
      case 'kanbu_my_groups':
        return await handleMyGroups(args)
      case 'kanbu_list_group_members':
        return await handleListGroupMembers(args)
      case 'kanbu_create_group':
        return await handleCreateGroup(args)
      case 'kanbu_create_security_group':
        return await handleCreateSecurityGroup(args)
      case 'kanbu_update_group':
        return await handleUpdateGroup(args)
      case 'kanbu_delete_group':
        return await handleDeleteGroup(args)
      case 'kanbu_add_group_member':
        return await handleAddGroupMember(args)
      case 'kanbu_remove_group_member':
        return await handleRemoveGroupMember(args)

      // ACL tools (Fase 8)
      case 'kanbu_list_acl':
        return await handleListAcl(args)
      case 'kanbu_check_permission':
        return await handleCheckPermission(args)
      case 'kanbu_my_permission':
        return await handleMyPermission(args)
      case 'kanbu_get_principals':
        return await handleGetPrincipals(args)
      case 'kanbu_get_resources':
        return await handleGetResources(args)
      case 'kanbu_get_acl_presets':
        return await handleGetAclPresets(args)
      case 'kanbu_get_permission_matrix':
        return await handleGetPermissionMatrix(args)
      case 'kanbu_calculate_effective':
        return await handleCalculateEffective(args)
      case 'kanbu_grant_permission':
        return await handleGrantPermission(args)
      case 'kanbu_deny_permission':
        return await handleDenyPermission(args)
      case 'kanbu_revoke_permission':
        return await handleRevokePermission(args)
      case 'kanbu_update_acl':
        return await handleUpdateAcl(args)
      case 'kanbu_delete_acl':
        return await handleDeleteAcl(args)
      case 'kanbu_bulk_grant':
        return await handleBulkGrant(args)
      case 'kanbu_bulk_revoke':
        return await handleBulkRevoke(args)
      case 'kanbu_copy_permissions':
        return await handleCopyPermissions(args)
      case 'kanbu_apply_template':
        return await handleApplyTemplate(args)
      case 'kanbu_simulate_change':
        return await handleSimulateChange(args)
      case 'kanbu_export_acl':
        return await handleExportAcl(args)
      case 'kanbu_import_acl':
        return await handleImportAcl(args)

      // Invite tools (Fase 9)
      case 'kanbu_list_invites':
        return await handleListInvites(args)
      case 'kanbu_get_invite':
        return await handleGetInvite(args)
      case 'kanbu_send_invite':
        return await handleSendInvite(args)
      case 'kanbu_cancel_invite':
        return await handleCancelInvite(args)
      case 'kanbu_resend_invite':
        return await handleResendInvite(args)

      // Audit tools (Fase 10)
      case 'kanbu_list_audit_logs':
        return await handleListAuditLogs(args)
      case 'kanbu_get_audit_log':
        return await handleGetAuditLog(args)
      case 'kanbu_audit_stats':
        return await handleAuditStats(args)
      case 'kanbu_export_audit_logs':
        return await handleExportAuditLogs(args)
      case 'kanbu_get_audit_categories':
        return await handleGetAuditCategories(args)

      // System tools (Fase 11)
      case 'kanbu_get_settings':
        return await handleGetSettings(args)
      case 'kanbu_get_setting':
        return await handleGetSetting(args)
      case 'kanbu_set_setting':
        return await handleSetSetting(args)
      case 'kanbu_set_settings':
        return await handleSetSettings(args)
      case 'kanbu_delete_setting':
        return await handleDeleteSetting(args)
      case 'kanbu_create_db_backup':
        return await handleCreateDbBackup(args)
      case 'kanbu_create_source_backup':
        return await handleCreateSourceBackup(args)
      case 'kanbu_admin_list_workspaces':
        return await handleAdminListWorkspaces(args)
      case 'kanbu_admin_get_workspace':
        return await handleAdminGetWorkspace(args)
      case 'kanbu_admin_update_workspace':
        return await handleAdminUpdateWorkspace(args)
      case 'kanbu_admin_delete_workspace':
        return await handleAdminDeleteWorkspace(args)
      case 'kanbu_admin_reactivate_workspace':
        return await handleAdminReactivateWorkspace(args)

      // Profile tools (Fase 12)
      case 'kanbu_get_profile':
        return await handleGetProfile(args)
      case 'kanbu_get_time_tracking':
        return await handleGetTimeTracking(args)
      case 'kanbu_get_logins':
        return await handleGetLogins(args)
      case 'kanbu_get_sessions':
        return await handleGetSessions(args)
      case 'kanbu_get_password_history':
        return await handleGetPasswordHistory(args)
      case 'kanbu_get_metadata':
        return await handleGetMetadata(args)
      case 'kanbu_update_profile':
        return await handleUpdateProfile(args)
      case 'kanbu_remove_avatar':
        return await handleRemoveAvatar(args)
      case 'kanbu_change_password':
        return await handleChangePassword(args)
      case 'kanbu_get_2fa_status':
        return await handleGet2FAStatus(args)
      case 'kanbu_setup_2fa':
        return await handleSetup2FA(args)
      case 'kanbu_verify_2fa':
        return await handleVerify2FA(args)
      case 'kanbu_disable_own_2fa':
        return await handleDisableOwn2FA(args)
      case 'kanbu_regenerate_backup_codes':
        return await handleRegenerateBackupCodes(args)
      case 'kanbu_get_public_access':
        return await handleGetPublicAccess(args)
      case 'kanbu_enable_public_access':
        return await handleEnablePublicAccess(args)
      case 'kanbu_disable_public_access':
        return await handleDisablePublicAccess(args)
      case 'kanbu_regenerate_public_token':
        return await handleRegeneratePublicToken(args)
      case 'kanbu_get_notification_settings':
        return await handleGetNotificationSettings(args)
      case 'kanbu_update_notification_settings':
        return await handleUpdateNotificationSettings(args)
      case 'kanbu_list_external_accounts':
        return await handleListExternalAccounts(args)
      case 'kanbu_unlink_external_account':
        return await handleUnlinkExternalAccount(args)
      case 'kanbu_list_api_tokens':
        return await handleListApiTokens(args)
      case 'kanbu_create_api_token':
        return await handleCreateApiToken(args)
      case 'kanbu_revoke_api_token':
        return await handleRevokeApiToken(args)
      case 'kanbu_get_api_permissions':
        return await handleGetApiPermissions(args)
      case 'kanbu_list_ai_bindings':
        return await handleListAiBindings(args)
      case 'kanbu_revoke_ai_binding':
        return await handleRevokeAiBinding(args)
      case 'kanbu_get_hourly_rate':
        return await handleGetHourlyRate(args)
      case 'kanbu_set_hourly_rate':
        return await handleSetHourlyRate(args)
      case 'kanbu_set_metadata':
        return await handleSetMetadata(args)
      case 'kanbu_delete_metadata':
        return await handleDeleteMetadata(args)
      case 'kanbu_revoke_session':
        return await handleRevokeSession(args)
      case 'kanbu_revoke_all_sessions':
        return await handleRevokeAllSessions(args)

      // GitHub tools (GitHub Connector Fase 9)
      case 'kanbu_get_github_repo':
        return await handleGetGitHubRepo(args)
      case 'kanbu_list_github_prs':
        return await handleListGitHubPRs(args)
      case 'kanbu_list_github_commits':
        return await handleListGitHubCommits(args)
      case 'kanbu_get_task_prs':
        return await handleGetTaskPRs(args)
      case 'kanbu_get_task_commits':
        return await handleGetTaskCommits(args)
      case 'kanbu_link_github_repo':
        return await handleLinkGitHubRepo(args)
      case 'kanbu_unlink_github_repo':
        return await handleUnlinkGitHubRepo(args)
      case 'kanbu_sync_github_issues':
        return await handleSyncGitHubIssues(args)
      case 'kanbu_create_github_branch':
        return await handleCreateGitHubBranch(args)
      case 'kanbu_link_pr_to_task':
        return await handleLinkPRToTask(args)

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    }
  }
})

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Connect to Kanbu using a setup code
 */
async function handleConnect(args: unknown) {
  const { code } = ConnectSchema.parse(args)

  // Get machine identification
  const machineId = getMachineId()
  const machineName = getMachineName()

  // Get Kanbu URL from storage or environment
  // Default to HTTPS as the API now runs with SSL
  // Auto-convert http to https for localhost (API uses self-signed cert)
  let kanbuUrl = storage.getKanbuUrl() || process.env.KANBU_URL || 'https://localhost:3001'
  if (kanbuUrl.startsWith('http://localhost')) {
    kanbuUrl = kanbuUrl.replace('http://', 'https://')
  }

  // Exchange setup code for permanent token
  const result = await client.exchangeSetupCode(kanbuUrl, code, machineId, machineName)

  // Store the token locally
  storage.saveToken({
    kanbuUrl,
    token: result.token,
    machineId,
    userId: result.user.id,
    userName: result.user.name,
    userEmail: result.user.email,
    connectedAt: new Date().toISOString(),
  })

  return {
    content: [
      {
        type: 'text',
        text: `Connected to Kanbu!

User: ${result.user.name} (${result.user.email})
Role: ${result.user.role}
Machine: ${machineName}

You can now:
- Ask "What are my tasks?" to see your assigned tasks
- Create tasks: "Create a task called X in project Y"
- Update tasks: "Move task KANBU-123 to Done"`,
      },
    ],
  }
}

/**
 * Show current connection status
 */
async function handleWhoAmI() {
  const config = storage.loadToken()

  if (!config) {
    return {
      content: [
        {
          type: 'text',
          text: `Not connected to Kanbu.

To connect:
1. Go to your Kanbu profile page
2. Navigate to "AI Assistant" section
3. Click "Generate Setup Code"
4. Tell me the code (format: KNB-XXXX-XXXX)`,
        },
      ],
    }
  }

  // Validate token and get fresh user info
  try {
    const userInfo = await client.validateToken(config.kanbuUrl, config.token)

    return {
      content: [
        {
          type: 'text',
          text: `Connected to Kanbu

User: ${userInfo.name} (${userInfo.email})
Role: ${userInfo.role}
Machine: ${userInfo.machineName || config.machineId.substring(0, 8)}
Connected: ${config.connectedAt}
Server: ${config.kanbuUrl}`,
        },
      ],
    }
  } catch (error) {
    // Token is invalid - remove it
    storage.removeToken()
    return {
      content: [
        {
          type: 'text',
          text: `Connection expired or revoked. Please reconnect.

To connect:
1. Go to your Kanbu profile page
2. Navigate to "AI Assistant" section
3. Click "Generate Setup Code"
4. Tell me the code (format: KNB-XXXX-XXXX)`,
        },
      ],
    }
  }
}

/**
 * Disconnect from Kanbu
 */
async function handleDisconnect() {
  const config = storage.loadToken()

  if (!config) {
    return {
      content: [
        {
          type: 'text',
          text: 'Not connected to Kanbu.',
        },
      ],
    }
  }

  // Try to revoke on server (best effort)
  try {
    // Note: Server-side revocation would need an authenticated endpoint
    // For now, we just remove the local token
  } catch {
    // Ignore errors - we're disconnecting anyway
  }

  // Remove local token
  storage.removeToken()

  return {
    content: [
      {
        type: 'text',
        text: `Disconnected from Kanbu.

Your local credentials have been removed. To reconnect, generate a new setup code in your Kanbu profile.`,
      },
    ],
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Kanbu MCP server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
