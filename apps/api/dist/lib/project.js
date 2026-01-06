"use strict";
/*
 * Project Helper Functions
 * Version: 1.0.0
 *
 * Permission checks and project utilities.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:XX CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireProjectAccess = requireProjectAccess;
exports.getProjectAccess = getProjectAccess;
exports.hasMinProjectRole = hasMinProjectRole;
exports.createDefaultColumns = createDefaultColumns;
exports.createDefaultSwimlane = createDefaultSwimlane;
exports.generateProjectIdentifier = generateProjectIdentifier;
exports.generateTaskReference = generateTaskReference;
const server_1 = require("@trpc/server");
const prisma_1 = require("./prisma");
// Role hierarchy for permission checks
const PROJECT_ROLE_HIERARCHY = {
    VIEWER: 1,
    MEMBER: 2,
    MANAGER: 3,
    OWNER: 4,
};
// Default columns for new projects
const DEFAULT_COLUMNS = [
    { title: 'Backlog', position: 1 },
    { title: 'Ready', position: 2 },
    { title: 'WIP', position: 3 },
    { title: 'Review', position: 4 },
    { title: 'Done', position: 5 },
];
// =============================================================================
// Permission Helpers
// =============================================================================
/**
 * Check if a user has access to a project with at least the minimum role.
 * Throws FORBIDDEN if access denied.
 *
 * @param userId - The user ID to check
 * @param projectId - The project ID to check access for
 * @param minRole - Minimum required role (default: VIEWER)
 * @returns ProjectAccess with user's actual role
 * @throws TRPCError FORBIDDEN if access denied
 */
async function requireProjectAccess(userId, projectId, minRole = 'VIEWER') {
    const project = await prisma_1.prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            workspaceId: true,
            isActive: true,
            isPublic: true,
        },
    });
    if (!project) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
        });
    }
    if (!project.isActive) {
        throw new server_1.TRPCError({
            code: 'FORBIDDEN',
            message: 'This project has been archived or deleted',
        });
    }
    // Check project membership first
    const projectMember = await prisma_1.prisma.projectMember.findUnique({
        where: {
            projectId_userId: {
                projectId,
                userId,
            },
        },
    });
    if (projectMember) {
        // Check role hierarchy
        const userRoleLevel = PROJECT_ROLE_HIERARCHY[projectMember.role];
        const requiredRoleLevel = PROJECT_ROLE_HIERARCHY[minRole];
        if (userRoleLevel < requiredRoleLevel) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: `This action requires ${minRole} role or higher`,
            });
        }
        return {
            projectId,
            workspaceId: project.workspaceId,
            userId,
            role: projectMember.role,
        };
    }
    // If no project membership, check workspace membership for public projects
    // or for implicit access through workspace OWNER/ADMIN
    const workspaceMember = await prisma_1.prisma.workspaceUser.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: project.workspaceId,
                userId,
            },
        },
    });
    if (!workspaceMember) {
        throw new server_1.TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
        });
    }
    // Workspace OWNER/ADMIN have implicit access to all projects
    if (workspaceMember.role === 'OWNER' || workspaceMember.role === 'ADMIN') {
        // Map workspace role to project role
        const implicitRole = workspaceMember.role === 'OWNER' ? 'OWNER' : 'MANAGER';
        const implicitRoleLevel = PROJECT_ROLE_HIERARCHY[implicitRole];
        const requiredRoleLevel = PROJECT_ROLE_HIERARCHY[minRole];
        if (implicitRoleLevel < requiredRoleLevel) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: `This action requires ${minRole} role or higher`,
            });
        }
        return {
            projectId,
            workspaceId: project.workspaceId,
            userId,
            role: implicitRole,
        };
    }
    // Public projects give VIEWER access to workspace members
    if (project.isPublic) {
        const requiredRoleLevel = PROJECT_ROLE_HIERARCHY[minRole];
        const viewerRoleLevel = PROJECT_ROLE_HIERARCHY['VIEWER'];
        if (viewerRoleLevel < requiredRoleLevel) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: `This action requires ${minRole} role or higher`,
            });
        }
        return {
            projectId,
            workspaceId: project.workspaceId,
            userId,
            role: 'VIEWER',
        };
    }
    throw new server_1.TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this project',
    });
}
/**
 * Check if a user has access to a project without throwing.
 * Returns null if no access.
 *
 * @param userId - The user ID to check
 * @param projectId - The project ID to check access for
 * @returns ProjectAccess or null
 */
async function getProjectAccess(userId, projectId) {
    try {
        return await requireProjectAccess(userId, projectId, 'VIEWER');
    }
    catch {
        return null;
    }
}
/**
 * Check if a role meets the minimum requirement
 *
 * @param userRole - The user's current role
 * @param minRole - The minimum required role
 * @returns true if userRole >= minRole
 */
function hasMinProjectRole(userRole, minRole) {
    return PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[minRole];
}
// =============================================================================
// Project Creation Helpers
// =============================================================================
/**
 * Create default columns for a new project.
 * Creates: Backlog, Ready, WIP, Review, Done
 *
 * @param projectId - The project ID to create columns for
 * @returns Array of created columns
 */
async function createDefaultColumns(projectId) {
    const columns = await prisma_1.prisma.column.createManyAndReturn({
        data: DEFAULT_COLUMNS.map((col) => ({
            projectId,
            title: col.title,
            position: col.position,
        })),
        select: {
            id: true,
            title: true,
            position: true,
        },
    });
    return columns;
}
/**
 * Create default swimlane for a new project.
 *
 * @param projectId - The project ID to create swimlane for
 * @returns The created swimlane
 */
async function createDefaultSwimlane(projectId) {
    const swimlane = await prisma_1.prisma.swimlane.create({
        data: {
            projectId,
            name: 'Default',
            position: 1,
        },
        select: {
            id: true,
            name: true,
        },
    });
    return swimlane;
}
/**
 * Generate unique project identifier from name.
 * Creates slug-like identifier for task references (e.g., "PLAN" for PLAN-123)
 *
 * @param name - The project name
 * @param workspaceId - The workspace ID for uniqueness check
 * @returns Unique identifier (max 10 chars, uppercase)
 */
async function generateProjectIdentifier(name, workspaceId) {
    // Generate base identifier from name (uppercase, letters only)
    let baseIdentifier = name
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 6);
    // Fallback if no letters
    if (baseIdentifier.length < 2) {
        baseIdentifier = 'PROJ';
    }
    // Check uniqueness within workspace
    let identifier = baseIdentifier;
    let counter = 1;
    while (true) {
        const existing = await prisma_1.prisma.project.findFirst({
            where: {
                workspaceId,
                identifier,
            },
            select: { id: true },
        });
        if (!existing) {
            break;
        }
        identifier = `${baseIdentifier}${counter}`;
        counter++;
        // Safety limit
        if (counter > 99) {
            identifier = `${baseIdentifier}${Date.now() % 1000}`;
            break;
        }
    }
    return identifier;
}
/**
 * Generate next task reference number for a project.
 * Format: {identifier}-{number} (e.g., PLAN-123)
 *
 * @param projectId - The project ID
 * @returns Next task reference (e.g., "PLAN-1")
 */
async function generateTaskReference(projectId) {
    const project = await prisma_1.prisma.project.findUnique({
        where: { id: projectId },
        select: {
            identifier: true,
            _count: {
                select: { tasks: true },
            },
        },
    });
    if (!project) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
        });
    }
    // Count existing tasks + 1
    const nextNumber = project._count.tasks + 1;
    const identifier = project.identifier || 'TASK';
    return `${identifier}-${nextNumber}`;
}
//# sourceMappingURL=project.js.map