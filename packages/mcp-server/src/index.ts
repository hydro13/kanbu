#!/usr/bin/env node
/*
 * Kanbu MCP Server
 * Version: 1.3.0
 *
 * MCP Server for Claude Code integration with Kanbu.
 * Implements pairing flow and provides tools for project/task management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 4 - Search & Smart Features
 * ═══════════════════════════════════════════════════════════════════
 */

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
  const kanbuUrl = storage.getKanbuUrl() || process.env.KANBU_URL || 'http://localhost:3001'

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
