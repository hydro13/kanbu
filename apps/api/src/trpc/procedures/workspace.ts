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

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import {
  generateUniqueSlug,
  generateInviteToken,
  getInviteExpiration,
} from '../../lib/workspace'
import { permissionService, groupPermissionService } from '../../services'

// =============================================================================
// Input Schemas
// =============================================================================

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().max(500).optional(),
})

const updateWorkspaceSchema = z.object({
  workspaceId: z.number(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
})

const workspaceIdSchema = z.object({
  workspaceId: z.number(),
})

const workspaceSlugSchema = z.object({
  slug: z.string().min(1).max(100),
})

const inviteMemberSchema = z.object({
  workspaceId: z.number(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
})

const updateMemberRoleSchema = z.object({
  workspaceId: z.number(),
  userId: z.number(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
})

const removeMemberSchema = z.object({
  workspaceId: z.number(),
  userId: z.number(),
})

const searchAvailableUsersSchema = z.object({
  workspaceId: z.number(),
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(50).default(10),
})

const addMemberSchema = z.object({
  workspaceId: z.number(),
  userId: z.number(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
})

// =============================================================================
// Workspace Router
// =============================================================================

export const workspaceRouter = router({
  /**
   * Create a new workspace
   * SYSTEM_ADMIN or Domain Admins can create workspaces
   */
  create: protectedProcedure
    .input(createWorkspaceSchema.extend({
      ownerId: z.number().optional(), // Optional: assign different owner (default: creator)
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is SYSTEM_ADMIN or Domain Admin
      const isSuperAdmin = ctx.user.role === 'ADMIN'
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(ctx.user.id)

      if (!isSuperAdmin && !isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can create workspaces',
        })
      }

      const slug = await generateUniqueSlug(input.name)
      const ownerId = input.ownerId ?? ctx.user.id

      const workspace = await ctx.prisma.workspace.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          logoUrl: input.logoUrl,
          createdById: ctx.user.id,
          users: {
            create: {
              userId: ownerId,
              role: 'OWNER',
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          createdAt: true,
        },
      })

      return workspace
    }),

  /**
   * List workspaces the user has access to
   * Includes:
   * - All workspaces for Super Admins (AppRole.ADMIN)
   * - All workspaces for Domain Admins
   * - Direct memberships (WorkspaceUser table)
   * - Group-based memberships (WORKSPACE and WORKSPACE_ADMIN groups)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Use permissionService to get all workspaces with proper role
    const userWorkspaces = await permissionService.getUserWorkspaces(ctx.user.id)

    if (userWorkspaces.length === 0) {
      return []
    }

    // Fetch full workspace details for all accessible workspaces
    const workspaceIds = userWorkspaces.map((w) => w.id)
    const workspaces = await ctx.prisma.workspace.findMany({
      where: {
        id: { in: workspaceIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Create a role map from userWorkspaces
    const roleMap = new Map(userWorkspaces.map((w) => [w.id, w.role]))

    return workspaces.map((workspace) => ({
      ...workspace,
      // Convert OWNER to ADMIN for display (OWNER no longer exists for workspaces)
      role: roleMap.get(workspace.id) === 'OWNER' ? 'ADMIN' : roleMap.get(workspace.id) ?? 'VIEWER',
      memberCount: workspace._count.users,
      projectCount: workspace._count.projects,
    }))
  }),

  /**
   * Get workspace details
   * Requires at least VIEWER access
   */
  get: protectedProcedure
    .input(workspaceIdSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'VIEWER')

      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          isActive: true,
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
      })

      if (!workspace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        })
      }

      return {
        ...workspace,
        memberCount: workspace._count.users,
        projectCount: workspace._count.projects,
      }
    }),

  /**
   * Get workspace details by slug (SEO-friendly URL)
   * Requires at least VIEWER access
   */
  getBySlug: protectedProcedure
    .input(workspaceSlugSchema)
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { slug: input.slug },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          isActive: true,
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
      })

      if (!workspace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        })
      }

      // Check access after finding workspace (needed for workspaceId)
      const access = await permissionService.requireWorkspaceAccess(ctx.user.id, workspace.id, 'VIEWER')

      return {
        ...workspace,
        role: access.role === 'OWNER' ? 'ADMIN' : access.role,
        memberCount: workspace._count.users,
        projectCount: workspace._count.projects,
      }
    }),

  /**
   * Update workspace settings
   * Requires OWNER or ADMIN access
   */
  update: protectedProcedure
    .input(updateWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      const { workspaceId, ...updateData } = input

      // If name is changing, generate new slug
      let slug: string | undefined
      if (updateData.name) {
        slug = await generateUniqueSlug(updateData.name)
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
      })

      return workspace
    }),

  /**
   * Delete a workspace
   * Requires OWNER access only
   */
  delete: protectedProcedure
    .input(workspaceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const access = await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'OWNER')

      if (access.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the workspace owner can delete it',
        })
      }

      // Soft delete by deactivating
      await ctx.prisma.workspace.update({
        where: { id: input.workspaceId },
        data: { isActive: false },
      })

      return { success: true }
    }),

  /**
   * Get workspace members
   * Combines WorkspaceUser table with Group-based memberships
   * Shows effective role: SYSTEM for Domain Admins, ADMIN/MEMBER/VIEWER otherwise
   * OWNER role no longer exists for workspaces - replaced by SYSTEM
   */
  getMembers: protectedProcedure
    .input(workspaceIdSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'VIEWER')

      // 1. Get members from WorkspaceUser table
      const workspaceUsers = await ctx.prisma.workspaceUser.findMany({
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
      })

      // 2. Get members from workspace groups (WORKSPACE and WORKSPACE_ADMIN types)
      const groupMembers = await ctx.prisma.groupMember.findMany({
        where: {
          group: {
            workspaceId: input.workspaceId,
            type: { in: ['WORKSPACE', 'WORKSPACE_ADMIN'] },
            isActive: true,
          },
        },
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
          group: {
            select: {
              type: true,
            },
          },
        },
      })

      // 3. Combine into a map (userId -> member data)
      const memberMap = new Map<number, {
        id: number
        email: string
        username: string
        name: string | null
        avatarUrl: string | null
        role: string
        joinedAt: Date
        source: 'workspace_user' | 'group' | 'both'
      }>()

      // Add WorkspaceUser members first
      for (const wu of workspaceUsers) {
        // Convert OWNER to ADMIN (OWNER no longer exists for workspaces)
        const role = wu.role === 'OWNER' ? 'ADMIN' : wu.role
        memberMap.set(wu.user.id, {
          ...wu.user,
          role,
          joinedAt: wu.joinedAt,
          source: 'workspace_user',
        })
      }

      // Add/update with group members
      for (const gm of groupMembers) {
        const existing = memberMap.get(gm.user.id)
        const isGroupAdmin = gm.group.type === 'WORKSPACE_ADMIN'

        if (existing) {
          // User exists from WorkspaceUser, upgrade role if group gives higher access
          if (isGroupAdmin && existing.role !== 'ADMIN') {
            existing.role = 'ADMIN'
          }
          existing.source = 'both'
        } else {
          // New member from group only
          memberMap.set(gm.user.id, {
            ...gm.user,
            role: isGroupAdmin ? 'ADMIN' : 'MEMBER',
            joinedAt: gm.addedAt,
            source: 'group',
          })
        }
      }

      // 4. Get Domain Admin status for all members
      const memberIds = Array.from(memberMap.keys())
      const domainAdminIds = await groupPermissionService.getDomainAdminUserIds(memberIds)

      // 5. Convert to array and apply Domain Admin override
      const members = Array.from(memberMap.values()).map((member) => ({
        ...member,
        // Domain Admins get SYSTEM role, overriding any other role
        role: domainAdminIds.has(member.id) ? 'SYSTEM' : member.role,
        isDomainAdmin: domainAdminIds.has(member.id),
      }))

      // 6. Sort: SYSTEM first, then ADMIN, then by name
      const roleOrder: Record<string, number> = { SYSTEM: 0, ADMIN: 1, MEMBER: 2, VIEWER: 3 }
      members.sort((a, b) => {
        const roleCompare = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99)
        if (roleCompare !== 0) return roleCompare
        return (a.name ?? '').localeCompare(b.name ?? '')
      })

      return members
    }),

  /**
   * Invite a user to the workspace via email
   * Requires ADMIN access
   * Only Domain Admins can invite with ADMIN role
   */
  invite: protectedProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      // Check if user is a Domain Admin
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(ctx.user.id)

      // Only Domain Admins can invite users as ADMIN
      if (input.role === 'ADMIN' && !isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can invite users as administrators',
        })
      }

      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      })

      if (existingUser) {
        // Check if already a member
        const existingMember = await ctx.prisma.workspaceUser.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: input.workspaceId,
              userId: existingUser.id,
            },
          },
        })

        if (existingMember) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User is already a member of this workspace',
          })
        }

        // Add user directly
        await ctx.prisma.workspaceUser.create({
          data: {
            workspaceId: input.workspaceId,
            userId: existingUser.id,
            role: input.role,
          },
        })

        return {
          type: 'added' as const,
          message: 'User added to workspace',
        }
      }

      // Check for existing pending invitation
      const existingInvite = await ctx.prisma.workspaceInvitation.findFirst({
        where: {
          workspaceId: input.workspaceId,
          email: input.email,
          expiresAt: { gt: new Date() },
        },
      })

      if (existingInvite) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An invitation has already been sent to this email',
        })
      }

      // Create invitation
      const invitation = await ctx.prisma.workspaceInvitation.create({
        data: {
          workspaceId: input.workspaceId,
          email: input.email,
          role: input.role,
          token: generateInviteToken(),
          expiresAt: getInviteExpiration(7),
          createdBy: ctx.user.id,
        },
      })

      // TODO: Send invitation email

      return {
        type: 'invited' as const,
        message: 'Invitation sent',
        invitationId: invitation.id,
      }
    }),

  /**
   * Remove a member from workspace
   * Requires ADMIN access
   * Cannot remove the OWNER
   * Only Domain Admins can remove other ADMINs (including themselves)
   */
  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      // Check if user is a Domain Admin
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(ctx.user.id)

      // Get target member
      const targetMember = await ctx.prisma.workspaceUser.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
      })

      if (!targetMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        })
      }

      // Cannot remove OWNER
      if (targetMember.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove the workspace owner',
        })
      }

      // Only Domain Admins can remove ADMINs (including themselves)
      // Workspace admins cannot remove other admins or demote themselves
      if (targetMember.role === 'ADMIN' && !isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can remove workspace administrators',
        })
      }

      await ctx.prisma.workspaceUser.delete({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
      })

      return { success: true }
    }),

  /**
   * Update a member's role
   * Only Domain Admins can change to/from ADMIN role
   * Workspace Admins can change MEMBER/VIEWER roles
   */
  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      // Check if user is a Domain Admin
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(ctx.user.id)

      // Get target member
      const targetMember = await ctx.prisma.workspaceUser.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
      })

      if (!targetMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        })
      }

      // Cannot change OWNER role
      if (targetMember.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot change the owner role',
        })
      }

      // Only Domain Admins can promote to/demote from ADMIN
      // This prevents workspace admins from granting or revoking admin rights
      if (
        (input.role === 'ADMIN' || targetMember.role === 'ADMIN') &&
        !isDomainAdmin
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can manage administrator roles',
        })
      }

      await ctx.prisma.workspaceUser.update({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
        data: { role: input.role },
      })

      return { success: true, newRole: input.role }
    }),

  /**
   * Get pending invitations for a workspace
   * Requires ADMIN access
   */
  getInvitations: protectedProcedure
    .input(workspaceIdSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

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
      })

      return invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        createdBy: inv.creator,
      }))
    }),

  /**
   * Cancel a pending invitation
   * Requires ADMIN access
   */
  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.prisma.workspaceInvitation.findUnique({
        where: { id: input.invitationId },
      })

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        })
      }

      await permissionService.requireWorkspaceAccess(ctx.user.id, invitation.workspaceId, 'ADMIN')

      await ctx.prisma.workspaceInvitation.delete({
        where: { id: input.invitationId },
      })

      return { success: true }
    }),

  /**
   * Upload workspace logo with base64 encoded image
   * Stores in database for reliability
   * Requires ADMIN or OWNER access
   */
  uploadLogo: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        base64: z.string().min(1),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      // Decode base64 to buffer
      const buffer = Buffer.from(input.base64, 'base64')
      const size = buffer.length

      // Validate size (max 5MB)
      if (size > 5 * 1024 * 1024) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File size must be less than 5MB',
        })
      }

      // Upsert logo in database
      await ctx.prisma.workspaceLogo.upsert({
        where: { workspaceId: input.workspaceId },
        update: {
          data: buffer,
          mimeType: input.mimeType,
          size,
        },
        create: {
          workspaceId: input.workspaceId,
          data: buffer,
          mimeType: input.mimeType,
          size,
        },
      })

      // Update workspace's logoUrl to point to the API endpoint
      const logoUrl = `/api/workspace-logo/${input.workspaceId}`
      await ctx.prisma.workspace.update({
        where: { id: input.workspaceId },
        data: { logoUrl },
      })

      return {
        success: true,
        logoUrl,
        message: 'Logo uploaded successfully',
      }
    }),

  /**
   * Remove workspace logo
   * Requires ADMIN or OWNER access
   */
  removeLogo: protectedProcedure
    .input(workspaceIdSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      // Delete logo from database
      await ctx.prisma.workspaceLogo.deleteMany({
        where: { workspaceId: input.workspaceId },
      })

      // Clear logo URL
      await ctx.prisma.workspace.update({
        where: { id: input.workspaceId },
        data: { logoUrl: null },
      })

      return { success: true, message: 'Logo removed' }
    }),

  /**
   * Search for users who are not yet members of this workspace
   * Only Domain Admins can search all users in the system
   * Workspace Admins should use email invite instead (they cannot see users outside their workspace)
   */
  searchAvailableUsers: protectedProcedure
    .input(searchAvailableUsersSchema)
    .query(async ({ ctx, input }) => {
      // Check workspace ADMIN access
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      // Check if user is a Domain Admin
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(ctx.user.id)

      // Only Domain Admins can search for users outside the workspace
      // Workspace Admins should use email invite instead
      if (!isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Use email invite to add users. You cannot search users outside your workspace.',
        })
      }

      // Get existing workspace member user IDs
      const existingMembers = await ctx.prisma.workspaceUser.findMany({
        where: { workspaceId: input.workspaceId },
        select: { userId: true },
      })
      const existingMemberIds = existingMembers.map((m) => m.userId)

      // Search for users not in the workspace (Domain Admins only)
      const users = await ctx.prisma.user.findMany({
        where: {
          id: { notIn: existingMemberIds },
          isActive: true,
          OR: [
            { email: { contains: input.query, mode: 'insensitive' } },
            { name: { contains: input.query, mode: 'insensitive' } },
            { username: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatarUrl: true,
        },
        take: input.limit,
        orderBy: { name: 'asc' },
      })

      return users
    }),

  /**
   * Add an existing user directly to the workspace
   * Requires ADMIN access
   * Only Domain Admins can add users as ADMIN
   */
  addMember: protectedProcedure
    .input(addMemberSchema)
    .mutation(async ({ ctx, input }) => {
      // Check workspace ADMIN access
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'ADMIN')

      // Check if user is a Domain Admin
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(ctx.user.id)

      // Only Domain Admins can add users as ADMIN
      if (input.role === 'ADMIN' && !isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can add users as administrators',
        })
      }

      // Check if target user exists and is active
      const targetUser = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, isActive: true, name: true, email: true },
      })

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      if (!targetUser.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot add inactive user to workspace',
        })
      }

      // Check if already a member
      const existingMember = await ctx.prisma.workspaceUser.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
      })

      if (existingMember) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User is already a member of this workspace',
        })
      }

      // Add the user to the workspace
      await ctx.prisma.workspaceUser.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role,
        },
      })

      return {
        success: true,
        message: `User ${targetUser.name || targetUser.email} added to workspace`,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: input.role,
        },
      }
    }),
})
