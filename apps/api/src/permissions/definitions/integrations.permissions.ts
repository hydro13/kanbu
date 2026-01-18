/*
 * Integrations Permissions
 *
 * Permissions for integration features:
 * - Webhooks
 * - Email
 * - Import/Export
 * - API access
 */

import { definePermissions } from '../registry';

export const integrationsPermissions = definePermissions('integrations', {
  webhooks: {
    name: 'Webhook Management',
    description: 'Manage webhooks',
    scope: 'PROJECT',
    children: {
      view: {
        name: 'View webhooks',
        description: 'View webhook configurations',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create webhooks',
        description: 'Create new webhooks',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit webhooks',
        description: 'Modify webhook settings',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete webhooks',
        description: 'Delete webhooks',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      test: {
        name: 'Test webhooks',
        description: 'Send test webhook payloads',
        defaultFor: ['ADMIN', 'OWNER'],
      },
    },
  },
  email: {
    name: 'Email Integration',
    description: 'Email features',
    scope: 'PROJECT',
    children: {
      send: {
        name: 'Send emails',
        description: 'Send emails from the system',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      configure: {
        name: 'Configure email',
        description: 'Configure email settings',
        defaultFor: ['ADMIN', 'OWNER'],
      },
    },
  },
  import: {
    name: 'Data Import',
    description: 'Import data into the system',
    scope: 'PROJECT',
    children: {
      execute: {
        name: 'Import data',
        description: 'Import tasks, projects, or users',
        defaultFor: ['ADMIN', 'OWNER'],
      },
    },
  },
  export: {
    name: 'Data Export',
    description: 'Export data from the system',
    scope: 'PROJECT',
    children: {
      execute: {
        name: 'Export data',
        description: 'Export tasks, projects, or reports',
        defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
      },
      print: {
        name: 'Print',
        description: 'Print views and reports',
        defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
});

export const apiPermissions = definePermissions('api', {
  access: {
    name: 'API Access',
    description: 'Access the API',
    scope: 'SYSTEM',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  tokens: {
    name: 'API Token Management',
    description: 'Manage API tokens',
    scope: 'SYSTEM',
    children: {
      view: {
        name: 'View API tokens',
        description: 'View own API tokens',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create API tokens',
        description: 'Create new API tokens',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
      revoke: {
        name: 'Revoke API tokens',
        description: 'Revoke API tokens',
        defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
      },
    },
  },
  hooks: {
    name: 'Webhook Hooks',
    description: 'Manage system hooks',
    scope: 'SYSTEM',
    children: {
      view: {
        name: 'View hooks',
        description: 'View system hooks',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      create: {
        name: 'Create hooks',
        description: 'Create system hooks',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      edit: {
        name: 'Edit hooks',
        description: 'Modify system hooks',
        defaultFor: ['ADMIN', 'OWNER'],
      },
      delete: {
        name: 'Delete hooks',
        description: 'Delete system hooks',
        defaultFor: ['ADMIN', 'OWNER'],
      },
    },
  },
});
