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
        groupMemberships: {
          select: {
            group: {
              select: {
                name: true,
                isActive: true,
                workspaceId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    // Check if user is a Domain Admin via group membership
    // Group name is 'domain-admins' (lowercase with hyphen)
    const isDomainAdmin = user.groupMemberships.some(
      (gm) => gm.group.name === 'domain-admins' && gm.group.isActive
    );

    // Get workspace IDs from ACL entries
    const workspaceAclEntries = await prisma.aclEntry.findMany({
      where: {
        principalType: 'user',
        principalId: userId,
        resourceType: 'workspace',
        deny: false,
      },
      select: { resourceId: true },
    });
    const aclWorkspaceIds = workspaceAclEntries
      .map((e) => e.resourceId)
      .filter((id): id is number => id !== null);

    // Also get workspace IDs from group memberships
    const groupWorkspaceIds = user.groupMemberships
      .filter((gm) => gm.group.isActive && gm.group.workspaceId !== null)
      .map((gm) => gm.group.workspaceId as number);

    // Combine and deduplicate workspace IDs
    const allWorkspaceIds = [...new Set([...aclWorkspaceIds, ...groupWorkspaceIds])];

    // Attach user data to socket
    const authenticatedSocket = socket as AuthenticatedSocket;
    authenticatedSocket.data.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
    authenticatedSocket.data.workspaceIds = allWorkspaceIds;
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
 * Checks:
 * 0. Domain Admins have access to all projects
 * 1. Direct workspace membership (via socket.data.workspaceIds which includes GROUP-based)
 * 2. Direct project ACL entry
 * 3. GROUP-based project membership (via PROJECT groups)
 */
export async function canAccessProject(
  socket: AuthenticatedSocket,
  projectId: number
): Promise<boolean> {
  // Domain Admins have access to all projects
  if (socket.data.isDomainAdmin) {
    return true;
  }

  const userId = socket.data.user.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      workspaceId: true,
      // Check GROUP-based project membership
      groups: {
        where: {
          type: 'PROJECT',
          members: { some: { userId } },
        },
        select: { id: true },
      },
    },
  });

  if (!project) return false;

  // Access granted if:
  // 1. User is a workspace member (direct or via GROUP)
  if (socket.data.workspaceIds.includes(project.workspaceId)) {
    return true;
  }

  // 2. User has direct project ACL entry
  const projectAcl = await prisma.aclEntry.findFirst({
    where: {
      principalType: 'user',
      principalId: userId,
      resourceType: 'project',
      resourceId: projectId,
      deny: false,
    },
  });
  if (projectAcl) {
    return true;
  }

  // 3. User is a member via PROJECT groups
  if (project.groups.length > 0) {
    return true;
  }

  return false;
}
