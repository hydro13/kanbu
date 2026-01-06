/*
 * System Permissions
 *
 * Permissions for system-level administration:
 * - User management
 * - Group management
 * - System settings
 * - Audit logs
 */

import { definePermissions } from '../registry'

export const systemPermissions = definePermissions('system', {
  admin: {
    name: 'System Administrator',
    description: 'Full system access - bypasses all permission checks',
    scope: 'SYSTEM',
  },
  users: {
    name: 'User Management',
    description: 'Manage user accounts',
    scope: 'SYSTEM',
    children: {
      view: {
        name: 'View users',
        description: 'View user list and details',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create users',
        description: 'Create new user accounts',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit users',
        description: 'Modify user accounts',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete users',
        description: 'Delete user accounts',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      lock: {
        name: 'Lock/unlock users',
        description: 'Lock or unlock user accounts',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      impersonate: {
        name: 'Impersonate users',
        description: 'Log in as another user for support',
        defaultFor: ['ADMIN'],
      },
    },
  },
  groups: {
    name: 'Group Management',
    description: 'Manage security groups',
    scope: 'SYSTEM',
    children: {
      view: {
        name: 'View groups',
        description: 'View security groups',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create groups',
        description: 'Create new security groups',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit groups',
        description: 'Modify security groups',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete groups',
        description: 'Delete security groups',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      assign: {
        name: 'Assign group membership',
        description: 'Add or remove users from groups',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      permissions: {
        name: 'Manage group permissions',
        description: 'Set permissions for groups',
        defaultFor: ['ADMIN', 'OWNER'],
      },
    },
  },
  settings: {
    name: 'System Settings',
    description: 'System configuration',
    scope: 'SYSTEM',
    children: {
      view: {
        name: 'View settings',
        description: 'View system settings',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      manage: {
        name: 'Manage settings',
        description: 'Modify system settings',
        defaultFor: ['ADMIN'],
      },
    },
  },
  audit: {
    name: 'Audit Logs',
    description: 'System audit and logging',
    scope: 'SYSTEM',
    children: {
      view: {
        name: 'View audit logs',
        description: 'View system audit trail',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      export: {
        name: 'Export audit logs',
        description: 'Export audit data',
        defaultFor: ['ADMIN'],
      },
    },
  },
})
