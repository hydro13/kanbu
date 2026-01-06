"use strict";
/*
 * Project Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for project management within workspaces.
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
exports.projectRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const workspace_1 = require("../../lib/workspace");
const project_1 = require("../../lib/project");
// =============================================================================
// Input Schemas
// =============================================================================
const createProjectSchema = zod_1.z.object({
    workspaceId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255),
    identifier: zod_1.z.string().max(10).optional(),
    description: zod_1.z.string().max(5000).optional(),
    isPublic: zod_1.z.boolean().default(false),
});
const updateProjectSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(5000).optional(),
    isPublic: zod_1.z.boolean().optional(),
    startDate: zod_1.z.string().optional(), // ISO date string
    endDate: zod_1.z.string().optional(), // ISO date string
});
const projectIdSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
});
const workspaceProjectsSchema = zod_1.z.object({
    workspaceId: zod_1.z.number(),
    includeArchived: zod_1.z.boolean().default(false),
});
const addMemberSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    userId: zod_1.z.number(),
    role: zod_1.z.enum(['MANAGER', 'MEMBER', 'VIEWER']).default('MEMBER'),
});
const updateMemberRoleSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    userId: zod_1.z.number(),
    role: zod_1.z.enum(['MANAGER', 'MEMBER', 'VIEWER']),
});
const removeMemberSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    userId: zod_1.z.number(),
});
// =============================================================================
// Project Router
// =============================================================================
exports.projectRouter = (0, router_1.router)({
    /**
     * Create a new project in a workspace
     * Requires MEMBER or higher workspace access
     * Creator becomes project OWNER
     */
    create: router_1.protectedProcedure
        .input(createProjectSchema)
        .mutation(async ({ ctx, input }) => {
        // Check workspace access
        await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'MEMBER');
        // Generate identifier if not provided
        const identifier = input.identifier || await (0, project_1.generateProjectIdentifier)(input.name, input.workspaceId);
        // Create project with creator as OWNER
        const project = await ctx.prisma.project.create({
            data: {
                workspaceId: input.workspaceId,
                name: input.name,
                identifier,
                description: input.description,
                isPublic: input.isPublic,
                members: {
                    create: {
                        userId: ctx.user.id,
                        role: 'OWNER',
                    },
                },
            },
            select: {
                id: true,
                name: true,
                identifier: true,
                description: true,
                isPublic: true,
                createdAt: true,
            },
        });
        // Create default columns and swimlane
        await Promise.all([
            (0, project_1.createDefaultColumns)(project.id),
            (0, project_1.createDefaultSwimlane)(project.id),
        ]);
        return project;
    }),
    /**
     * List projects in a workspace
     * Requires workspace access (VIEWER sees public projects, members see assigned)
     */
    list: router_1.protectedProcedure
        .input(workspaceProjectsSchema)
        .query(async ({ ctx, input }) => {
        const access = await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'VIEWER');
        // Workspace OWNER/ADMIN sees all projects
        const isWorkspaceAdmin = access.role === 'OWNER' || access.role === 'ADMIN';
        const projects = await ctx.prisma.project.findMany({
            where: {
                workspaceId: input.workspaceId,
                isActive: input.includeArchived ? undefined : true,
                ...(isWorkspaceAdmin ? {} : {
                    OR: [
                        // Public projects
                        { isPublic: true },
                        // Projects user is member of
                        { members: { some: { userId: ctx.user.id } } },
                    ],
                }),
            },
            select: {
                id: true,
                name: true,
                identifier: true,
                description: true,
                isPublic: true,
                isActive: true,
                startDate: true,
                endDate: true,
                lastActivityAt: true,
                createdAt: true,
                _count: {
                    select: {
                        tasks: true,
                        members: true,
                    },
                },
                members: {
                    where: { userId: ctx.user.id },
                    select: { role: true },
                },
            },
            orderBy: [
                { lastActivityAt: { sort: 'desc', nulls: 'last' } },
                { name: 'asc' },
            ],
        });
        return projects.map((p) => ({
            id: p.id,
            name: p.name,
            identifier: p.identifier,
            description: p.description,
            isPublic: p.isPublic,
            isActive: p.isActive,
            startDate: p.startDate,
            endDate: p.endDate,
            lastActivityAt: p.lastActivityAt,
            createdAt: p.createdAt,
            taskCount: p._count.tasks,
            memberCount: p._count.members,
            userRole: p.members[0]?.role ?? null,
        }));
    }),
    /**
     * Get project details with columns and swimlanes
     * Requires at least VIEWER access
     */
    get: router_1.protectedProcedure
        .input(projectIdSchema)
        .query(async ({ ctx, input }) => {
        const access = await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
        const project = await ctx.prisma.project.findUnique({
            where: { id: input.projectId },
            select: {
                id: true,
                workspaceId: true,
                name: true,
                identifier: true,
                description: true,
                isPublic: true,
                isActive: true,
                startDate: true,
                endDate: true,
                settings: true,
                lastActivityAt: true,
                createdAt: true,
                updatedAt: true,
                columns: {
                    orderBy: { position: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        position: true,
                        taskLimit: true,
                        isCollapsed: true,
                        showClosed: true,
                    },
                },
                swimlanes: {
                    where: { isActive: true },
                    orderBy: { position: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        position: true,
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                        members: true,
                    },
                },
            },
        });
        if (!project) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Project not found',
            });
        }
        return {
            ...project,
            taskCount: project._count.tasks,
            memberCount: project._count.members,
            userRole: access.role,
        };
    }),
    /**
     * Update project settings
     * Requires MANAGER or OWNER access
     */
    update: router_1.protectedProcedure
        .input(updateProjectSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MANAGER');
        const { projectId, startDate, endDate, ...updateData } = input;
        const project = await ctx.prisma.project.update({
            where: { id: projectId },
            data: {
                ...updateData,
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
            },
            select: {
                id: true,
                name: true,
                identifier: true,
                description: true,
                isPublic: true,
                startDate: true,
                endDate: true,
                updatedAt: true,
            },
        });
        return project;
    }),
    /**
     * Soft delete a project (set isActive = false)
     * Requires OWNER access
     */
    delete: router_1.protectedProcedure
        .input(projectIdSchema)
        .mutation(async ({ ctx, input }) => {
        const access = await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'OWNER');
        if (!(0, project_1.hasMinProjectRole)(access.role, 'OWNER')) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Only the project owner can delete it',
            });
        }
        await ctx.prisma.project.update({
            where: { id: input.projectId },
            data: { isActive: false },
        });
        return { success: true };
    }),
    /**
     * Archive a project (same as soft delete for now)
     * Requires MANAGER or OWNER access
     */
    archive: router_1.protectedProcedure
        .input(projectIdSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MANAGER');
        await ctx.prisma.project.update({
            where: { id: input.projectId },
            data: { isActive: false },
        });
        return { success: true };
    }),
    /**
     * Unarchive a project
     * Requires MANAGER or OWNER access
     */
    unarchive: router_1.protectedProcedure
        .input(projectIdSchema)
        .mutation(async ({ ctx, input }) => {
        // Need to check archived project - skip isActive check
        const project = await ctx.prisma.project.findUnique({
            where: { id: input.projectId },
            select: { workspaceId: true },
        });
        if (!project) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Project not found',
            });
        }
        // Check workspace admin access for unarchiving
        await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, project.workspaceId, 'ADMIN');
        await ctx.prisma.project.update({
            where: { id: input.projectId },
            data: { isActive: true },
        });
        return { success: true };
    }),
    /**
     * Get project members
     * Requires VIEWER access
     */
    getMembers: router_1.protectedProcedure
        .input(projectIdSchema)
        .query(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
        const members = await ctx.prisma.projectMember.findMany({
            where: { projectId: input.projectId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: [
                { role: 'asc' }, // OWNER, MANAGER, MEMBER, VIEWER (alphabetically works here)
                { joinedAt: 'asc' },
            ],
        });
        return members.map((m) => ({
            ...m.user,
            role: m.role,
            joinedAt: m.joinedAt,
        }));
    }),
    /**
     * Add a member to the project
     * Requires MANAGER or OWNER access
     * User must be a workspace member
     */
    addMember: router_1.protectedProcedure
        .input(addMemberSchema)
        .mutation(async ({ ctx, input }) => {
        const access = await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MANAGER');
        // Get project to check workspace
        const project = await ctx.prisma.project.findUnique({
            where: { id: input.projectId },
            select: { workspaceId: true },
        });
        if (!project) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Project not found',
            });
        }
        // Check if target user is a workspace member
        const workspaceMember = await ctx.prisma.workspaceUser.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: project.workspaceId,
                    userId: input.userId,
                },
            },
        });
        if (!workspaceMember) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'User must be a workspace member first',
            });
        }
        // Check if already a member
        const existingMember = await ctx.prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: input.projectId,
                    userId: input.userId,
                },
            },
        });
        if (existingMember) {
            throw new server_1.TRPCError({
                code: 'CONFLICT',
                message: 'User is already a project member',
            });
        }
        // Only OWNER can add MANAGER role
        if (input.role === 'MANAGER' && !(0, project_1.hasMinProjectRole)(access.role, 'OWNER')) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Only project owner can add managers',
            });
        }
        await ctx.prisma.projectMember.create({
            data: {
                projectId: input.projectId,
                userId: input.userId,
                role: input.role,
            },
        });
        return { success: true };
    }),
    /**
     * Remove a member from the project
     * Requires MANAGER or OWNER access
     * Cannot remove OWNER
     */
    removeMember: router_1.protectedProcedure
        .input(removeMemberSchema)
        .mutation(async ({ ctx, input }) => {
        const access = await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MANAGER');
        // Get target member
        const targetMember = await ctx.prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: input.projectId,
                    userId: input.userId,
                },
            },
        });
        if (!targetMember) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Member not found',
            });
        }
        // Cannot remove OWNER
        if (targetMember.role === 'OWNER') {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Cannot remove the project owner',
            });
        }
        // MANAGER cannot remove other MANAGERs (only OWNER can)
        if (targetMember.role === 'MANAGER' && !(0, project_1.hasMinProjectRole)(access.role, 'OWNER')) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Only the owner can remove managers',
            });
        }
        await ctx.prisma.projectMember.delete({
            where: {
                projectId_userId: {
                    projectId: input.projectId,
                    userId: input.userId,
                },
            },
        });
        return { success: true };
    }),
    /**
     * Update a member's role
     * Requires OWNER access for MANAGER role changes
     * MANAGER can change MEMBER/VIEWER roles
     */
    updateMemberRole: router_1.protectedProcedure
        .input(updateMemberRoleSchema)
        .mutation(async ({ ctx, input }) => {
        const access = await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MANAGER');
        // Get target member
        const targetMember = await ctx.prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: input.projectId,
                    userId: input.userId,
                },
            },
        });
        if (!targetMember) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Member not found',
            });
        }
        // Cannot change OWNER role
        if (targetMember.role === 'OWNER') {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Cannot change the owner role',
            });
        }
        // Only OWNER can promote to/demote from MANAGER
        if ((input.role === 'MANAGER' || targetMember.role === 'MANAGER') &&
            !(0, project_1.hasMinProjectRole)(access.role, 'OWNER')) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Only the owner can manage manager roles',
            });
        }
        await ctx.prisma.projectMember.update({
            where: {
                projectId_userId: {
                    projectId: input.projectId,
                    userId: input.userId,
                },
            },
            data: { role: input.role },
        });
        return { success: true, newRole: input.role };
    }),
});
//# sourceMappingURL=project.js.map