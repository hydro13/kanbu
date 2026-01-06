/*
 * Workspace Permissions
 *
 * Permissions for workspace-level operations:
 * - Workspace CRUD
 * - Member management
 * - Workspace settings
 */

import { definePermissions } from '../registry'

export const workspacePermissions = definePermissions('workspace', {
  view: {
    name: 'View workspace',
    description: 'Access and view workspace content',
    scope: 'WORKSPACE',
    defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  create: {
    name: 'Create workspaces',
    description: 'Create new workspaces',
    scope: 'SYSTEM',
    defaultFor: ['ADMIN', 'OWNER'],
  },
  edit: {
    name: 'Edit workspace',
    description: 'Modify workspace details',
    scope: 'WORKSPACE',
    defaultFor: ['ADMIN', 'OWNER'],
  },
  delete: {
    name: 'Delete workspace',
    description: 'Permanently delete workspace and all data',
    scope: 'WORKSPACE',
    defaultFor: ['OWNER'],
  },
  members: {
    name: 'Member Management',
    description: 'Manage workspace members',
    scope: 'WORKSPACE',
    children: {
      view: {
        name: 'View members',
        description: 'View workspace member list',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      add: {
        name: 'Add members',
        description: 'Invite or add members to workspace',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      remove: {
        name: 'Remove members',
        description: 'Remove members from workspace',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      changeRole: {
        name: 'Change member roles',
        description: 'Change member roles within workspace',
        defaultFor: ['ADMIN', 'OWNER'],
      },
    },
  },
  settings: {
    name: 'Workspace Settings',
    description: 'Workspace configuration',
    scope: 'WORKSPACE',
    children: {
      view: {
        name: 'View settings',
        description: 'View workspace settings',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      manage: {
        name: 'Manage settings',
        description: 'Modify workspace settings',
        defaultFor: ['ADMIN', 'OWNER'],
      },
    },
  },
  projects: {
    name: 'Project Management',
    description: 'Manage projects within workspace',
    scope: 'WORKSPACE',
    children: {
      create: {
        name: 'Create projects',
        description: 'Create new projects in this workspace',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete any project',
        description: 'Delete any project in this workspace',
        defaultFor: ['ADMIN', 'OWNER'],
      },
    },
  },
})
