/**
 * Socket.io Authentication
 *
 * JWT-based authentication middleware for WebSocket connections.
 * Reuses existing auth library for token verification.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import type { Socket } from 'socket.io';
import { verifyToken } from '../lib/auth';
import { prisma } from '../lib/prisma';

// =============================================================================
// Types
// =============================================================================

export interface SocketUser {
  id: number;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user: SocketUser;
    workspaceIds: number[];
    isDomainAdmin: boolean;
  };
}

// =============================================================================
// Authentication Middleware
// =============================================================================

/**
 * Socket.io authentication middleware
 * Validates JWT token from handshake and attaches user data
 */
export async function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    // Extract token from handshake auth or query
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const payload = await verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid or expired token'));
    }

    // Fetch user with workspace memberships and Domain Admin check
    const userId = parseInt(payload.sub, 10);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        workspaces: {
          select: { workspaceId: true },
        },
        groupMemberships: {
          where: {
            group: {
              name: 'Domain Admins',
              isActive: true,
            },
          },
          select: { id: true },
        },
      },
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    // Check if user is a Domain Admin
    const isDomainAdmin = user.groupMemberships.length > 0;

    // Attach user data to socket
    const authenticatedSocket = socket as AuthenticatedSocket;
    authenticatedSocket.data.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
    authenticatedSocket.data.workspaceIds = user.workspaces.map(
      (ws) => ws.workspaceId
    );
    authenticatedSocket.data.isDomainAdmin = isDomainAdmin;

    next();
  } catch (error) {
    console.error('[Socket Auth] Error:', error);
    next(new Error('Authentication failed'));
  }
}

// =============================================================================
// Authorization Helpers
// =============================================================================

/**
 * Check if user can access a workspace
 */
export function canAccessWorkspace(
  socket: AuthenticatedSocket,
  workspaceId: number
): boolean {
  return socket.data.workspaceIds.includes(workspaceId);
}

/**
 * Check if user can access a project
 * (Must be member of the workspace that owns the project)
 */
export async function canAccessProject(
  socket: AuthenticatedSocket,
  projectId: number
): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) return false;
  return socket.data.workspaceIds.includes(project.workspaceId);
}
