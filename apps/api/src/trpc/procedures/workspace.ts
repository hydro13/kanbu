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
import { permissionService, aclService } from '../../services'
import { ACL_PERMISSIONS, ACL_PRESETS } from '../../services/aclService'

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
      // Check if user is Super Admin (has admin ACL with P bit)
      const isSuperAdmin = await aclService.hasPermission(
        ctx.user.id,
        'admin',
        null,
        ACL_PERMISSIONS.PERMISSIONS
      )

      if (!isSuperAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Super Admins can create workspaces',
        })
      }

      const slug = await generateUniqueSlug(input.name)
      const ownerId = input.ownerId ?? ctx.user.id

      // Create workspace (ACL-only, no legacy WorkspaceUser)
      const workspace = await ctx.prisma.workspace.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          logoUrl: input.logoUrl,
          createdById: ctx.user.id,
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

      // Create ACL entry for owner with Full Control
      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: workspace.id,
        principalType: 'user',
        principalId: ownerId,
        permissions: ACL_PRESETS.FULL_CONTROL,
        inheritToChildren: true, // Workspace permissions inherit to projects
        createdById: ctx.user.id,
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
            projects: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Get member counts from ACL entries for all workspaces
    const memberCounts = await ctx.prisma.aclEntry.groupBy({
      by: ['resourceId'],
      where: {
        resourceType: 'workspace',
        resourceId: { in: workspaceIds },
        principalType: 'user',
        deny: false,
      },
      _count: { principalId: true },
    })
    const memberCountMap = new Map(memberCounts.map(m => [m.resourceId, m._count.principalId]))

    // Create a role map from userWorkspaces
    const roleMap = new Map(userWorkspaces.map((w) => [w.id, w.role]))

    return workspaces.map((workspace) => ({
      ...workspace,
      // Convert OWNER to ADMIN for display (OWNER no longer exists for workspaces)
      role: roleMap.get(workspace.id) === 'OWNER' ? 'ADMIN' : roleMap.get(workspace.id) ?? 'VIEWER',
      memberCount: memberCountMap.get(workspace.id) ?? 0,
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

      // Get member count from ACL entries
      const memberCount = await ctx.prisma.aclEntry.count({
        where: {
          resourceType: 'workspace',
          resourceId: input.workspaceId,
          principalType: 'user',
          deny: false,
        },
      })

      return {
        ...workspace,
        memberCount,
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

      // Get member count from ACL entries
      const memberCount = await ctx.prisma.aclEntry.count({
        where: {
          resourceType: 'workspace',
          resourceId: workspace.id,
          principalType: 'user',
          deny: false,
        },
      })

      return {
        ...workspace,
        role: access.role === 'OWNER' ? 'ADMIN' : access.role,
        memberCount,
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

      // Get members from ACL entries for this workspace
      const aclEntries = await ctx.prisma.aclEntry.findMany({
        where: {
          resourceType: 'workspace',
          resourceId: input.workspaceId,
          principalType: 'user',
          deny: false,
        },
      })

      // Get user details for all principals
      const userIds = aclEntries.map(e => e.principalId)
      const users = await ctx.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatarUrl: true,
        },
      })
      const userMap = new Map(users.map(u => [u.id, u]))

      // Map ACL permissions to roles
      const memberMap = new Map<number, {
        id: number
        email: string
        username: string
        name: string | null
        avatarUrl: string | null
        role: string
        joinedAt: Date
        source: 'acl'
      }>()

      for (const entry of aclEntries) {
        const user = userMap.get(entry.principalId)
        if (!user) continue

        // Determine role based on permissions
        let role: string
        if (entry.permissions & ACL_PERMISSIONS.PERMISSIONS) {
          role = 'ADMIN' // Has P bit = can manage permissions = admin
        } else if (entry.permissions & ACL_PERMISSIONS.WRITE) {
          role = 'MEMBER' // Has W bit = can modify = member
        } else if (entry.permissions & ACL_PERMISSIONS.READ) {
          role = 'VIEWER' // Has R bit only = viewer
        } else {
          continue // No relevant permissions
        }

        memberMap.set(user.id, {
          ...user,
          role,
          joinedAt: entry.createdAt,
          source: 'acl',
        })
      }

      // Check for Super Admins (users with admin:root ACL)
      const memberIds = Array.from(memberMap.keys())
      const superAdminEntries = await ctx.prisma.aclEntry.findMany({
        where: {
          resourceType: 'admin',
          resourceId: null,
          principalType: 'user',
          principalId: { in: memberIds },
          deny: false,
          permissions: { gte: ACL_PERMISSIONS.PERMISSIONS },
        },
        select: { principalId: true },
      })
      const superAdminIds = new Set(superAdminEntries.map(e => e.principalId))

      // Convert to array and apply Super Admin override
      const members = Array.from(memberMap.values()).map((member) => ({
        ...member,
        // Super Admins get SYSTEM role, overriding any other role
        role: superAdminIds.has(member.id) ? 'SYSTEM' : member.role,
        isDomainAdmin: superAdminIds.has(member.id),
      }))

      // Sort: SYSTEM first, then ADMIN, then by name
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

      // Only Super Admins can invite users as ADMIN
      if (input.role === 'ADMIN') {
        const isSuperAdmin = await aclService.hasPermission(
          ctx.user.id,
          'admin',
          null,
          ACL_PERMISSIONS.PERMISSIONS
        )

        if (!isSuperAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Super Admins can invite users as administrators',
          })
        }
      }

      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      })

      if (existingUser) {
        // Check if already a member via ACL
        const existingAcl = await ctx.prisma.aclEntry.findFirst({
          where: {
            resourceType: 'workspace',
            resourceId: input.workspaceId,
            principalType: 'user',
            principalId: existingUser.id,
            deny: false,
          },
        })

        if (existingAcl) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User is already a member of this workspace',
          })
        }

        // Create ACL entry for the user (ACL-only, no legacy WorkspaceUser)
        const aclPermissions =
          input.role === 'ADMIN' ? ACL_PRESETS.FULL_CONTROL :
          input.role === 'MEMBER' ? ACL_PRESETS.CONTRIBUTOR :
          ACL_PRESETS.READ_ONLY // VIEWER

        await aclService.grantPermission({
          resourceType: 'workspace',
          resourceId: input.workspaceId,
          principalType: 'user',
          principalId: existingUser.id,
          permissions: aclPermissions,
          inheritToChildren: true,
          createdById: ctx.user.id,
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

      // Get target member from ACL
      const targetAcl = await ctx.prisma.aclEntry.findFirst({
        where: {
          resourceType: 'workspace',
          resourceId: input.workspaceId,
          principalType: 'user',
          principalId: input.userId,
          deny: false,
        },
      })

      if (!targetAcl) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        })
      }

      // Check if target is an admin (has FULL_CONTROL / P bit)
      const isTargetAdmin = (targetAcl.permissions & ACL_PERMISSIONS.PERMISSIONS) !== 0

      // Cannot remove owner (users with P bit on workspace who created it)
      // For now, we protect all admins the same way
      if (isTargetAdmin) {
        // Check if current user has admin ACL on 'admin' resource (super admin)
        const isSuperAdmin = await aclService.hasPermission(
          ctx.user.id,
          'admin',
          null,
          ACL_PERMISSIONS.PERMISSIONS
        )

        if (!isSuperAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Super Admins can remove workspace administrators',
          })
        }
      }

      // Revoke ACL permissions for this workspace (ACL-only, no legacy)
      await aclService.revokePermission({
        resourceType: 'workspace',
        resourceId: input.workspaceId,
        principalType: 'user',
        principalId: input.userId,
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

      // Get target member from ACL
      const targetAcl = await ctx.prisma.aclEntry.findFirst({
        where: {
          resourceType: 'workspace',
          resourceId: input.workspaceId,
          principalType: 'user',
          principalId: input.userId,
          deny: false,
        },
      })

      if (!targetAcl) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        })
      }

      // Check if target is currently an admin (has P bit)
      const isTargetAdmin = (targetAcl.permissions & ACL_PERMISSIONS.PERMISSIONS) !== 0

      // Only Super Admins can promote to/demote from ADMIN
      if (input.role === 'ADMIN' || isTargetAdmin) {
        const isSuperAdmin = await aclService.hasPermission(
          ctx.user.id,
          'admin',
          null,
          ACL_PERMISSIONS.PERMISSIONS
        )

        if (!isSuperAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Super Admins can manage administrator roles',
          })
        }
      }

      // Update ACL permissions based on new role (ACL-only, no legacy)
      const aclPermissions =
        input.role === 'ADMIN' ? ACL_PRESETS.FULL_CONTROL :
        input.role === 'MEMBER' ? ACL_PRESETS.CONTRIBUTOR :
        ACL_PRESETS.READ_ONLY // VIEWER

      await aclService.revokePermission({
        resourceType: 'workspace',
        resourceId: input.workspaceId,
        principalType: 'user',
        principalId: input.userId,
      })

      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: input.workspaceId,
        principalType: 'user',
        principalId: input.userId,
        permissions: aclPermissions,
        inheritToChildren: true,
        createdById: ctx.user.id,
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

      // Check if user is a Super Admin (has admin ACL)
      const isSuperAdmin = await aclService.hasPermission(
        ctx.user.id,
        'admin',
        null,
        ACL_PERMISSIONS.PERMISSIONS
      )

      // Only Super Admins can search for users outside the workspace
      // Workspace Admins should use email invite instead
      if (!isSuperAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Use email invite to add users. You cannot search users outside your workspace.',
        })
      }

      // Get existing workspace member user IDs from ACL
      const existingAclEntries = await ctx.prisma.aclEntry.findMany({
        where: {
          resourceType: 'workspace',
          resourceId: input.workspaceId,
          principalType: 'user',
          deny: false,
        },
        select: { principalId: true },
      })
      const existingMemberIds = existingAclEntries.map((e) => e.principalId)

      // Search for users not in the workspace (Super Admins only)
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

      // Only Super Admins can add users as ADMIN
      if (input.role === 'ADMIN') {
        const isSuperAdmin = await aclService.hasPermission(
          ctx.user.id,
          'admin',
          null,
          ACL_PERMISSIONS.PERMISSIONS
        )

        if (!isSuperAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Super Admins can add users as administrators',
          })
        }
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

      // Check if already a member via ACL
      const existingAcl = await ctx.prisma.aclEntry.findFirst({
        where: {
          resourceType: 'workspace',
          resourceId: input.workspaceId,
          principalType: 'user',
          principalId: input.userId,
          deny: false,
        },
      })

      if (existingAcl) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User is already a member of this workspace',
        })
      }

      // Create ACL entry with appropriate permissions (ACL-only, no legacy)
      const aclPermissions = input.role === 'ADMIN' ? ACL_PRESETS.FULL_CONTROL
        : input.role === 'MEMBER' ? ACL_PRESETS.CONTRIBUTOR
        : ACL_PRESETS.READ_ONLY

      await aclService.grantPermission({
        resourceType: 'workspace',
        resourceId: input.workspaceId,
        principalType: 'user',
        principalId: input.userId,
        permissions: aclPermissions,
        inheritToChildren: true,
        createdById: ctx.user.id,
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
