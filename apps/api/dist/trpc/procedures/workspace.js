"use strict";
/*
 * Workspace Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for workspace management (multi-tenancy).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T03:56 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const workspace_1 = require("../../lib/workspace");
// =============================================================================
// Input Schemas
// =============================================================================
const createWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000).optional(),
});
const updateWorkspaceSchema = zod_1.z.object({
    workspaceId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(2000).optional(),
});
const workspaceIdSchema = zod_1.z.object({
    workspaceId: zod_1.z.number(),
});
const inviteMemberSchema = zod_1.z.object({
    workspaceId: zod_1.z.number(),
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});
const updateMemberRoleSchema = zod_1.z.object({
    workspaceId: zod_1.z.number(),
    userId: zod_1.z.number(),
    role: zod_1.z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});
const removeMemberSchema = zod_1.z.object({
    workspaceId: zod_1.z.number(),
    userId: zod_1.z.number(),
});
// =============================================================================
// Workspace Router
// =============================================================================
exports.workspaceRouter = (0, router_1.router)({
    /**
     * Create a new workspace
     * User becomes OWNER automatically
     */
    create: router_1.protectedProcedure
        .input(createWorkspaceSchema)
        .mutation(async ({ ctx, input }) => {
        const slug = await (0, workspace_1.generateUniqueSlug)(input.name);
        const workspace = await ctx.prisma.workspace.create({
            data: {
                name: input.name,
                slug,
                description: input.description,
                users: {
                    create: {
                        userId: ctx.user.id,
                        role: 'OWNER',
                    },
                },
            },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                createdAt: true,
            },
        });
        return workspace;
    }),
    /**
     * List all workspaces the user has access to
     */
    list: router_1.protectedProcedure.query(async ({ ctx }) => {
        const memberships = await ctx.prisma.workspaceUser.findMany({
            where: {
                userId: ctx.user.id,
                workspace: {
                    isActive: true,
                },
            },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        description: true,
                        createdAt: true,
                        _count: {
                            select: {
                                users: true,
                                projects: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                workspace: {
                    name: 'asc',
                },
            },
        });
        return memberships.map((m) => ({
            ...m.workspace,
            role: m.role,
            memberCount: m.workspace._count.users,
            projectCount: m.workspace._count.projects,
        }));
    }),
    /**
     * Get workspace details
     * Requires at least VIEWER access
     */
    get: router_1.protectedProcedure
        .input(workspaceIdSchema)
        .query(async ({ ctx, input }) => {
        await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'VIEWER');
        const workspace = await ctx.prisma.workspace.findUnique({
            where: { id: input.workspaceId },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                settings: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        users: true,
                        projects: true,
                    },
                },
            },
        });
        if (!workspace) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Workspace not found',
            });
        }
        return {
            ...workspace,
            memberCount: workspace._count.users,
            projectCount: workspace._count.projects,
        };
    }),
    /**
     * Update workspace settings
     * Requires OWNER or ADMIN access
     */
    update: router_1.protectedProcedure
        .input(updateWorkspaceSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'ADMIN');
        const { workspaceId, ...updateData } = input;
        // If name is changing, generate new slug
        let slug;
        if (updateData.name) {
            slug = await (0, workspace_1.generateUniqueSlug)(updateData.name);
        }
        const workspace = await ctx.prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                ...updateData,
                ...(slug && { slug }),
            },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                settings: true,
                updatedAt: true,
            },
        });
        return workspace;
    }),
    /**
     * Delete a workspace
     * Requires OWNER access only
     */
    delete: router_1.protectedProcedure
        .input(workspaceIdSchema)
        .mutation(async ({ ctx, input }) => {
        const access = await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'OWNER');
        if (access.role !== 'OWNER') {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Only the workspace owner can delete it',
            });
        }
        // Soft delete by deactivating
        await ctx.prisma.workspace.update({
            where: { id: input.workspaceId },
            data: { isActive: false },
        });
        return { success: true };
    }),
    /**
     * Get workspace members
     * Requires at least VIEWER access
     */
    getMembers: router_1.protectedProcedure
        .input(workspaceIdSchema)
        .query(async ({ ctx, input }) => {
        await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'VIEWER');
        const members = await ctx.prisma.workspaceUser.findMany({
            where: { workspaceId: input.workspaceId },
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
                { role: 'desc' }, // OWNER first
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
     * Invite a user to the workspace via email
     * Requires ADMIN or OWNER access
     */
    invite: router_1.protectedProcedure
        .input(inviteMemberSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'ADMIN');
        // Check if user already exists
        const existingUser = await ctx.prisma.user.findUnique({
            where: { email: input.email },
        });
        if (existingUser) {
            // Check if already a member
            const existingMember = await ctx.prisma.workspaceUser.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: input.workspaceId,
                        userId: existingUser.id,
                    },
                },
            });
            if (existingMember) {
                throw new server_1.TRPCError({
                    code: 'CONFLICT',
                    message: 'User is already a member of this workspace',
                });
            }
            // Add user directly
            await ctx.prisma.workspaceUser.create({
                data: {
                    workspaceId: input.workspaceId,
                    userId: existingUser.id,
                    role: input.role,
                },
            });
            return {
                type: 'added',
                message: 'User added to workspace',
            };
        }
        // Check for existing pending invitation
        const existingInvite = await ctx.prisma.workspaceInvitation.findFirst({
            where: {
                workspaceId: input.workspaceId,
                email: input.email,
                expiresAt: { gt: new Date() },
            },
        });
        if (existingInvite) {
            throw new server_1.TRPCError({
                code: 'CONFLICT',
                message: 'An invitation has already been sent to this email',
            });
        }
        // Create invitation
        const invitation = await ctx.prisma.workspaceInvitation.create({
            data: {
                workspaceId: input.workspaceId,
                email: input.email,
                role: input.role,
                token: (0, workspace_1.generateInviteToken)(),
                expiresAt: (0, workspace_1.getInviteExpiration)(7),
                createdBy: ctx.user.id,
            },
        });
        // TODO: Send invitation email
        return {
            type: 'invited',
            message: 'Invitation sent',
            invitationId: invitation.id,
        };
    }),
    /**
     * Remove a member from workspace
     * Requires ADMIN or OWNER access
     * Cannot remove the OWNER
     */
    removeMember: router_1.protectedProcedure
        .input(removeMemberSchema)
        .mutation(async ({ ctx, input }) => {
        const access = await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'ADMIN');
        // Get target member
        const targetMember = await ctx.prisma.workspaceUser.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: input.workspaceId,
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
                message: 'Cannot remove the workspace owner',
            });
        }
        // ADMIN cannot remove other ADMINs (only OWNER can)
        if (targetMember.role === 'ADMIN' && access.role !== 'OWNER') {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Only the owner can remove administrators',
            });
        }
        await ctx.prisma.workspaceUser.delete({
            where: {
                workspaceId_userId: {
                    workspaceId: input.workspaceId,
                    userId: input.userId,
                },
            },
        });
        return { success: true };
    }),
    /**
     * Update a member's role
     * Requires OWNER access to change to/from ADMIN
     * ADMIN can change MEMBER/VIEWER roles
     */
    updateMemberRole: router_1.protectedProcedure
        .input(updateMemberRoleSchema)
        .mutation(async ({ ctx, input }) => {
        const access = await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'ADMIN');
        // Get target member
        const targetMember = await ctx.prisma.workspaceUser.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: input.workspaceId,
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
        // Only OWNER can promote to/demote from ADMIN
        if ((input.role === 'ADMIN' || targetMember.role === 'ADMIN') &&
            access.role !== 'OWNER') {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'Only the owner can manage administrator roles',
            });
        }
        await ctx.prisma.workspaceUser.update({
            where: {
                workspaceId_userId: {
                    workspaceId: input.workspaceId,
                    userId: input.userId,
                },
            },
            data: { role: input.role },
        });
        return { success: true, newRole: input.role };
    }),
    /**
     * Get pending invitations for a workspace
     * Requires ADMIN access
     */
    getInvitations: router_1.protectedProcedure
        .input(workspaceIdSchema)
        .query(async ({ ctx, input }) => {
        await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, input.workspaceId, 'ADMIN');
        const invitations = await ctx.prisma.workspaceInvitation.findMany({
            where: {
                workspaceId: input.workspaceId,
                expiresAt: { gt: new Date() },
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return invitations.map((inv) => ({
            id: inv.id,
            email: inv.email,
            role: inv.role,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
            createdBy: inv.creator,
        }));
    }),
    /**
     * Cancel a pending invitation
     * Requires ADMIN access
     */
    cancelInvitation: router_1.protectedProcedure
        .input(zod_1.z.object({ invitationId: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        const invitation = await ctx.prisma.workspaceInvitation.findUnique({
            where: { id: input.invitationId },
        });
        if (!invitation) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Invitation not found',
            });
        }
        await (0, workspace_1.requireWorkspaceAccess)(ctx.user.id, invitation.workspaceId, 'ADMIN');
        await ctx.prisma.workspaceInvitation.delete({
            where: { id: input.invitationId },
        });
        return { success: true };
    }),
});
//# sourceMappingURL=workspace.js.map