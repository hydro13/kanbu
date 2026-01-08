/**
 * tRPC Context
 *
 * Creates the context that is passed to all tRPC procedures.
 * Supports dual authentication: JWT (session) and API keys (kb_ prefix).
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
 * ═══════════════════════════════════════════════════════════════════
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AppRole } from '@prisma/client';
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
export type AuthSource = 'jwt' | 'apiKey';

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

  return {
    req,
    res,
    prisma,
    user,
    apiKeyContext,
    authSource,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
