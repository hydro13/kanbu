/*
 * Services Index
 * Version: 1.1.0
 *
 * Central export for all API services.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Task: 257 - PermissionService
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-03
 *
 * Modified: 2026-01-05
 * Change: Added GroupPermissionService for AD-style groups
 * =============================================================================
 */

// Permission Service - Central authorization for multi-tenant architecture
export {
  PermissionService,
  permissionService,
  type WorkspaceAccess,
  type ProjectAccess,
  type UserWithRole,
} from './permissions'

// Group Permission Service - AD-style group-based authorization
export {
  GroupPermissionService,
  groupPermissionService,
  type GroupMembership,
  type GroupWorkspaceAccess,
  type GroupProjectAccess,
  type PermissionCheck,
  type EffectivePermission,
} from './groupPermissions'

// ACL Service - Filesystem-style Access Control Lists (NTFS/AD compatible)
export {
  AclService,
  aclService,
  ACL_PERMISSIONS,
  ACL_PRESETS,
  type AclResourceType,
  type AclPrincipalType,
  type AclCheckResult,
  type AclEntry,
} from './aclService'

// Scope Service - User scope determination for data access filtering
export {
  ScopeService,
  scopeService,
  type ScopeLevel,
  type UserScope,
} from './scopeService'
