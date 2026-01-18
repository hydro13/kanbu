/*
 * ACL Migration Helper
 * Version: 1.0.0
 *
 * Converts existing WorkspaceUser and ProjectMember entries to ACL entries.
 * This is a one-time migration to transition to the filesystem-style ACL system.
 *
 * Role to Permission Mapping:
 *
 * Workspace Roles:
 *   VIEWER -> Read only (R=1)
 *   MEMBER -> Contributor (R+W+X=7)
 *   ADMIN  -> Editor (R+W+X+D=15)
 *   OWNER  -> Full Control (R+W+X+D+P=31)
 *
 * Project Roles:
 *   VIEWER  -> Read only (R=1)
 *   MEMBER  -> Contributor (R+W+X=7)
 *   MANAGER -> Editor (R+W+X+D=15)
 *   OWNER   -> Full Control (R+W+X+D+P=31)
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * =============================================================================
 */

import { PrismaClient, WorkspaceRole, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

// Permission constants
const ACL_PERMISSIONS = {
  READ: 1,
  WRITE: 2,
  EXECUTE: 4,
  DELETE: 8,
  PERMISSIONS: 16,
} as const;

const ACL_PRESETS = {
  READ_ONLY: ACL_PERMISSIONS.READ,
  CONTRIBUTOR: ACL_PERMISSIONS.READ | ACL_PERMISSIONS.WRITE | ACL_PERMISSIONS.EXECUTE,
  EDITOR:
    ACL_PERMISSIONS.READ | ACL_PERMISSIONS.WRITE | ACL_PERMISSIONS.EXECUTE | ACL_PERMISSIONS.DELETE,
  FULL_CONTROL:
    ACL_PERMISSIONS.READ |
    ACL_PERMISSIONS.WRITE |
    ACL_PERMISSIONS.EXECUTE |
    ACL_PERMISSIONS.DELETE |
    ACL_PERMISSIONS.PERMISSIONS,
};

// Role to permission mapping
const WORKSPACE_ROLE_TO_PERMISSION: Record<WorkspaceRole, number> = {
  VIEWER: ACL_PRESETS.READ_ONLY,
  MEMBER: ACL_PRESETS.CONTRIBUTOR,
  ADMIN: ACL_PRESETS.EDITOR,
  OWNER: ACL_PRESETS.FULL_CONTROL,
};

const PROJECT_ROLE_TO_PERMISSION: Record<ProjectRole, number> = {
  VIEWER: ACL_PRESETS.READ_ONLY,
  MEMBER: ACL_PRESETS.CONTRIBUTOR,
  MANAGER: ACL_PRESETS.EDITOR,
  OWNER: ACL_PRESETS.FULL_CONTROL,
};

async function migrateWorkspaceUsers(): Promise<number> {
  console.log('Migrating WorkspaceUsers to ACL entries...');

  const workspaceUsers = await prisma.workspaceUser.findMany({
    include: {
      workspace: { select: { name: true } },
      user: { select: { username: true } },
    },
  });

  let migrated = 0;

  for (const wu of workspaceUsers) {
    const permissions = WORKSPACE_ROLE_TO_PERMISSION[wu.role];

    // Check if ACL entry already exists
    const existing = await prisma.aclEntry.findFirst({
      where: {
        resourceType: 'workspace',
        resourceId: wu.workspaceId,
        principalType: 'user',
        principalId: wu.userId,
        deny: false,
      },
    });

    if (!existing) {
      await prisma.aclEntry.create({
        data: {
          resourceType: 'workspace',
          resourceId: wu.workspaceId,
          principalType: 'user',
          principalId: wu.userId,
          permissions,
          deny: false,
          inherited: false,
          inheritToChildren: true, // Workspace permissions inherit to projects
        },
      });
      console.log(`  ✓ ${wu.user.username} -> ${wu.workspace.name} (${wu.role} = ${permissions})`);
      migrated++;
    } else {
      console.log(`  - ${wu.user.username} -> ${wu.workspace.name} (already exists)`);
    }
  }

  return migrated;
}

async function migrateProjectMembers(): Promise<number> {
  console.log('\nMigrating ProjectMembers to ACL entries...');

  const projectMembers = await prisma.projectMember.findMany({
    include: {
      project: { select: { name: true, identifier: true } },
      user: { select: { username: true } },
    },
  });

  let migrated = 0;

  for (const pm of projectMembers) {
    const permissions = PROJECT_ROLE_TO_PERMISSION[pm.role];

    // Check if ACL entry already exists
    const existing = await prisma.aclEntry.findFirst({
      where: {
        resourceType: 'project',
        resourceId: pm.projectId,
        principalType: 'user',
        principalId: pm.userId,
        deny: false,
      },
    });

    if (!existing) {
      await prisma.aclEntry.create({
        data: {
          resourceType: 'project',
          resourceId: pm.projectId,
          principalType: 'user',
          principalId: pm.userId,
          permissions,
          deny: false,
          inherited: false,
          inheritToChildren: false, // Projects don't have children (yet)
        },
      });
      console.log(
        `  ✓ ${pm.user.username} -> ${pm.project.identifier} (${pm.role} = ${permissions})`
      );
      migrated++;
    } else {
      console.log(`  - ${pm.user.username} -> ${pm.project.identifier} (already exists)`);
    }
  }

  return migrated;
}

async function migrateGroups(): Promise<number> {
  console.log('\nMigrating Group permissions to ACL entries...');

  // Get all group permissions
  const groupPermissions = await prisma.groupPermission.findMany({
    include: {
      group: { select: { name: true } },
    },
  });

  let migrated = 0;

  for (const gp of groupPermissions) {
    // Determine resource type and ID from scope
    let resourceType: string;
    let resourceId: number | null;

    if (gp.scope === 'workspace' && gp.workspaceId) {
      resourceType = 'workspace';
      resourceId = gp.workspaceId;
    } else if (gp.scope === 'project' && gp.projectId) {
      resourceType = 'project';
      resourceId = gp.projectId;
    } else if (gp.scope === 'global') {
      // Global = admin access
      resourceType = 'admin';
      resourceId = null;
    } else {
      console.log(`  ! Skipping ${gp.group.name}: unknown scope ${gp.scope}`);
      continue;
    }

    // Convert permission name to bitmask
    // This is a simplified mapping - adjust based on actual permission names used
    let permissions = 0;
    switch (gp.permission.toLowerCase()) {
      case 'view':
      case 'read':
        permissions = ACL_PRESETS.READ_ONLY;
        break;
      case 'edit':
      case 'write':
        permissions = ACL_PRESETS.CONTRIBUTOR;
        break;
      case 'manage':
        permissions = ACL_PRESETS.EDITOR;
        break;
      case 'admin':
      case 'full':
        permissions = ACL_PRESETS.FULL_CONTROL;
        break;
      default:
        // Try to parse as specific permission
        if (gp.permission.includes('read')) permissions |= ACL_PERMISSIONS.READ;
        if (gp.permission.includes('write')) permissions |= ACL_PERMISSIONS.WRITE;
        if (gp.permission.includes('execute') || gp.permission.includes('create'))
          permissions |= ACL_PERMISSIONS.EXECUTE;
        if (gp.permission.includes('delete')) permissions |= ACL_PERMISSIONS.DELETE;
        if (gp.permission.includes('permission') || gp.permission.includes('admin'))
          permissions |= ACL_PERMISSIONS.PERMISSIONS;
    }

    if (permissions === 0) {
      console.log(`  ! Skipping ${gp.group.name}: could not map permission "${gp.permission}"`);
      continue;
    }

    // Check if ACL entry already exists
    const existing = await prisma.aclEntry.findFirst({
      where: {
        resourceType,
        resourceId,
        principalType: 'group',
        principalId: gp.groupId,
        deny: gp.isNegated,
      },
    });

    if (!existing) {
      await prisma.aclEntry.create({
        data: {
          resourceType,
          resourceId,
          principalType: 'group',
          principalId: gp.groupId,
          permissions,
          deny: gp.isNegated,
          inherited: false,
          inheritToChildren: true,
        },
      });
      const denyStr = gp.isNegated ? ' [DENY]' : '';
      console.log(
        `  ✓ Group:${gp.group.name} -> ${resourceType}:${resourceId ?? 'root'} (${gp.permission} = ${permissions})${denyStr}`
      );
      migrated++;
    } else {
      console.log(
        `  - Group:${gp.group.name} -> ${resourceType}:${resourceId ?? 'root'} (already exists)`
      );
    }
  }

  return migrated;
}

async function createSuperAdminAcl(): Promise<void> {
  console.log('\nCreating Super Admin ACL entries...');

  // Find all users with AppRole.ADMIN
  const superAdmins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, username: true },
  });

  for (const admin of superAdmins) {
    // Grant full control on admin resource type (for /admin pages)
    const existing = await prisma.aclEntry.findFirst({
      where: {
        resourceType: 'admin',
        resourceId: null,
        principalType: 'user',
        principalId: admin.id,
        deny: false,
      },
    });

    if (!existing) {
      await prisma.aclEntry.create({
        data: {
          resourceType: 'admin',
          resourceId: null,
          principalType: 'user',
          principalId: admin.id,
          permissions: ACL_PRESETS.FULL_CONTROL,
          deny: false,
          inherited: false,
          inheritToChildren: true,
        },
      });
      console.log(`  ✓ ${admin.username} -> admin:root (Full Control)`);
    } else {
      console.log(`  - ${admin.username} -> admin:root (already exists)`);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ACL Migration: Converting existing permissions to ACL entries');
  console.log('='.repeat(60));
  console.log();

  try {
    const workspaceCount = await migrateWorkspaceUsers();
    const projectCount = await migrateProjectMembers();
    const groupCount = await migrateGroups();
    await createSuperAdminAcl();

    console.log();
    console.log('='.repeat(60));
    console.log('Migration Summary:');
    console.log(`  - Workspace ACLs created: ${workspaceCount}`);
    console.log(`  - Project ACLs created: ${projectCount}`);
    console.log(`  - Group ACLs created: ${groupCount}`);
    console.log('='.repeat(60));
    console.log();
    console.log('Migration complete!');
    console.log();
    console.log('NOTE: The old tables (workspace_users, project_members, group_permissions)');
    console.log('are still intact. You can remove them after verifying the ACL system works.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
