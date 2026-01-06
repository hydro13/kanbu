/*
 * Board Permissions
 *
 * Permissions for board operations:
 * - Board view
 * - Columns management
 * - Swimlanes management
 */

import { definePermissions } from '../registry'

export const boardPermissions = definePermissions('board', {
  view: {
    name: 'View board',
    description: 'View the project board',
    scope: 'PROJECT',
    defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  columns: {
    name: 'Column Management',
    description: 'Manage board columns',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View columns',
        description: 'View board columns',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create columns',
        description: 'Add new columns to board',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit columns',
        description: 'Modify column settings',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete columns',
        description: 'Remove columns from board',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      reorder: {
        name: 'Reorder columns',
        description: 'Change column order',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  swimlanes: {
    name: 'Swimlane Management',
    description: 'Manage board swimlanes',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View swimlanes',
        description: 'View board swimlanes',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create swimlanes',
        description: 'Add new swimlanes to board',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit swimlanes',
        description: 'Modify swimlane settings',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete swimlanes',
        description: 'Remove swimlanes from board',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      reorder: {
        name: 'Reorder swimlanes',
        description: 'Change swimlane order',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
})
