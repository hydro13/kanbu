"use strict";
/*
 * Workspace Helper Functions
 * Version: 1.0.0
 *
 * Permission checks and workspace utilities for multi-tenancy.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T03:55 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireWorkspaceAccess = requireWorkspaceAccess;
exports.getWorkspaceAccess = getWorkspaceAccess;
exports.hasMinRole = hasMinRole;
exports.createDefaultWorkspace = createDefaultWorkspace;
exports.generateUniqueSlug = generateUniqueSlug;
exports.generateInviteToken = generateInviteToken;
exports.getInviteExpiration = getInviteExpiration;
const server_1 = require("@trpc/server");
const prisma_1 = require("./prisma");
// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
    VIEWER: 1,
    MEMBER: 2,
    ADMIN: 3,
    OWNER: 4,
};
// =============================================================================
// Permission Helpers
// =============================================================================
/**
 * Check if a user has access to a workspace with at least the minimum role.
 * Throws FORBIDDEN if access denied.
 *
 * @param userId - The user ID to check
 * @param workspaceId - The workspace ID to check access for
 * @param minRole - Minimum required role (default: VIEWER)
 * @returns WorkspaceAccess with user's actual role
 * @throws TRPCError FORBIDDEN if access denied
 */
async function requireWorkspaceAccess(userId, workspaceId, minRole = 'VIEWER') {
    const membership = await prisma_1.prisma.workspaceUser.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId,
            },
        },
        include: {
            workspace: {
                select: {
                    isActive: true,
                },
            },
        },
    });
    if (!membership) {
        throw new server_1.TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this workspace',
        });
    }
    if (!membership.workspace.isActive) {
        throw new server_1.TRPCError({
            code: 'FORBIDDEN',
            message: 'This workspace has been deactivated',
        });
    }
    // Check role hierarchy
    const userRoleLevel = ROLE_HIERARCHY[membership.role];
    const requiredRoleLevel = ROLE_HIERARCHY[minRole];
    if (userRoleLevel < requiredRoleLevel) {
        throw new server_1.TRPCError({
            code: 'FORBIDDEN',
            message: `This action requires ${minRole} role or higher`,
        });
    }
    return {
        workspaceId,
        userId,
        role: membership.role,
    };
}
/**
 * Check if a user has access to a workspace without throwing.
 * Returns null if no access.
 *
 * @param userId - The user ID to check
 * @param workspaceId - The workspace ID to check access for
 * @returns WorkspaceAccess or null
 */
async function getWorkspaceAccess(userId, workspaceId) {
    const membership = await prisma_1.prisma.workspaceUser.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId,
            },
        },
        include: {
            workspace: {
                select: {
                    isActive: true,
                },
            },
        },
    });
    if (!membership || !membership.workspace.isActive) {
        return null;
    }
    return {
        workspaceId,
        userId,
        role: membership.role,
    };
}
/**
 * Check if a role meets the minimum requirement
 *
 * @param userRole - The user's current role
 * @param minRole - The minimum required role
 * @returns true if userRole >= minRole
 */
function hasMinRole(userRole, minRole) {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
// =============================================================================
// Workspace Creation Helpers
// =============================================================================
/**
 * Create a default workspace for a newly registered user.
 * The user becomes the OWNER of this workspace.
 *
 * @param userId - The user ID to create workspace for
 * @param userName - The user's name for workspace naming
 * @returns The created workspace
 */
async function createDefaultWorkspace(userId, userName) {
    // Generate a unique slug from user name
    const baseSlug = userName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
    // Ensure uniqueness by appending user ID
    const slug = `${baseSlug}-${userId}`;
    const workspace = await prisma_1.prisma.workspace.create({
        data: {
            name: `${userName}'s Workspace`,
            slug,
            description: 'Default personal workspace',
            users: {
                create: {
                    userId,
                    role: 'OWNER',
                },
            },
        },
        select: {
            id: true,
            name: true,
            slug: true,
        },
    });
    return workspace;
}
/**
 * Generate a unique slug for a workspace name.
 * Appends a number if the slug already exists.
 *
 * @param name - The workspace name to generate slug from
 * @returns A unique slug
 */
async function generateUniqueSlug(name) {
    const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 90); // Leave room for suffix
    // Check if base slug exists
    let slug = baseSlug;
    let counter = 1;
    while (true) {
        const existing = await prisma_1.prisma.workspace.findUnique({
            where: { slug },
            select: { id: true },
        });
        if (!existing) {
            break;
        }
        slug = `${baseSlug}-${counter}`;
        counter++;
        // Safety limit
        if (counter > 100) {
            slug = `${baseSlug}-${Date.now()}`;
            break;
        }
    }
    return slug;
}
// =============================================================================
// Invitation Helpers
// =============================================================================
/**
 * Generate a secure random token for workspace invitations.
 *
 * @returns A 64-character hex token
 */
function generateInviteToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
/**
 * Calculate invitation expiration date (7 days from now by default)
 *
 * @param days - Number of days until expiration
 * @returns Expiration date
 */
function getInviteExpiration(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}
//# sourceMappingURL=workspace.js.map