/*
 * Views Permissions
 *
 * Permissions for different project views:
 * - Board view
 * - List view
 * - Calendar view
 * - Timeline view
 * - Analytics view
 */

import { definePermissions } from '../registry';

export const viewsPermissions = definePermissions('views', {
  board: {
    name: 'Board View',
    description: 'Kanban board view access',
    scope: 'PROJECT',
    children: {
      access: {
        name: 'Access board view',
        description: 'View projects in board layout',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  list: {
    name: 'List View',
    description: 'List/table view access',
    scope: 'PROJECT',
    children: {
      access: {
        name: 'Access list view',
        description: 'View projects in list layout',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  calendar: {
    name: 'Calendar View',
    description: 'Calendar view access',
    scope: 'PROJECT',
    children: {
      access: {
        name: 'Access calendar view',
        description: 'View tasks on calendar',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  timeline: {
    name: 'Timeline View',
    description: 'Gantt/timeline view access',
    scope: 'PROJECT',
    children: {
      access: {
        name: 'Access timeline view',
        description: 'View project timeline/Gantt chart',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  analytics: {
    name: 'Analytics View',
    description: 'Analytics dashboard access',
    scope: 'PROJECT',
    children: {
      access: {
        name: 'Access analytics',
        description: 'View project analytics and reports',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
});
