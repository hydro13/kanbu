/*
 * Admin Components
 *
 * Barrel export for admin-related components.
 *
 * Task: ADMIN-01 (Task 249)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T20:34 CET
 * ═══════════════════════════════════════════════════════════════════
 */

export { AdminLayout } from './AdminLayout'
export { AdminSidebar } from './AdminSidebar'
export { ResourceTree, type SelectedResource, type ResourceType, type TreeState } from './ResourceTree'
export { GroupMembersPanel } from './GroupMembersPanel'
export { MultiPrincipalSelector, type SelectedPrincipal, type MultiPrincipalSelectorProps } from './MultiPrincipalSelector'
export { BulkAclDialog, type BulkAclMode, type AclResourceType, type BulkAclDialogProps } from './BulkAclDialog'

// Fase 9.5: Advanced ACL UI
export { EffectivePermissionsPanel, type EffectivePermissionsPanelProps } from './EffectivePermissionsPanel'
export { WhatIfSimulator, type WhatIfSimulatorProps } from './WhatIfSimulator'
export { AclExportDialog, type AclExportDialogProps } from './AclExportDialog'
export { AclImportDialog, type AclImportDialogProps } from './AclImportDialog'
