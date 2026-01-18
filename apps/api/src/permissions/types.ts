/*
 * Permission Registry Types
 * Version: 1.0.0
 *
 * Type definitions for the AD-style permission registry system.
 * Every feature in Kanbu registers its permissions here.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * =============================================================================
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Default roles that get this permission automatically.
 * Maps to project/workspace roles for auto-assignment.
 */
export type DefaultRole = 'VIEWER' | 'MEMBER' | 'MANAGER' | 'ADMIN' | 'OWNER';

/**
 * Permission scope - where does this permission apply?
 */
export type PermissionScope = 'SYSTEM' | 'WORKSPACE' | 'PROJECT';

/**
 * Definition of a single permission.
 */
export interface PermissionDefinition {
  /** Human-readable name, e.g., "Create tasks" */
  name: string;

  /** Optional longer description */
  description?: string;

  /** Which roles get this permission by default */
  defaultFor?: DefaultRole[];

  /** Permission scope */
  scope?: PermissionScope;

  /** Child permissions for hierarchical structure */
  children?: Record<string, PermissionDefinition>;
}

/**
 * A group of permissions for a module.
 */
export type PermissionDefinitions = Record<string, PermissionDefinition>;

/**
 * A registered permission with its full path.
 */
export interface RegisteredPermission {
  /** Full path, e.g., "task.status.close" */
  path: string;

  /** Human-readable name */
  name: string;

  /** Optional description */
  description?: string;

  /** Parent path, e.g., "task.status" */
  parentPath: string | null;

  /** Module name, e.g., "task" */
  module: string;

  /** Default roles */
  defaultFor: DefaultRole[];

  /** Permission scope */
  scope: PermissionScope;

  /** Sort order for UI */
  sortOrder: number;
}

/**
 * Permission tree node for UI display.
 */
export interface PermissionNode {
  path: string;
  name: string;
  description?: string;
  scope: PermissionScope;
  defaultFor: DefaultRole[];
  children: PermissionNode[];
}

// =============================================================================
// Database Sync Types
// =============================================================================

/**
 * Result of syncing permissions to the database.
 */
export interface SyncResult {
  created: string[];
  updated: string[];
  deprecated: string[];
}

// =============================================================================
// Permission Check Types
// =============================================================================

/**
 * Context for checking permissions.
 */
export interface PermissionContext {
  userId: number;
  workspaceId?: number;
  projectId?: number;
}

/**
 * Result of a permission check.
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason: 'ALLOW' | 'DENY' | 'DEFAULT' | 'NOT_GRANTED';
  grantedBy?: string;
}
