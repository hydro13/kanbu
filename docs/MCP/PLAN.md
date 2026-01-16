# Kanbu MCP Server - Technical Design

> **Status: Phase 1 Implemented** (2026-01-09)
>
> This document describes both the original design and the actual implementation.

## Overview

This document describes the technical architecture of the Kanbu MCP Server with one-time setup code pairing and ACL permission inheritance.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            PAIRING FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Kanbu Profile Page                    Claude Code                 │
│   ┌──────────────────┐                  ┌──────────────────┐       │
│   │ Generate Setup   │                  │ User: "Connect   │       │
│   │ Code             │──────────────────│ with code X"     │       │
│   │                  │   User speaks    │                  │       │
│   │ KNB-A3X9-7MK2   │   the code       │ kanbu_connect()  │       │
│   └──────────────────┘                  └────────┬─────────┘       │
│                                                  │                  │
│                                                  ▼                  │
│                                         ┌──────────────────┐       │
│                                         │ MCP Server       │       │
│                                         │ exchangeSetupCode│       │
│                                         └────────┬─────────┘       │
│                                                  │                  │
│                                                  ▼                  │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │                        Kanbu API                             │ │
│   ├─────────────────────────────────────────────────────────────┤ │
│   │  1. Validate setup code (exists, not expired, not consumed) │ │
│   │  2. Mark setup code as consumed                             │ │
│   │  3. Generate permanent token (256-bit)                      │ │
│   │  4. Create AssistantBinding (userId + machineId + tokenHash)│ │
│   │  5. Return: permanent token + user info                     │ │
│   └─────────────────────────────────────────────────────────────┘ │
│                                                  │                  │
│                                                  ▼                  │
│                                         ┌──────────────────┐       │
│                                         │ Store token      │       │
│                                         │ locally          │       │
│                                         │ ~/.config/kanbu/ │       │
│                                         │   mcp.json       │       │
│                                         └──────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          NORMAL OPERATION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Claude Code                                                        │
│   ┌──────────────────┐                                              │
│   │ kanbu_my_tasks() │                                              │
│   └────────┬─────────┘                                              │
│            │                                                         │
│            ▼                                                         │
│   ┌──────────────────┐        ┌──────────────────┐                 │
│   │ MCP Server       │        │ Local Token      │                 │
│   │                  │◄───────│ ~/.config/kanbu/ │                 │
│   │ Read token       │        │   mcp.json       │                 │
│   └────────┬─────────┘        └──────────────────┘                 │
│            │                                                         │
│            │ x-assistant-token: ast_xxx                             │
│            │ x-machine-id: hash                                     │
│            ▼                                                         │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                        Kanbu API                             │  │
│   ├─────────────────────────────────────────────────────────────┤  │
│   │  1. Validate token → get userId                             │  │
│   │  2. ACL check: checkPermission(userId, resource, action)    │  │
│   │  3. Execute business logic                                  │  │
│   │  4. Audit log with viaAssistant=true, machineId             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### AssistantSetupCode Model

```prisma
// prisma/schema.prisma

/// Temporary setup code for pairing (5 min TTL, one-time use)
model AssistantSetupCode {
  id          Int       @id @default(autoincrement())
  userId      Int
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  code        String    @unique  // KNB-XXXX-XXXX format
  createdAt   DateTime  @default(now())
  expiresAt   DateTime  // createdAt + 5 minutes
  consumedAt  DateTime? // Set when exchanged for token
  machineId   String?   // Set when consumed

  @@index([code])
  @@index([userId])
  @@index([expiresAt])
}

/// Permanent binding between user and machine
model AssistantBinding {
  id            Int       @id @default(autoincrement())
  userId        Int
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  machineId     String    // Hash of machine identifier
  machineName   String?   // Human readable: "MAX (Linux)"
  tokenHash     String    @db.VarChar(255)  // argon2 hash
  tokenPrefix   String    @db.VarChar(12)   // ast_xxxx for logs

  createdAt     DateTime  @default(now())
  lastUsedAt    DateTime?
  revokedAt     DateTime?

  @@unique([userId, machineId])
  @@index([tokenPrefix])
}

/// Extend AuditLog for assistant tracking
model AuditLog {
  // ... existing fields ...

  viaAssistant  Boolean   @default(false)
  assistantType String?   // "claude_code"
  machineId     String?   // Which machine performed the action
}
```

## Package Structure

### Actual Implementation (Phase 1)

```
packages/mcp-server/
├── src/
│   ├── index.ts              # Entry point + MCP Server setup
│   ├── storage.ts            # Token storage (~/.config/kanbu/mcp.json)
│   ├── client.ts             # Kanbu API client (tRPC via fetch)
│   └── machine.ts            # Machine ID generation (SHA256)
├── package.json              # MCP SDK v1.25.2, zod
├── tsconfig.json             # NodeNext module resolution
└── dist/                     # Compiled output
```

### Planned Structure (Phase 2+)

```
packages/mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP Server setup
│   ├── config.ts             # Environment + local config
│   ├── storage/
│   │   ├── index.ts
│   │   ├── tokenStore.ts     # Read/write local token
│   │   └── machineId.ts      # Generate machine identifier
│   ├── auth/
│   │   ├── index.ts
│   │   ├── pairing.ts        # exchangeSetupCode logic
│   │   └── tokenValidator.ts # Validate stored token
│   ├── client/
│   │   ├── index.ts
│   │   └── trpc.ts           # tRPC client
│   ├── tools/
│   │   ├── index.ts          # Tool registry
│   │   ├── pairing/
│   │   │   ├── connect.ts    # kanbu_connect
│   │   │   ├── whoami.ts     # kanbu_whoami
│   │   │   └── disconnect.ts # kanbu_disconnect
│   │   ├── workspace/
│   │   ├── project/
│   │   ├── task/
│   │   └── ...
│   ├── middleware/
│   │   ├── acl.ts
│   │   └── audit.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Backend API Procedures

### Setup Code Generation

```typescript
// apps/api/src/trpc/procedures/assistant.ts

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { generateSetupCode, generateSecureToken, hashToken } from '../../utils/crypto';
import { TRPCError } from '@trpc/server';

export const assistantRouter = router({
  // Generate a new setup code
  generateSetupCode: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Invalidate any existing unused codes for this user
      await ctx.db.assistantSetupCode.updateMany({
        where: {
          userId: ctx.user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(), // Mark as "cancelled"
        },
      });

      // Generate new code
      const code = generateSetupCode(); // KNB-XXXX-XXXX
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await ctx.db.assistantSetupCode.create({
        data: {
          userId: ctx.user.id,
          code,
          expiresAt,
        },
      });

      return {
        code,
        expiresAt,
      };
    }),

  // Exchange setup code for permanent token
  exchangeSetupCode: publicProcedure
    .input(z.object({
      code: z.string().regex(/^KNB-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
      machineId: z.string().min(1),
      machineName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the setup code
      const setupCode = await ctx.db.assistantSetupCode.findUnique({
        where: { code: input.code },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      });

      if (!setupCode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid setup code',
        });
      }

      if (setupCode.consumedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This setup code has already been used',
        });
      }

      if (setupCode.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This setup code has expired',
        });
      }

      // Mark code as consumed
      await ctx.db.assistantSetupCode.update({
        where: { id: setupCode.id },
        data: {
          consumedAt: new Date(),
          machineId: input.machineId,
        },
      });

      // Check if binding already exists for this machine
      const existingBinding = await ctx.db.assistantBinding.findUnique({
        where: {
          userId_machineId: {
            userId: setupCode.userId,
            machineId: input.machineId,
          },
        },
      });

      // Generate new permanent token
      const token = generateSecureToken(); // ast_xxxxxx...
      const tokenHash = await hashToken(token);
      const tokenPrefix = token.substring(0, 12);

      if (existingBinding) {
        // Update existing binding with new token
        await ctx.db.assistantBinding.update({
          where: { id: existingBinding.id },
          data: {
            tokenHash,
            tokenPrefix,
            machineName: input.machineName,
            revokedAt: null, // Un-revoke if was revoked
            lastUsedAt: new Date(),
          },
        });
      } else {
        // Create new binding
        await ctx.db.assistantBinding.create({
          data: {
            userId: setupCode.userId,
            machineId: input.machineId,
            machineName: input.machineName,
            tokenHash,
            tokenPrefix,
          },
        });
      }

      // Audit log
      await ctx.db.auditLog.create({
        data: {
          userId: setupCode.userId,
          action: 'assistant:paired',
          resourceType: 'assistant_binding',
          details: {
            machineId: input.machineId,
            machineName: input.machineName,
          },
        },
      });

      // Return token and user info
      return {
        token,
        user: {
          id: setupCode.user.id,
          email: setupCode.user.email,
          name: setupCode.user.name,
          role: setupCode.user.role,
        },
      };
    }),

  // Get list of connected machines
  getBindings: protectedProcedure
    .query(async ({ ctx }) => {
      const bindings = await ctx.db.assistantBinding.findMany({
        where: {
          userId: ctx.user.id,
          revokedAt: null,
        },
        select: {
          id: true,
          machineId: true,
          machineName: true,
          createdAt: true,
          lastUsedAt: true,
        },
        orderBy: { lastUsedAt: 'desc' },
      });

      return bindings;
    }),

  // Disconnect a machine
  revokeBinding: protectedProcedure
    .input(z.object({ bindingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const binding = await ctx.db.assistantBinding.findFirst({
        where: {
          id: input.bindingId,
          userId: ctx.user.id,
        },
      });

      if (!binding) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Binding not found',
        });
      }

      await ctx.db.assistantBinding.update({
        where: { id: binding.id },
        data: { revokedAt: new Date() },
      });

      await ctx.db.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'assistant:disconnected',
          resourceType: 'assistant_binding',
          details: {
            machineId: binding.machineId,
            machineName: binding.machineName,
          },
        },
      });

      return { success: true };
    }),

  // Validate token (used by MCP server)
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const tokenPrefix = input.token.substring(0, 12);

      const binding = await ctx.db.assistantBinding.findFirst({
        where: {
          tokenPrefix,
          revokedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      });

      if (!binding) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or revoked token',
        });
      }

      // Verify full token
      const isValid = await verifyToken(input.token, binding.tokenHash);
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        });
      }

      // Update last used
      await ctx.db.assistantBinding.update({
        where: { id: binding.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        userId: binding.user.id,
        email: binding.user.email,
        name: binding.user.name,
        role: binding.user.role,
        machineId: binding.machineId,
        machineName: binding.machineName,
      };
    }),
});
```

### Crypto Utilities

```typescript
// apps/api/src/utils/crypto.ts (actual implementation)

import { randomBytes, createHash } from 'crypto';
import argon2 from 'argon2';  // Project uses argon2, not bcrypt

const SETUP_CODE_PREFIX = 'KNB';
const TOKEN_PREFIX = 'ast_';
const TOKEN_BYTES = 32; // 256 bits

// Characters that won't be confused (no O/0, I/1, etc.)
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateSetupCode(): string {
  const part1 = randomChars(4);
  const part2 = randomChars(4);
  return `${SETUP_CODE_PREFIX}-${part1}-${part2}`;
}

function randomChars(length: number): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += SAFE_CHARS[bytes[i]! % SAFE_CHARS.length];
  }
  return result;
}

export function generateSecureToken(): string {
  const bytes = randomBytes(TOKEN_BYTES);
  const base64 = bytes.toString('base64url');
  return `${TOKEN_PREFIX}${base64}`;
}

export async function hashToken(token: string): Promise<string> {
  return argon2.hash(token);
}

export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, token);
}
```

## MCP Server Implementation

### Token Storage

```typescript
// packages/mcp-server/src/storage.ts (actual implementation)

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const TOKEN_FILE = join(homedir(), '.config', 'kanbu', 'mcp.json');

export interface StoredConfig {
  kanbuUrl: string;
  token: string;
  machineId: string;
  connectedAt: string;
  userId: number;
  userName: string;
}

export function getStoredConfig(): StoredConfig | null {
  if (!existsSync(TOKEN_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(TOKEN_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function storeConfig(config: StoredConfig): void {
  const dir = dirname(TOKEN_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(TOKEN_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600, // Only owner can read/write
  });
}

export function removeConfig(): void {
  if (existsSync(TOKEN_FILE)) {
    unlinkSync(TOKEN_FILE);
  }
}

export function isConnected(): boolean {
  return getStoredConfig() !== null;
}
```

### Machine ID Generation

```typescript
// packages/mcp-server/src/storage/machineId.ts

import { createHash } from 'crypto';
import { hostname, userInfo, platform } from 'os';

export function getMachineId(): string {
  const data = [
    hostname(),
    userInfo().username,
    platform(),
    // Add more entropy if needed
  ].join(':');

  return createHash('sha256').update(data).digest('hex').substring(0, 32);
}

export function getMachineName(): string {
  return `${hostname()} (${platform()})`;
}
```

### Connect Tool

```typescript
// packages/mcp-server/src/tools/pairing/connect.ts

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@kanbu/api/trpc/router';
import { storeConfig, getStoredConfig } from '../../storage/tokenStore';
import { getMachineId, getMachineName } from '../../storage/machineId';
import { config } from '../../config';

const inputSchema = {
  type: 'object',
  properties: {
    code: {
      type: 'string',
      description: 'Setup code from Kanbu profile page (format: KNB-XXXX-XXXX)',
      pattern: '^KNB-[A-Z0-9]{4}-[A-Z0-9]{4}$',
    },
  },
  required: ['code'],
};

async function handler(args: { code: string }) {
  // Check if already connected
  const existing = getStoredConfig();
  if (existing) {
    return {
      error: true,
      message: `Already connected as ${existing.userName}. Use kanbu_disconnect first to disconnect.`,
    };
  }

  // Create temporary client for pairing
  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${config.kanbuUrl}/trpc`,
      }),
    ],
  });

  try {
    const result = await client.assistant.exchangeSetupCode.mutate({
      code: args.code.toUpperCase(),
      machineId: getMachineId(),
      machineName: getMachineName(),
    });

    // Store the token locally
    storeConfig({
      kanbuUrl: config.kanbuUrl,
      token: result.token,
      machineId: getMachineId(),
      connectedAt: new Date().toISOString(),
      userId: result.user.id,
      userName: result.user.name,
    });

    return {
      success: true,
      message: `Connected to Kanbu as ${result.user.name}`,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || 'Failed to connect',
    };
  }
}

export const connect = {
  name: 'kanbu_connect',
  description: 'Connect to Kanbu using a setup code from your profile page',
  inputSchema,
  handler,
};
```

### Server with Connection Check

```typescript
// packages/mcp-server/src/server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools';
import { getStoredConfig, isConnected } from './storage/tokenStore';
import { createTrpcClient } from './client/trpc';
import { validateToken } from './auth/tokenValidator';
import { logger } from './utils/logger';

export async function createServer() {
  const server = new Server(
    {
      name: 'kanbu-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Check if connected
  const storedConfig = getStoredConfig();

  if (storedConfig) {
    // Validate the stored token
    try {
      const userContext = await validateToken(storedConfig.token);
      logger.info(`Connected as: ${userContext.name} (${userContext.email})`);

      // Create authenticated tRPC client
      const trpc = createTrpcClient(storedConfig.kanbuUrl, storedConfig.token);

      // Register all tools with auth context
      registerTools(server, {
        trpc,
        user: userContext,
        connected: true,
      });
    } catch (error) {
      // Token invalid - register only pairing tools
      logger.warn('Stored token is invalid, need to reconnect');
      registerTools(server, { connected: false });
    }
  } else {
    // Not connected - register only pairing tools
    logger.info('Not connected to Kanbu. Use kanbu_connect to connect.');
    registerTools(server, { connected: false });
  }

  return server;
}

export async function main() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

## Profile Page UI Components

### AssistantSection

```typescript
// apps/web/src/components/profile/AssistantSection.tsx

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

export function AssistantSection() {
  const [setupCode, setSetupCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  const bindingsQuery = trpc.assistant.getBindings.useQuery();
  const generateMutation = trpc.assistant.generateSetupCode.useMutation({
    onSuccess: (data) => {
      setSetupCode(data.code);
      setExpiresAt(new Date(data.expiresAt));
    },
  });
  const revokeMutation = trpc.assistant.revokeBinding.useMutation({
    onSuccess: () => {
      bindingsQuery.refetch();
    },
  });

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setSetupCode(null);
        setExpiresAt(null);
        setCountdown('');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Poll for new bindings when setup code is active
  useEffect(() => {
    if (!setupCode) return;

    const interval = setInterval(() => {
      bindingsQuery.refetch();
    }, 2000);

    return () => clearInterval(interval);
  }, [setupCode, bindingsQuery]);

  const bindings = bindingsQuery.data ?? [];
  const hasBindings = bindings.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotIcon className="h-5 w-5" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Connect Claude Code to manage projects on your behalf.
          Claude will inherit your permissions within Kanbu.
        </p>

        {/* Setup Code Display */}
        {setupCode && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-2">Your setup code:</p>
            <div className="flex items-center gap-4">
              <code className="text-2xl font-mono font-bold tracking-wider">
                {setupCode}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(setupCode)}
              >
                Copy
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Expires in: {countdown}
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              Tell Claude: "Connect to Kanbu with code {setupCode}"
            </p>
          </div>
        )}

        {/* Connected Machines */}
        {hasBindings && (
          <div>
            <h4 className="text-sm font-medium mb-2">Connected Machines</h4>
            <div className="space-y-2">
              {bindings.map((binding) => (
                <div
                  key={binding.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-medium">
                        {binding.machineName || binding.machineId.substring(0, 8)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Connected: {formatDate(binding.createdAt)}
                      {binding.lastUsedAt && (
                        <> · Last used: {formatRelative(binding.lastUsedAt)}</>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => revokeMutation.mutate({ bindingId: binding.id })}
                    disabled={revokeMutation.isPending}
                  >
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        {!setupCode && (
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {hasBindings ? 'Connect Another Machine' : 'Generate Setup Code'}
          </Button>
        )}

        {setupCode && (
          <Button
            variant="outline"
            onClick={() => {
              setSetupCode(null);
              setExpiresAt(null);
            }}
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

## Security Considerations

### Setup Code

| Property | Value | Rationale |
|----------|-------|-----------|
| Format | `KNB-XXXX-XXXX` | Easy to read aloud, no ambiguous chars |
| Entropy | ~20 bits | Sufficient for 5-min window |
| TTL | 5 minutes | Short enough to prevent sharing |
| One-time use | Yes | Cannot be reused after consumption |
| Rate limit | 5/hour | Prevents brute force |

### Permanent Token

| Property | Value | Rationale |
|----------|-------|-----------|
| Entropy | 256 bits | Cryptographically secure |
| Storage | argon2 hash | Secure even if DB leaked |
| Visibility | Never shown | User never sees it |
| Local storage | `~/.config/kanbu/` with 0600 | Only owner can read |

### Machine Binding

| Property | Value | Rationale |
|----------|-------|-----------|
| ID generation | SHA256(hostname+user) | Unique per machine |
| Portability | None | Token only works on bound machine |
| Multi-machine | Allowed | Each machine gets own token |
| Revocation | Per machine | Fine-grained control |

## Changelog

| Date | Change |
|------|--------|
| 2026-01-09 | **Phase 1 Implemented** - Updated with actual implementation details |
| 2026-01-09 | Token storage changed to `~/.config/kanbu/mcp.json` |
| 2026-01-09 | bcrypt replaced with argon2 (consistent with project) |
| 2026-01-09 | Plan rewritten for one-time setup code pairing |
| 2026-01-09 | Initial technical design |
