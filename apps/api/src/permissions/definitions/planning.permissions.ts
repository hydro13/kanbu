/*
 * Planning Permissions
 *
 * Permissions for planning features:
 * - Sprints
 * - Milestones
 */

import { definePermissions } from '../registry';

export const planningPermissions = definePermissions('planning', {
  sprints: {
    name: 'Sprint Management',
    description: 'Manage project sprints',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View sprints',
        description: 'View sprint list and details',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create sprints',
        description: 'Create new sprints',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit sprints',
        description: 'Modify sprint details',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete sprints',
        description: 'Delete sprints',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      start: {
        name: 'Start sprints',
        description: 'Start a sprint',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      complete: {
        name: 'Complete sprints',
        description: 'Mark sprint as complete',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      assignTasks: {
        name: 'Assign tasks to sprints',
        description: 'Add or remove tasks from sprints',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  milestones: {
    name: 'Milestone Management',
    description: 'Manage project milestones',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View milestones',
        description: 'View milestone list and details',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create milestones',
        description: 'Create new milestones',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit milestones',
        description: 'Modify milestone details',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete milestones',
        description: 'Delete milestones',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      assignTasks: {
        name: 'Assign tasks to milestones',
        description: 'Add or remove tasks from milestones',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
});
