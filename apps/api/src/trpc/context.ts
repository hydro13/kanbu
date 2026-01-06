/**
 * tRPC Context
 *
 * Creates the context that is passed to all tRPC procedures
 *
 * ═══════════════════════════════════════════════════════════════════
 * Modified by:
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Signed: 2025-12-29T20:34 CET
 * Change: Added role field to AuthUser interface (ADMIN-01)
 * ═══════════════════════════════════════════════════════════════════
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AppRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { extractBearerToken, verifyToken } from '../lib/auth';

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

export async function createContext({ req, res }: CreateContextOptions) {
  // Extract and verify JWT token from Authorization header
  let user: AuthUser | null = null;

  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.sub) {
      const userId = parseInt(payload.sub, 10);
      // Fetch user from database to get current role
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
      }
    }
  }

  return {
    req,
    res,
    prisma,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
