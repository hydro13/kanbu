#!/usr/bin/env node
/*
 * Kanbu MCP Server
 * Version: 1.0.0
 *
 * MCP Server for Claude Code integration with Kanbu.
 * Implements pairing flow and provides tools for project/task management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 9.7 - Claude Code MCP Integration
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
  const isConnected = storage.hasToken()

  return {
    tools: [
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
      // Additional tools will be added in Phase 2
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
      case 'kanbu_connect':
        return await handleConnect(args)
      case 'kanbu_whoami':
        return await handleWhoAmI()
      case 'kanbu_disconnect':
        return await handleDisconnect()
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
