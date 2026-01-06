/*
 * Project Permissions
 *
 * Permissions for project-level operations:
 * - Project CRUD
 * - Member management
 * - Project settings
 */

import { definePermissions } from '../registry'

export const projectPermissions = definePermissions('project', {
  view: {
    name: 'View project',
    description: 'Access and view project content',
    scope: 'PROJECT',
    defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  create: {
    name: 'Create project',
    description: 'Create new projects',
    scope: 'WORKSPACE',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  edit: {
    name: 'Edit project',
    description: 'Modify project details',
    scope: 'PROJECT',
    defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
  },
  delete: {
    name: 'Delete project',
    description: 'Permanently delete project and all data',
    scope: 'PROJECT',
    defaultFor: ['OWNER'],
  },
  archive: {
    name: 'Archive project',
    description: 'Archive or unarchive project',
    scope: 'PROJECT',
    defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
  },
  members: {
    name: 'Member Management',
    description: 'Manage project members',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View members',
        description: 'View project member list',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      add: {
        name: 'Add members',
        description: 'Add members to project',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      remove: {
        name: 'Remove members',
        description: 'Remove members from project',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      changeRole: {
        name: 'Change member roles',
        description: 'Change member roles within project',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  settings: {
    name: 'Project Settings',
    description: 'Project configuration',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View settings',
        description: 'View project settings',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      manage: {
        name: 'Manage settings',
        description: 'Modify project settings',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
})
