/*
 * Wiki Permissions
 *
 * Permissions for wiki/documentation features:
 * - Wiki pages
 * - Documentation
 */

import { definePermissions } from '../registry';

export const wikiPermissions = definePermissions('wiki', {
  view: {
    name: 'View wiki',
    description: 'View wiki pages',
    scope: 'PROJECT',
    defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  create: {
    name: 'Create wiki pages',
    description: 'Create new wiki pages',
    scope: 'PROJECT',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  edit: {
    name: 'Edit wiki pages',
    description: 'Modify wiki content',
    scope: 'PROJECT',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  delete: {
    name: 'Delete wiki pages',
    description: 'Delete wiki pages',
    scope: 'PROJECT',
    defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
  },
  publish: {
    name: 'Publish wiki pages',
    description: 'Publish or unpublish wiki pages',
    scope: 'PROJECT',
    defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
  },
  history: {
    name: 'Wiki History',
    description: 'View and manage wiki history',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View history',
        description: 'View page revision history',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      restore: {
        name: 'Restore versions',
        description: 'Restore previous page versions',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
});
