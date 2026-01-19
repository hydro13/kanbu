/**
 * tRPC Context
 *
 * Creates the context that is passed to all tRPC procedures.
 * Supports quad authentication: JWT (session), API keys (kb_), Assistant tokens (ast_),
 * and OAuth 2.1 tokens (kat_).
 *
 * ═══════════════════════════════════════════════════════════════════
 * Modified by:
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Signed: 2025-12-29T20:34 CET
 * Change: Added role field to AuthUser interface (ADMIN-01)
 *
 * Modified: 2026-01-09
 * Fase: 9.6 - API Keys & Service Accounts
 * Change: Added API key authentication support (dual auth)
 *
 * Modified: 2026-01-09
 * Fase: MCP Integration
 * Change: Added assistant token (ast_) authentication support
 *
 * Modified: 2026-01-19
 * Phase: 19.6 - OAuth 2.1 MCP Middleware
 * Change: Added OAuth 2.1 token context (kat_ prefix) support
 * ═══════════════════════════════════════════════════════════════════
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AppRole } from '@prisma/client';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { prisma } from '../lib/prisma';
import { extractBearerToken, verifyToken } from '../lib/auth';
import { apiKeyService, type ApiKeyContext } from '../services/apiKeyService';

export interface CreateContextOptions {
  req: FastifyRequest;
  res: FastifyReply;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: AppRole;
}

/** Authentication source type */
export type AuthSource = 'jwt' | 'apiKey' | 'assistant' | 'oauth';

/** Assistant binding context */
export interface AssistantContext {
  bindingId: number;
  machineId: string;
  machineName: string | null;
}

/** OAuth 2.1 token context (Phase 19) */
export interface OAuthContext {
  userId: number;
  tokenId: number;
  clientId: string;
  scope: string[];
}

/**
 * Verify an assistant token against its stored hash
 */
async function verifyAssistantToken(token: string, hash: string): Promise<boolean> {
  const sha256 = createHash('sha256').update(token).digest('hex');
  return argon2.verify(hash, sha256);
}

export async function createContext({ req, res }: CreateContextOptions) {
  let user: AuthUser | null = null;
  let apiKeyContext: ApiKeyContext | null = null;
  let authSource: AuthSource | null = null;

  const authHeader = req.headers.authorization;

  // Try JWT auth first (Bearer token)
  const token = extractBearerToken(authHeader);
  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.sub) {
      const userId = parseInt(payload.sub, 10);
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true, role: true },
      });
      if (dbUser) {
        user = {
          id: dbUser.id,
          email: dbUser.email,
          username: dbUser.username,
          role: dbUser.role,
        };
        authSource = 'jwt';
      }
    }
  }

  // If no JWT auth, try API key (kb_ prefix)
  if (!user && authHeader) {
    // Support both "Bearer kb_xxx" and "ApiKey kb_xxx" formats
    const apiKey = authHeader.startsWith('Bearer kb_')
      ? authHeader.slice(7)
      : authHeader.startsWith('ApiKey ')
        ? authHeader.slice(7)
        : null;

    if (apiKey) {
      apiKeyContext = await apiKeyService.authenticate(apiKey);
      if (apiKeyContext) {
        // Create a minimal AuthUser from API key context for backward compatibility
        const dbUser = await prisma.user.findUnique({
          where: { id: apiKeyContext.userId },
          select: { id: true, email: true, username: true, role: true },
        });
        if (dbUser) {
          user = {
            id: dbUser.id,
            email: dbUser.email,
            username: dbUser.username,
            role: dbUser.role,
          };
          authSource = 'apiKey';
        }
      }
    }
  }

  // If no JWT or API key auth, try assistant token (ast_ prefix)
  let assistantContext: AssistantContext | null = null;
  if (!user && authHeader) {
    const assistantToken = authHeader.startsWith('Bearer ast_') ? authHeader.slice(7) : null;

    if (assistantToken) {
      const tokenPrefix = assistantToken.substring(0, 12);

      // Find binding by token prefix
      const binding = await prisma.assistantBinding.findFirst({
        where: {
          tokenPrefix,
          revokedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              role: true,
              isActive: true,
            },
          },
        },
      });

      if (binding && binding.user.isActive) {
        // Verify full token hash
        const isValid = await verifyAssistantToken(assistantToken, binding.tokenHash);
        if (isValid) {
          user = {
            id: binding.user.id,
            email: binding.user.email,
            username: binding.user.username,
            role: binding.user.role,
          };
          authSource = 'assistant';
          assistantContext = {
            bindingId: binding.id,
            machineId: binding.machineId,
            machineName: binding.machineName,
          };

          // Update last used timestamp (fire and forget)
          prisma.assistantBinding
            .update({
              where: { id: binding.id },
              data: { lastUsedAt: new Date() },
            })
            .catch(() => {
              // Ignore errors - this is just for tracking
            });
        }
      }
    }
  }

  return {
    req,
    res,
    prisma,
    user,
    apiKeyContext,
    assistantContext,
    oauthContext: null as OAuthContext | null, // Set by MCP endpoint when using OAuth auth
    authSource,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
