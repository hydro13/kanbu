/*
 * Task Permissions
 *
 * Permissions for task operations:
 * - Task CRUD
 * - Status changes
 * - Assignments
 * - Subtasks
 * - Comments
 */

import { definePermissions } from '../registry'

export const taskPermissions = definePermissions('task', {
  view: {
    name: 'View tasks',
    description: 'View tasks in the project',
    scope: 'PROJECT',
    defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  create: {
    name: 'Create tasks',
    description: 'Create new tasks',
    scope: 'PROJECT',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  edit: {
    name: 'Edit tasks',
    description: 'Modify task details',
    scope: 'PROJECT',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
    children: {
      title: {
        name: 'Edit title',
        description: 'Change task title',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      description: {
        name: 'Edit description',
        description: 'Change task description',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      dueDate: {
        name: 'Change due date',
        description: 'Set or change task due date',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      priority: {
        name: 'Change priority',
        description: 'Change task priority',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      color: {
        name: 'Change color',
        description: 'Change task color/category',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      estimate: {
        name: 'Set estimate',
        description: 'Set time estimate',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  delete: {
    name: 'Delete tasks',
    description: 'Permanently delete tasks',
    scope: 'PROJECT',
    defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
  },
  move: {
    name: 'Move tasks',
    description: 'Move tasks between columns/swimlanes',
    scope: 'PROJECT',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  assign: {
    name: 'Assign tasks',
    description: 'Assign or unassign users to tasks',
    scope: 'PROJECT',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  status: {
    name: 'Change status',
    description: 'Change task status',
    scope: 'PROJECT',
    children: {
      open: {
        name: 'Re-open tasks',
        description: 'Re-open closed tasks',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      close: {
        name: 'Close tasks',
        description: 'Close tasks',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      done: {
        name: 'Mark as done',
        description: 'Mark tasks as completed',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  subtasks: {
    name: 'Subtask Management',
    description: 'Manage task subtasks',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View subtasks',
        description: 'View task subtasks',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create subtasks',
        description: 'Add subtasks to tasks',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit subtasks',
        description: 'Modify subtasks',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete subtasks',
        description: 'Remove subtasks',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      complete: {
        name: 'Complete subtasks',
        description: 'Mark subtasks as complete',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  comments: {
    name: 'Comment Management',
    description: 'Manage task comments',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View comments',
        description: 'View task comments',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create comments',
        description: 'Add comments to tasks',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit comments',
        description: 'Edit own comments',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      editAny: {
        name: 'Edit any comment',
        description: 'Edit any user\'s comments',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete comments',
        description: 'Delete own comments',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      deleteAny: {
        name: 'Delete any comment',
        description: 'Delete any user\'s comments',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  attachments: {
    name: 'Attachment Management',
    description: 'Manage task attachments',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View attachments',
        description: 'View and download attachments',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      upload: {
        name: 'Upload attachments',
        description: 'Upload files to tasks',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete attachments',
        description: 'Remove attachments',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  timeTracking: {
    name: 'Time Tracking',
    description: 'Track time on tasks',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View time entries',
        description: 'View time tracking entries',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      log: {
        name: 'Log time',
        description: 'Log time on tasks',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit time entries',
        description: 'Edit own time entries',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      editAny: {
        name: 'Edit any time entry',
        description: 'Edit any user\'s time entries',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
})
