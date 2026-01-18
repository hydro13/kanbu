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
} from './permissions';

// Group Permission Service - AD-style group-based authorization
export {
  GroupPermissionService,
  groupPermissionService,
  type GroupMembership,
  type GroupWorkspaceAccess,
  type GroupProjectAccess,
  type PermissionCheck,
  type EffectivePermission,
} from './groupPermissions';

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
} from './aclService';

// Scope Service - User scope determination for data access filtering
export { ScopeService, scopeService, type ScopeLevel, type UserScope } from './scopeService';

// Audit Service - Security event logging for compliance and troubleshooting
export {
  AuditService,
  auditService,
  AUDIT_CATEGORIES,
  AUDIT_ACTIONS,
  type AuditCategory,
  type AuditAction,
  type AuditLogParams,
  type AuditLogEntry,
} from './auditService';

// API Key Service - Authentication & Scoped Access Control (Fase 9.6)
export { apiKeyService, type ApiKeyContext, type ApiKeyUsageParams } from './apiKeyService';

// GitHub Service - GitHub App Integration (Fase 2)
export {
  githubService,
  isGitHubConfigured,
  getInstallationUrl,
  type GitHubConfig,
  type InstallationInfo,
} from './github';

// Backup Service - Database and source code backups (Phase 1-4)
export {
  BackupService,
  backupService,
  getBackupStorage,
  getBackupStorageType,
  isBackupStorageConfigured,
  type BackupStorage,
  type BackupFile,
  type BackupResult,
  type BackupConfig,
  // Phase 3: Scheduler
  scheduleService,
  internalScheduler,
  retentionService,
  isValidCronExpression,
  calculateNextRun,
  describeCronExpression,
  getSchedulerMode,
  isInternalSchedulerEnabled,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type ExecutionResult,
  type SchedulerMode,
  type RetentionPolicy,
  type RetentionResult,
  // Phase 3: Notifications
  backupNotificationService,
  type WebhookPayload,
  // Phase 3: Restore
  restoreService,
  type RestoreOptions,
  type RestoreResult,
  type RestoreValidation,
  // Phase 4.4: Verification
  verificationService,
  type VerificationResult,
  type VerificationStats,
  type BatchVerificationResult,
} from './backup';
