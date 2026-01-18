/*
 * Seed Script: AD-Style Permissions
 * Version: 1.0.0
 *
 * Creates the default permissions and system groups for the AD-style permission system.
 *
 * Usage:
 *   npx ts-node prisma/seed-permissions.ts
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-05
 * =============================================================================
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// Permission Definitions
// =============================================================================

interface PermissionDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  parentName?: string;
  sortOrder: number;
}

const PERMISSIONS: PermissionDefinition[] = [
  // =============================================================================
  // System Permissions
  // =============================================================================
  {
    name: 'system',
    displayName: 'System',
    description: 'System-level permissions',
    category: 'system',
    sortOrder: 0,
  },
  {
    name: 'system.admin',
    displayName: 'System Administration',
    description: 'Full system administration access',
    category: 'system',
    parentName: 'system',
    sortOrder: 1,
  },
  {
    name: 'system.users.manage',
    displayName: 'Manage Users',
    description: 'Create, edit, and delete users',
    category: 'system',
    parentName: 'system',
    sortOrder: 2,
  },
  {
    name: 'system.groups.manage',
    displayName: 'Manage Groups',
    description: 'Create, edit, and delete groups',
    category: 'system',
    parentName: 'system',
    sortOrder: 3,
  },
  {
    name: 'system.settings.manage',
    displayName: 'Manage Settings',
    description: 'Manage system settings',
    category: 'system',
    parentName: 'system',
    sortOrder: 4,
  },
  {
    name: 'system.audit.view',
    displayName: 'View Audit Logs',
    description: 'View system audit logs',
    category: 'system',
    parentName: 'system',
    sortOrder: 5,
  },

  // =============================================================================
  // Workspace Permissions
  // =============================================================================
  {
    name: 'workspaces',
    displayName: 'Workspaces',
    description: 'Workspace permissions',
    category: 'workspaces',
    sortOrder: 100,
  },
  {
    name: 'workspaces.create',
    displayName: 'Create Workspaces',
    description: 'Create new workspaces',
    category: 'workspaces',
    parentName: 'workspaces',
    sortOrder: 101,
  },
  {
    name: 'workspaces.view',
    displayName: 'View Workspaces',
    description: 'View workspace details',
    category: 'workspaces',
    parentName: 'workspaces',
    sortOrder: 102,
  },
  {
    name: 'workspaces.edit',
    displayName: 'Edit Workspaces',
    description: 'Edit workspace settings and info',
    category: 'workspaces',
    parentName: 'workspaces',
    sortOrder: 103,
  },
  {
    name: 'workspaces.delete',
    displayName: 'Delete Workspaces',
    description: 'Delete workspaces',
    category: 'workspaces',
    parentName: 'workspaces',
    sortOrder: 104,
  },
  {
    name: 'workspaces.members.manage',
    displayName: 'Manage Workspace Members',
    description: 'Add and remove workspace members',
    category: 'workspaces',
    parentName: 'workspaces',
    sortOrder: 105,
  },
  {
    name: 'workspaces.projects.create',
    displayName: 'Create Projects',
    description: 'Create new projects in workspace',
    category: 'workspaces',
    parentName: 'workspaces',
    sortOrder: 106,
  },

  // =============================================================================
  // Project Permissions
  // =============================================================================
  {
    name: 'projects',
    displayName: 'Projects',
    description: 'Project permissions',
    category: 'projects',
    sortOrder: 200,
  },
  {
    name: 'projects.view',
    displayName: 'View Projects',
    description: 'View project and board',
    category: 'projects',
    parentName: 'projects',
    sortOrder: 201,
  },
  {
    name: 'projects.edit',
    displayName: 'Edit Projects',
    description: 'Edit project settings and info',
    category: 'projects',
    parentName: 'projects',
    sortOrder: 202,
  },
  {
    name: 'projects.delete',
    displayName: 'Delete Projects',
    description: 'Delete projects',
    category: 'projects',
    parentName: 'projects',
    sortOrder: 203,
  },
  {
    name: 'projects.members.manage',
    displayName: 'Manage Project Members',
    description: 'Add and remove project members',
    category: 'projects',
    parentName: 'projects',
    sortOrder: 204,
  },
  {
    name: 'projects.columns.manage',
    displayName: 'Manage Columns',
    description: 'Create, edit, and delete columns',
    category: 'projects',
    parentName: 'projects',
    sortOrder: 205,
  },
  {
    name: 'projects.swimlanes.manage',
    displayName: 'Manage Swimlanes',
    description: 'Create, edit, and delete swimlanes',
    category: 'projects',
    parentName: 'projects',
    sortOrder: 206,
  },

  // =============================================================================
  // Task Permissions
  // =============================================================================
  {
    name: 'tasks',
    displayName: 'Tasks',
    description: 'Task permissions',
    category: 'tasks',
    sortOrder: 300,
  },
  {
    name: 'tasks.view',
    displayName: 'View Tasks',
    description: 'View tasks and details',
    category: 'tasks',
    parentName: 'tasks',
    sortOrder: 301,
  },
  {
    name: 'tasks.create',
    displayName: 'Create Tasks',
    description: 'Create new tasks',
    category: 'tasks',
    parentName: 'tasks',
    sortOrder: 302,
  },
  {
    name: 'tasks.edit',
    displayName: 'Edit Tasks',
    description: 'Edit task details',
    category: 'tasks',
    parentName: 'tasks',
    sortOrder: 303,
  },
  {
    name: 'tasks.edit.own',
    displayName: 'Edit Own Tasks',
    description: 'Edit tasks created by self',
    category: 'tasks',
    parentName: 'tasks',
    sortOrder: 304,
  },
  {
    name: 'tasks.delete',
    displayName: 'Delete Tasks',
    description: 'Delete tasks',
    category: 'tasks',
    parentName: 'tasks',
    sortOrder: 305,
  },
  {
    name: 'tasks.move',
    displayName: 'Move Tasks',
    description: 'Move tasks between columns',
    category: 'tasks',
    parentName: 'tasks',
    sortOrder: 306,
  },
  {
    name: 'tasks.assign',
    displayName: 'Assign Tasks',
    description: 'Assign users to tasks',
    category: 'tasks',
    parentName: 'tasks',
    sortOrder: 307,
  },
  {
    name: 'tasks.time.manage',
    displayName: 'Manage Time Tracking',
    description: 'Log and edit time on tasks',
    category: 'tasks',
    parentName: 'tasks',
    sortOrder: 308,
  },

  // =============================================================================
  // Subtask Permissions
  // =============================================================================
  {
    name: 'subtasks',
    displayName: 'Subtasks',
    description: 'Subtask permissions',
    category: 'subtasks',
    sortOrder: 400,
  },
  {
    name: 'subtasks.view',
    displayName: 'View Subtasks',
    description: 'View subtasks',
    category: 'subtasks',
    parentName: 'subtasks',
    sortOrder: 401,
  },
  {
    name: 'subtasks.create',
    displayName: 'Create Subtasks',
    description: 'Create new subtasks',
    category: 'subtasks',
    parentName: 'subtasks',
    sortOrder: 402,
  },
  {
    name: 'subtasks.edit',
    displayName: 'Edit Subtasks',
    description: 'Edit subtask details',
    category: 'subtasks',
    parentName: 'subtasks',
    sortOrder: 403,
  },
  {
    name: 'subtasks.delete',
    displayName: 'Delete Subtasks',
    description: 'Delete subtasks',
    category: 'subtasks',
    parentName: 'subtasks',
    sortOrder: 404,
  },

  // =============================================================================
  // Comment Permissions
  // =============================================================================
  {
    name: 'comments',
    displayName: 'Comments',
    description: 'Comment permissions',
    category: 'comments',
    sortOrder: 500,
  },
  {
    name: 'comments.view',
    displayName: 'View Comments',
    description: 'View comments on tasks',
    category: 'comments',
    parentName: 'comments',
    sortOrder: 501,
  },
  {
    name: 'comments.create',
    displayName: 'Create Comments',
    description: 'Add comments to tasks',
    category: 'comments',
    parentName: 'comments',
    sortOrder: 502,
  },
  {
    name: 'comments.edit',
    displayName: 'Edit Comments',
    description: 'Edit any comments',
    category: 'comments',
    parentName: 'comments',
    sortOrder: 503,
  },
  {
    name: 'comments.edit.own',
    displayName: 'Edit Own Comments',
    description: 'Edit own comments',
    category: 'comments',
    parentName: 'comments',
    sortOrder: 504,
  },
  {
    name: 'comments.delete',
    displayName: 'Delete Comments',
    description: 'Delete any comments',
    category: 'comments',
    parentName: 'comments',
    sortOrder: 505,
  },

  // =============================================================================
  // Attachment Permissions
  // =============================================================================
  {
    name: 'attachments',
    displayName: 'Attachments',
    description: 'Attachment permissions',
    category: 'attachments',
    sortOrder: 600,
  },
  {
    name: 'attachments.view',
    displayName: 'View Attachments',
    description: 'View and download attachments',
    category: 'attachments',
    parentName: 'attachments',
    sortOrder: 601,
  },
  {
    name: 'attachments.create',
    displayName: 'Upload Attachments',
    description: 'Upload files to tasks',
    category: 'attachments',
    parentName: 'attachments',
    sortOrder: 602,
  },
  {
    name: 'attachments.delete',
    displayName: 'Delete Attachments',
    description: 'Delete any attachments',
    category: 'attachments',
    parentName: 'attachments',
    sortOrder: 603,
  },

  // =============================================================================
  // Sprint Permissions
  // =============================================================================
  {
    name: 'sprints',
    displayName: 'Sprints',
    description: 'Sprint permissions',
    category: 'sprints',
    sortOrder: 700,
  },
  {
    name: 'sprints.view',
    displayName: 'View Sprints',
    description: 'View sprint details',
    category: 'sprints',
    parentName: 'sprints',
    sortOrder: 701,
  },
  {
    name: 'sprints.create',
    displayName: 'Create Sprints',
    description: 'Create new sprints',
    category: 'sprints',
    parentName: 'sprints',
    sortOrder: 702,
  },
  {
    name: 'sprints.edit',
    displayName: 'Edit Sprints',
    description: 'Edit sprint details',
    category: 'sprints',
    parentName: 'sprints',
    sortOrder: 703,
  },
  {
    name: 'sprints.delete',
    displayName: 'Delete Sprints',
    description: 'Delete sprints',
    category: 'sprints',
    parentName: 'sprints',
    sortOrder: 704,
  },
  {
    name: 'sprints.manage',
    displayName: 'Manage Sprints',
    description: 'Start, complete, and manage sprints',
    category: 'sprints',
    parentName: 'sprints',
    sortOrder: 705,
  },

  // =============================================================================
  // Milestone Permissions
  // =============================================================================
  {
    name: 'milestones',
    displayName: 'Milestones',
    description: 'Milestone permissions',
    category: 'milestones',
    sortOrder: 800,
  },
  {
    name: 'milestones.view',
    displayName: 'View Milestones',
    description: 'View milestone details',
    category: 'milestones',
    parentName: 'milestones',
    sortOrder: 801,
  },
  {
    name: 'milestones.create',
    displayName: 'Create Milestones',
    description: 'Create new milestones',
    category: 'milestones',
    parentName: 'milestones',
    sortOrder: 802,
  },
  {
    name: 'milestones.edit',
    displayName: 'Edit Milestones',
    description: 'Edit milestone details',
    category: 'milestones',
    parentName: 'milestones',
    sortOrder: 803,
  },
  {
    name: 'milestones.delete',
    displayName: 'Delete Milestones',
    description: 'Delete milestones',
    category: 'milestones',
    parentName: 'milestones',
    sortOrder: 804,
  },

  // =============================================================================
  // Wiki Permissions
  // =============================================================================
  {
    name: 'wiki',
    displayName: 'Wiki',
    description: 'Wiki permissions',
    category: 'wiki',
    sortOrder: 900,
  },
  {
    name: 'wiki.view',
    displayName: 'View Wiki',
    description: 'View wiki pages',
    category: 'wiki',
    parentName: 'wiki',
    sortOrder: 901,
  },
  {
    name: 'wiki.create',
    displayName: 'Create Wiki Pages',
    description: 'Create new wiki pages',
    category: 'wiki',
    parentName: 'wiki',
    sortOrder: 902,
  },
  {
    name: 'wiki.edit',
    displayName: 'Edit Wiki Pages',
    description: 'Edit wiki pages',
    category: 'wiki',
    parentName: 'wiki',
    sortOrder: 903,
  },
  {
    name: 'wiki.delete',
    displayName: 'Delete Wiki Pages',
    description: 'Delete wiki pages',
    category: 'wiki',
    parentName: 'wiki',
    sortOrder: 904,
  },

  // =============================================================================
  // Tag Permissions
  // =============================================================================
  {
    name: 'tags',
    displayName: 'Tags',
    description: 'Tag permissions',
    category: 'tags',
    sortOrder: 1000,
  },
  {
    name: 'tags.view',
    displayName: 'View Tags',
    description: 'View available tags',
    category: 'tags',
    parentName: 'tags',
    sortOrder: 1001,
  },
  {
    name: 'tags.create',
    displayName: 'Create Tags',
    description: 'Create new tags',
    category: 'tags',
    parentName: 'tags',
    sortOrder: 1002,
  },
  {
    name: 'tags.edit',
    displayName: 'Edit Tags',
    description: 'Edit tag details',
    category: 'tags',
    parentName: 'tags',
    sortOrder: 1003,
  },
  {
    name: 'tags.delete',
    displayName: 'Delete Tags',
    description: 'Delete tags',
    category: 'tags',
    parentName: 'tags',
    sortOrder: 1004,
  },
  {
    name: 'tags.assign',
    displayName: 'Assign Tags',
    description: 'Add and remove tags from tasks',
    category: 'tags',
    parentName: 'tags',
    sortOrder: 1005,
  },
];

// =============================================================================
// Default Group Permission Sets
// =============================================================================

// Permissions granted to Domain Admins (System group)
const DOMAIN_ADMIN_PERMISSIONS = PERMISSIONS.map((p) => p.name);

// Permissions granted to Workspace Admins
const WORKSPACE_ADMIN_PERMISSIONS = [
  'workspaces.view',
  'workspaces.edit',
  'workspaces.members.manage',
  'workspaces.projects.create',
  'projects',
  'projects.view',
  'projects.edit',
  'projects.delete',
  'projects.members.manage',
  'projects.columns.manage',
  'projects.swimlanes.manage',
  'tasks',
  'tasks.view',
  'tasks.create',
  'tasks.edit',
  'tasks.delete',
  'tasks.move',
  'tasks.assign',
  'tasks.time.manage',
  'subtasks',
  'subtasks.view',
  'subtasks.create',
  'subtasks.edit',
  'subtasks.delete',
  'comments',
  'comments.view',
  'comments.create',
  'comments.edit',
  'comments.delete',
  'attachments',
  'attachments.view',
  'attachments.create',
  'attachments.delete',
  'sprints',
  'sprints.view',
  'sprints.create',
  'sprints.edit',
  'sprints.delete',
  'sprints.manage',
  'milestones',
  'milestones.view',
  'milestones.create',
  'milestones.edit',
  'milestones.delete',
  'wiki',
  'wiki.view',
  'wiki.create',
  'wiki.edit',
  'wiki.delete',
  'tags',
  'tags.view',
  'tags.create',
  'tags.edit',
  'tags.delete',
  'tags.assign',
];

// Permissions granted to Workspace Members
const WORKSPACE_MEMBER_PERMISSIONS = [
  'workspaces.view',
  'projects.view',
  'tasks.view',
  'tasks.create',
  'tasks.edit.own',
  'tasks.move',
  'subtasks.view',
  'subtasks.create',
  'subtasks.edit',
  'comments.view',
  'comments.create',
  'comments.edit.own',
  'attachments.view',
  'attachments.create',
  'sprints.view',
  'milestones.view',
  'wiki.view',
  'tags.view',
  'tags.assign',
];

// Permissions granted to Project Members (additional to workspace member)
const PROJECT_MEMBER_PERMISSIONS = [
  'tasks.edit',
  'tasks.assign',
  'tasks.time.manage',
  'subtasks.delete',
  'wiki.create',
  'wiki.edit',
];

// =============================================================================
// Seed Functions
// =============================================================================

async function seedPermissions() {
  console.log('Seeding permissions...');

  // First create all permissions without parent references
  const permissionMap = new Map<string, number>();

  for (const perm of PERMISSIONS) {
    const existing = await prisma.permission.findUnique({
      where: { name: perm.name },
    });

    if (existing) {
      permissionMap.set(perm.name, existing.id);
      console.log(`  [EXISTS] ${perm.name}`);
    } else {
      const created = await prisma.permission.create({
        data: {
          name: perm.name,
          displayName: perm.displayName,
          description: perm.description,
          category: perm.category,
          sortOrder: perm.sortOrder,
        },
      });
      permissionMap.set(perm.name, created.id);
      console.log(`  [CREATED] ${perm.name}`);
    }
  }

  // Now update parent references
  for (const perm of PERMISSIONS) {
    if (perm.parentName) {
      const permId = permissionMap.get(perm.name);
      const parentId = permissionMap.get(perm.parentName);
      if (permId && parentId) {
        await prisma.permission.update({
          where: { id: permId },
          data: { parentId },
        });
      }
    }
  }

  console.log(`  Total: ${PERMISSIONS.length} permissions`);
  return permissionMap;
}

async function seedDomainAdminsGroup(permissionMap: Map<string, number>) {
  console.log('\nSeeding Domain Admins group...');

  // Check if Domain Admins group exists
  let domainAdmins = await prisma.group.findUnique({
    where: { name: 'Domain Admins' },
  });

  if (!domainAdmins) {
    domainAdmins = await prisma.group.create({
      data: {
        name: 'Domain Admins',
        displayName: 'Domain Admins',
        distinguishedName: 'CN=Domain Admins,OU=Security Groups,DC=kanbu,DC=local',
        description: 'Domain Administrators - Full system access',
        type: 'SYSTEM',
        scope: 'UNIVERSAL',
        isSystem: true,
        isActive: true,
      },
    });
    console.log('  [CREATED] Domain Admins group');
  } else {
    console.log('  [EXISTS] Domain Admins group');
  }

  // Grant all permissions to Domain Admins
  for (const permName of DOMAIN_ADMIN_PERMISSIONS) {
    const permId = permissionMap.get(permName);
    if (permId) {
      // Check if permission already exists
      const existing = await prisma.groupPermission.findFirst({
        where: {
          groupId: domainAdmins.id,
          permissionId: permId,
          workspaceId: null,
          projectId: null,
        },
      });
      if (!existing) {
        await prisma.groupPermission.create({
          data: {
            groupId: domainAdmins.id,
            permissionId: permId,
            accessType: 'ALLOW',
            inherited: false,
          },
        });
      }
    }
  }

  console.log(`  Granted ${DOMAIN_ADMIN_PERMISSIONS.length} permissions`);
  return domainAdmins;
}

async function seedDefaultGroupPermissions(permissionMap: Map<string, number>) {
  console.log('\nSeeding default group permissions...');

  // Get all WORKSPACE_ADMIN groups
  const workspaceAdminGroups = await prisma.group.findMany({
    where: { type: 'WORKSPACE_ADMIN', isActive: true },
  });

  for (const group of workspaceAdminGroups) {
    let granted = 0;
    for (const permName of WORKSPACE_ADMIN_PERMISSIONS) {
      const permId = permissionMap.get(permName);
      if (permId) {
        const existing = await prisma.groupPermission.findFirst({
          where: {
            groupId: group.id,
            permissionId: permId,
            workspaceId: null,
            projectId: null,
          },
        });
        if (!existing) {
          await prisma.groupPermission.create({
            data: {
              groupId: group.id,
              permissionId: permId,
              accessType: 'ALLOW',
              inherited: false,
            },
          });
        }
        granted++;
      }
    }
    console.log(`  [WORKSPACE_ADMIN] ${group.name}: ${granted} permissions`);
  }

  // Get all WORKSPACE groups
  const workspaceGroups = await prisma.group.findMany({
    where: { type: 'WORKSPACE', isActive: true },
  });

  for (const group of workspaceGroups) {
    let granted = 0;
    for (const permName of WORKSPACE_MEMBER_PERMISSIONS) {
      const permId = permissionMap.get(permName);
      if (permId) {
        const existing = await prisma.groupPermission.findFirst({
          where: {
            groupId: group.id,
            permissionId: permId,
            workspaceId: null,
            projectId: null,
          },
        });
        if (!existing) {
          await prisma.groupPermission.create({
            data: {
              groupId: group.id,
              permissionId: permId,
              accessType: 'ALLOW',
              inherited: false,
            },
          });
        }
        granted++;
      }
    }
    console.log(`  [WORKSPACE] ${group.name}: ${granted} permissions`);
  }

  // Get all PROJECT groups
  const projectGroups = await prisma.group.findMany({
    where: { type: 'PROJECT', isActive: true },
  });

  for (const group of projectGroups) {
    let granted = 0;
    for (const permName of PROJECT_MEMBER_PERMISSIONS) {
      const permId = permissionMap.get(permName);
      if (permId) {
        const existing = await prisma.groupPermission.findFirst({
          where: {
            groupId: group.id,
            permissionId: permId,
            workspaceId: null,
            projectId: null,
          },
        });
        if (!existing) {
          await prisma.groupPermission.create({
            data: {
              groupId: group.id,
              permissionId: permId,
              accessType: 'ALLOW',
              inherited: false,
            },
          });
        }
        granted++;
      }
    }
    console.log(`  [PROJECT] ${group.name}: ${granted} permissions`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('AD-Style Permission System Seed');
  console.log('='.repeat(60));

  try {
    const permissionMap = await seedPermissions();
    await seedDomainAdminsGroup(permissionMap);
    await seedDefaultGroupPermissions(permissionMap);

    console.log('\n' + '='.repeat(60));
    console.log('Seed completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
