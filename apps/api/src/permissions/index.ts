/*
 * Permission Registry - Main Entry Point
 * Version: 1.0.0
 *
 * This file:
 * 1. Imports all permission definitions
 * 2. Registers them with the central registry
 * 3. Exports the registry for use in the application
 *
 * To add new permissions:
 * 1. Create a file in `definitions/{module}.permissions.ts`
 * 2. Import and register it here
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * =============================================================================
 */

import { permissionRegistry, definePermissions } from './registry';

// Import all permission definitions
import { systemPermissions } from './definitions/system.permissions';
import { workspacePermissions } from './definitions/workspace.permissions';
import { projectPermissions } from './definitions/project.permissions';
import { taskPermissions } from './definitions/task.permissions';
import { boardPermissions } from './definitions/board.permissions';
import { viewsPermissions } from './definitions/views.permissions';
import { planningPermissions } from './definitions/planning.permissions';
import { integrationsPermissions, apiPermissions } from './definitions/integrations.permissions';
import { wikiPermissions } from './definitions/wiki.permissions';

// =============================================================================
// Register All Permissions
// =============================================================================

// System-level permissions
permissionRegistry.register('system', systemPermissions);

// Workspace-level permissions
permissionRegistry.register('workspace', workspacePermissions);

// Project-level permissions
permissionRegistry.register('project', projectPermissions);
permissionRegistry.register('task', taskPermissions);
permissionRegistry.register('board', boardPermissions);
permissionRegistry.register('views', viewsPermissions);
permissionRegistry.register('planning', planningPermissions);
permissionRegistry.register('wiki', wikiPermissions);

// Integration permissions
permissionRegistry.register('integrations', integrationsPermissions);
permissionRegistry.register('api', apiPermissions);

// =============================================================================
// Exports
// =============================================================================

export { permissionRegistry, definePermissions };
export * from './types';

// Export utility for checking permissions
export { requirePermission, createPermissionMiddleware } from './middleware';

// Log registration stats in development
if (process.env.NODE_ENV === 'development') {
  const stats = permissionRegistry.getStats();
  console.log(`[PermissionRegistry] Registered ${stats.total} permissions`);
  console.log(`[PermissionRegistry] Modules:`, stats.byModule);
}
