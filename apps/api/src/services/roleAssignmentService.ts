/*
 * Role Assignment Service
 * Version: 1.0.0
 *
 * Manages AD-style role assignments for Security Groups.
 * Allows Security Groups to be assigned to multiple workspaces/projects with roles.
 *
 * Features:
 * - Assign security groups to workspaces or projects
 * - Role inheritance (workspace role flows to child projects)
 * - Check user's effective role in a scope
 * - List assignments for groups, workspaces, or projects
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * =============================================================================
 */

import { prisma } from '../lib/prisma'
import type { AssignmentRole } from '@prisma/client'

// =============================================================================
// Types
// =============================================================================

export interface AssignGroupInput {
  groupId: number
  workspaceId?: number
  projectId?: number
  role: AssignmentRole
  inheritToChildren?: boolean
  createdById?: number
}

export interface EffectiveRole {
  role: AssignmentRole | null
  source: 'direct' | 'inherited' | 'none'
  sourceGroupId?: number
  sourceGroupName?: string
  inheritedFromWorkspaceId?: number
}

// Role hierarchy for comparison (higher = more permissions)
const ROLE_HIERARCHY: Record<AssignmentRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  MANAGER: 3,
  ADMIN: 4,
  OWNER: 5,
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Assign a security group to a workspace or project with a role.
 * Only works for groups with isSecurityGroup = true.
 */
export async function assignGroupToScope(input: AssignGroupInput) {
  const { groupId, workspaceId, projectId, role, inheritToChildren = true, createdById } = input

  // Validate: exactly one of workspaceId or projectId must be set
  if ((!workspaceId && !projectId) || (workspaceId && projectId)) {
    throw new Error('Exactly one of workspaceId or projectId must be provided')
  }

  // Verify the group is a security group
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, isSecurityGroup: true, type: true },
  })

  if (!group) {
    throw new Error('Group not found')
  }

  if (!group.isSecurityGroup && group.type !== 'SYSTEM' && group.type !== 'CUSTOM') {
    throw new Error('Only security groups, system groups, or custom groups can be assigned via role assignments')
  }

  // Check if assignment already exists
  const existing = await prisma.roleAssignment.findFirst({
    where: {
      groupId,
      workspaceId: workspaceId ?? null,
      projectId: projectId ?? null,
    },
  })

  if (existing) {
    // Update existing assignment
    return prisma.roleAssignment.update({
      where: { id: existing.id },
      data: {
        role,
        inheritToChildren,
      },
    })
  }

  // Create new assignment
  return prisma.roleAssignment.create({
    data: {
      groupId,
      workspaceId,
      projectId,
      role,
      inheritToChildren,
      createdById,
    },
  })
}

/**
 * Remove a role assignment.
 */
export async function removeAssignment(assignmentId: number) {
  return prisma.roleAssignment.delete({
    where: { id: assignmentId },
  })
}

/**
 * Remove assignment by group and scope.
 */
export async function removeAssignmentByScope(
  groupId: number,
  workspaceId?: number,
  projectId?: number
) {
  // Find the assignment first since composite unique with nullable fields is tricky
  const existing = await prisma.roleAssignment.findFirst({
    where: {
      groupId,
      workspaceId: workspaceId ?? null,
      projectId: projectId ?? null,
    },
  })

  if (!existing) {
    throw new Error('Role assignment not found')
  }

  return prisma.roleAssignment.delete({
    where: { id: existing.id },
  })
}

/**
 * Get all role assignments for a workspace.
 */
export async function getWorkspaceAssignments(workspaceId: number) {
  return prisma.roleAssignment.findMany({
    where: { workspaceId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          isSecurityGroup: true,
          _count: {
            select: { members: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get all role assignments for a project (direct assignments only).
 */
export async function getProjectAssignments(projectId: number) {
  return prisma.roleAssignment.findMany({
    where: { projectId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          isSecurityGroup: true,
          _count: {
            select: { members: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get all role assignments for a project, including inherited from workspace.
 */
export async function getProjectAssignmentsWithInherited(projectId: number) {
  // Get the project to find its workspace
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  })

  if (!project) {
    throw new Error('Project not found')
  }

  // Get direct project assignments
  const directAssignments = await prisma.roleAssignment.findMany({
    where: { projectId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          isSecurityGroup: true,
        },
      },
    },
  })

  // Get inherited workspace assignments (where inheritToChildren = true)
  const inheritedAssignments = await prisma.roleAssignment.findMany({
    where: {
      workspaceId: project.workspaceId,
      inheritToChildren: true,
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          isSecurityGroup: true,
        },
      },
    },
  })

  return {
    direct: directAssignments,
    inherited: inheritedAssignments.map((a) => ({
      ...a,
      _inherited: true,
      _sourceWorkspaceId: project.workspaceId,
    })),
  }
}

/**
 * Get all assignments where a group is assigned.
 */
export async function getGroupAssignments(groupId: number) {
  return prisma.roleAssignment.findMany({
    where: { groupId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          identifier: true,
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get a user's effective role in a workspace via security group assignments.
 * This checks all security groups the user is a member of.
 */
export async function getUserWorkspaceRoleViaGroups(
  userId: number,
  workspaceId: number
): Promise<EffectiveRole> {
  // Get all groups the user is a member of
  const userGroups = await prisma.groupMember.findMany({
    where: {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          isSecurityGroup: true,
          roleAssignments: {
            where: { workspaceId },
            select: {
              role: true,
              inheritToChildren: true,
            },
          },
        },
      },
    },
  })

  // Find the highest role among all groups
  let highestRole: AssignmentRole | null = null
  let sourceGroup: { id: number; name: string } | null = null

  for (const membership of userGroups) {
    const group = membership.group
    for (const assignment of group.roleAssignments) {
      if (!highestRole || ROLE_HIERARCHY[assignment.role] > ROLE_HIERARCHY[highestRole]) {
        highestRole = assignment.role
        sourceGroup = { id: group.id, name: group.displayName }
      }
    }
  }

  if (highestRole && sourceGroup) {
    return {
      role: highestRole,
      source: 'direct',
      sourceGroupId: sourceGroup.id,
      sourceGroupName: sourceGroup.name,
    }
  }

  return { role: null, source: 'none' }
}

/**
 * Get a user's effective role in a project via security group assignments.
 * Checks both direct project assignments and inherited workspace assignments.
 */
export async function getUserProjectRoleViaGroups(
  userId: number,
  projectId: number
): Promise<EffectiveRole> {
  // Get the project to find its workspace
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  })

  if (!project) {
    return { role: null, source: 'none' }
  }

  // Get all groups the user is a member of
  const userGroups = await prisma.groupMember.findMany({
    where: {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          displayName: true,
          roleAssignments: {
            where: {
              OR: [
                { projectId },
                { workspaceId: project.workspaceId, inheritToChildren: true },
              ],
            },
            select: {
              role: true,
              workspaceId: true,
              projectId: true,
              inheritToChildren: true,
            },
          },
        },
      },
    },
  })

  // Find the highest role, preferring direct project assignments
  let highestDirectRole: AssignmentRole | null = null
  let highestInheritedRole: AssignmentRole | null = null
  let directSourceGroup: { id: number; name: string } | null = null
  let inheritedSourceGroup: { id: number; name: string } | null = null
  let inheritedFromWorkspaceId: number | undefined

  for (const membership of userGroups) {
    const group = membership.group
    for (const assignment of group.roleAssignments) {
      if (assignment.projectId === projectId) {
        // Direct project assignment
        if (!highestDirectRole || ROLE_HIERARCHY[assignment.role] > ROLE_HIERARCHY[highestDirectRole]) {
          highestDirectRole = assignment.role
          directSourceGroup = { id: group.id, name: group.displayName }
        }
      } else if (assignment.workspaceId && assignment.inheritToChildren) {
        // Inherited from workspace
        if (!highestInheritedRole || ROLE_HIERARCHY[assignment.role] > ROLE_HIERARCHY[highestInheritedRole]) {
          highestInheritedRole = assignment.role
          inheritedSourceGroup = { id: group.id, name: group.displayName }
          inheritedFromWorkspaceId = assignment.workspaceId
        }
      }
    }
  }

  // Direct assignment takes precedence, unless inherited is higher
  if (highestDirectRole && directSourceGroup) {
    if (!highestInheritedRole || ROLE_HIERARCHY[highestDirectRole] >= ROLE_HIERARCHY[highestInheritedRole]) {
      return {
        role: highestDirectRole,
        source: 'direct',
        sourceGroupId: directSourceGroup.id,
        sourceGroupName: directSourceGroup.name,
      }
    }
  }

  if (highestInheritedRole && inheritedSourceGroup) {
    return {
      role: highestInheritedRole,
      source: 'inherited',
      sourceGroupId: inheritedSourceGroup.id,
      sourceGroupName: inheritedSourceGroup.name,
      inheritedFromWorkspaceId,
    }
  }

  return { role: null, source: 'none' }
}

/**
 * Check if a role is at least a certain level.
 */
export function roleIsAtLeast(role: AssignmentRole | null, minRole: AssignmentRole): boolean {
  if (!role) return false
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

/**
 * Get the higher of two roles.
 */
export function getHigherRole(
  role1: AssignmentRole | null,
  role2: AssignmentRole | null
): AssignmentRole | null {
  if (!role1) return role2
  if (!role2) return role1
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2] ? role1 : role2
}

/**
 * Get all workspaces a user has access to via security group assignments.
 */
export async function getUserWorkspacesViaGroups(userId: number) {
  // Get all groups the user is a member of with their workspace assignments
  const userGroups = await prisma.groupMember.findMany({
    where: {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      group: {
        select: {
          roleAssignments: {
            where: {
              workspaceId: { not: null },
            },
            select: {
              workspaceId: true,
              role: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  })

  // Aggregate workspaces with highest role
  const workspaceMap = new Map<number, { workspace: NonNullable<typeof userGroups[0]['group']['roleAssignments'][0]['workspace']>; role: AssignmentRole }>()

  for (const membership of userGroups) {
    for (const assignment of membership.group.roleAssignments) {
      if (assignment.workspace && assignment.workspaceId) {
        const existing = workspaceMap.get(assignment.workspaceId)
        if (!existing || ROLE_HIERARCHY[assignment.role] > ROLE_HIERARCHY[existing.role]) {
          workspaceMap.set(assignment.workspaceId, {
            workspace: assignment.workspace,
            role: assignment.role,
          })
        }
      }
    }
  }

  return Array.from(workspaceMap.values())
    .filter((w) => w.workspace.isActive)
    .map((w) => ({
      ...w.workspace,
      roleViaGroup: w.role,
    }))
}
