# ACL Architecture - Scoped Permission Model

## Overview

This document describes the architecture for the **Scoped Permission Model** of Kanbu.
The system is inspired by Active Directory and provides enterprise-grade access control
with workspace-level isolation and delegated administration.

**Document version:** 2.4.0
**Date:** 2026-01-09
**Status:** Approved for implementation

---

## 1. Core Concepts

### 1.1 Separation of Concerns

The system makes a clear distinction between:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ACL SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   RESOURCES (WHAT)              PRINCIPALS (WHO)                     │
│   ─────────────────           ──────────────────                    │
│   The objects you want        The entities that get                 │
│   to protect:                 permissions:                          │
│                                                                      │
│   • System (admin functions)  • Users (individual users)            │
│   • Workspaces                • Security Groups (groups of users)   │
│   • Projects                                                         │
│   • (Future: Tasks, Wiki)                                           │
│                                                                      │
│                    ACL ENTRIES (HOW)                                │
│                    ─────────────────                                │
│                    The link between                                 │
│                    resources and principals                         │
│                    with specific permissions                        │
│                    (RWXDP bitmask)                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Active Directory Compatibility

The model follows AD concepts for enterprise compatibility:

| AD Concept | Kanbu Equivalent | Description |
|------------|------------------|-------------|
| Domain | Kanbu Instance | The root of the system |
| Organizational Unit (OU) | Workspace | Container for projects and users |
| Security Group | Group | Group of users that get permissions together |
| User Account | User | Individual user |
| ACL | AclEntry | Permission link |
| Inheritance | inheritToChildren | Permissions inherit to children |

---

## 2. Resource Hierarchy

### 2.1 Complete Resource Tree (Phase 4C)

```
Kanbu (Root)                    ← resourceType: 'root', ACL here = everything
│
├── System                      ← resourceType: 'system', system management
│   ├── User Management         ← system sub-item (future)
│   ├── Group Management        ← system sub-item (future)
│   ├── LDAP Integration        ← system sub-item (future)
│   └── Settings                ← system sub-item (future)
│
├── Dashboard                   ← resourceType: 'dashboard' (Phase 4C)
│   └── (dashboard features)    ← dashboard sub-items (future)
│
└── Workspaces                  ← resourceType: 'workspace', resourceId: null
    │
    ├── Workspace: "Kanbu-Playground"  ← resourceType: 'workspace', resourceId: {id}
    │   │
    │   └── Projects
    │       ├── Project: "LearnKanbo"  ← resourceType: 'project', resourceId: {id}
    │       │   ├── Tasks              ← (future: task-level ACL)
    │       │   └── Wiki               ← (future)
    │       │
    │       └── Project: "ACL-Test"
    │           └── ...
    │
    └── Workspace: "Production"
        └── ...
```

### 2.2 Resource Types

| Type | resourceType | resourceId | Scope | Status |
|------|--------------|------------|-------|--------|
| **Root (Kanbu)** | `root` | `null` | Everything - top-level container | Phase 4C |
| **System** | `system` | `null` | System management (users, groups, settings) | Existing |
| **Dashboard** | `dashboard` | `null` | Dashboard features | Phase 4C |
| All Workspaces | `workspace` | `null` | All workspaces (container) | Existing |
| Specific Workspace | `workspace` | `{id}` | One workspace + children | Existing |
| All Projects | `project` | `null` | All projects | Existing |
| Specific Project | `project` | `{id}` | One project + children | Existing |

### 2.3 Inheritance Hierarchy

```
root (Kanbu)                    ← ACL here inherits to EVERYTHING
├── system                      ← Inherits from root, passes to system sub-items
├── dashboard                   ← Inherits from root, passes to dashboard items
└── workspace (null = all)      ← Inherits from root
    └── workspace:{id}          ← Inherits from workspace:null
        └── project:{id}        ← Inherits from workspace:{id}
```

**Example:** Domain Admins on `root` with `inheritToChildren=true` → full access everywhere.

---

## 3. Scope Levels

### 3.1 Permission Scopes

The system has three primary scope levels:

```
┌─────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: GLOBAL/SYSTEM SCOPE                                        │
│ ─────────────────────────────                                       │
│ • Super Admins (AppRole.ADMIN or admin ACL)                        │
│ • See EVERYTHING in the system                                     │
│ • Can manage EVERYTHING                                            │
│ • Full user/group management                                       │
│ • System settings access                                           │
├─────────────────────────────────────────────────────────────────────┤
│ LEVEL 2: WORKSPACE SCOPE                                            │
│ ─────────────────────────                                           │
│ • Workspace Admins (P permission on workspace)                     │
│ • See ONLY their workspace(s)                                      │
│ • Manage workspace settings, members, projects                     │
│ • Contact list filtered to workspace members                       │
│ • Admin panel shows only workspace-scoped functions                │
├─────────────────────────────────────────────────────────────────────┤
│ LEVEL 3: PROJECT SCOPE                                              │
│ ─────────────────────────                                           │
│ • Project Managers/Members                                         │
│ • Work within one or more projects                                 │
│ • Permissions determined by project ACL or workspace inheritance   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Scope Cascading

Permissions work from top to bottom:

```
System Admin (P on admin)
    │
    ├── Sees all workspaces
    ├── Sees all users
    ├── Sees all groups
    └── Full admin panel

Workspace Admin (P on workspace:1)
    │
    ├── Sees ONLY workspace:1
    ├── Sees ONLY users in workspace:1
    ├── Manages ONLY projects in workspace:1
    └── Admin panel: only workspace:1 functions

Project Member (RWX on project:5)
    │
    ├── Works in project:5
    └── No admin access
```

---

## 4. Security Groups

### 4.1 Proposed Standard Groups

| Group Name | Description | Typical ACL |
|------------|-------------|-------------|
| `domain-admins` | System administrators | P on `admin:null` |
| `system-admins` | Technical management | RWX on `admin:null` |
| `workspace-admins` | Workspace managers | P on specific workspaces |
| `project-managers` | Project leaders | RWXD on specific projects |
| `users` | All users (automatic member) | RWX on their projects |
| `viewers` | Read-only | R on specific resources |
| `external-contractors` | External parties | Limited R/RW on specific projects |
| `guests` | Guests | Minimal R access |

### 4.2 Group Hierarchy

```
Groups
├── System Groups (global scope)
│   ├── domain-admins
│   └── system-admins
│
├── Workspace Groups (per workspace)
│   ├── ws-{slug}-admins
│   ├── ws-{slug}-members
│   └── ws-{slug}-viewers
│
└── Project Groups (per project)
    ├── proj-{identifier}-managers
    └── proj-{identifier}-members
```

---

## 5. Scoped Data Access

### 5.1 Principle: "See only what you're allowed to see"

**CRITICAL:** All data queries must be filtered based on the user's scope.

```typescript
// WRONG - Shows all users
const users = await prisma.user.findMany()

// RIGHT - Shows only users in scope
const users = await getUsersInScope(currentUserId)
```

### 5.2 Scope Filter Implementation

For each data query, the system must:

1. **Determine user's scope** - System, Workspace, or Project level
2. **Filter resources** - Only resources within scope
3. **Filter principals** - Only users/groups within scope

```typescript
// Example: Contact List
async function getContactList(userId: number) {
  const scope = await getUserScope(userId)

  if (scope.level === 'system') {
    // System admin: all users
    return prisma.user.findMany()
  }

  if (scope.level === 'workspace') {
    // Workspace admin: only workspace members
    return getUsersInWorkspaces(scope.workspaceIds)
  }

  // Project member: only project team members
  return getUsersInProjects(scope.projectIds)
}
```

### 5.3 Scope-Affected Queries

| Query | System Scope | Workspace Scope | Project Scope |
|-------|--------------|-----------------|---------------|
| Users list | All users | Workspace members | Project team |
| Groups list | All groups | Workspace groups | Project groups |
| Workspaces | All | Own workspace(s) | - |
| Projects | All | Workspace projects | Own project(s) |
| Tasks | All | Workspace tasks | Project tasks |
| Admin panel | Full | Workspace admin | - |
| Menu items | All | Filtered | Filtered |

---

## 6. UI Scoping

### 6.1 Conditional Menus

Menu items are shown based on effective permissions:

```typescript
// Sidebar menu items
const menuItems = [
  // Always visible for logged-in users
  { label: 'Dashboard', visible: true },
  { label: 'My Tasks', visible: true },

  // Workspace-level items
  { label: 'Projects', visible: hasWorkspaceAccess },
  { label: 'Members', visible: hasWorkspaceAdmin },

  // System-level items
  { label: 'Administration', visible: hasAdminAccess },
  { label: 'All Users', visible: hasSystemScope },
  { label: 'All Groups', visible: hasSystemScope },
]
```

### 6.2 Admin Panel Scoping

The admin panel shows different sections per scope:

**System Admin sees:**
- All Workspaces
- All Users
- All Groups
- System Settings
- ACL Manager (full)
- Audit Logs (all logs)

**Workspace Admin sees:**
- Workspace Settings (own)
- Workspace Members (own)
- Workspace Projects (own)
- ACL Manager (workspace scope)
- Audit Logs (workspace-scoped)

---

## 7. Implementation Phases

### Phase 1-3B: Foundation & Pure ACL (COMPLETED)
- [x] AclEntry model
- [x] AclService core functions
- [x] tRPC procedures
- [x] Basic UI
- [x] Legacy fallback removed
- [x] Workspace/Project access via ACL
- [x] Members via ACL

### Phase 4: Resource Tree UI (COMPLETED)
- [x] VSCode-style tree component
- [x] Full hierarchy display
- [x] Security Groups section
- [x] Real-time WebSocket updates

### Phase 4B: Radical Simplification (COMPLETED)
- [x] [+] button for Create Security Group in ResourceTree
- [x] Create form in right panel (not popup)
- [x] Delete button for Security Groups
- [x] GroupListPage and GroupEditPage removed
- [x] AclPage is single source of truth

### Phase 4C: Extended Resource Hierarchy (COMPLETED)
- [x] Resource types: root, system, dashboard
- [x] ResourceTree with full AD-style hierarchy
- [x] ACL on Root level (Domain Admins with inherit)
- [x] ACL on System container
- [x] ACL on Dashboard container
- [x] Inheritance from root to all children

### Phase 5: Scoped Data Access (COMPLETED)
- [x] getUserScope() service method
- [x] Scope-filtered queries for all data
- [x] Contact list scoping
- [x] User/Group list scoping

### Phase 6: Scoped Admin Panel (COMPLETED)
- [x] Workspace Admin view
- [x] Filtered admin functions
- [x] Scoped ACL Manager

### Phase 7: Scoped UI Elements (COMPLETED)
- [x] Conditional menus
- [x] Scoped breadcrumbs
- [x] Permission-based component rendering

### Phase 8B: Feature ACL Project (COMPLETED)
- [x] Feature table + ACL resourceType 'feature'
- [x] 11 project features seeded
- [x] ProjectSidebar with ACL per menu item

### Phase 8C: Feature ACL System-wide (COMPLETED)
- [x] 40 features seeded (4 dashboard, 16 profile, 9 admin, 11 project)
- [x] useFeatureAccess hook with convenience hooks
- [x] ResourceTree shows features per scope
- [x] Documentation updated

### Phase 9.1: Audit Logging (COMPLETED)
- [x] AuditLog database model
- [x] AuditService with categories (ACL, GROUP, USER, WORKSPACE, SETTINGS)
- [x] Logging integration in all CRUD procedures
- [x] Query API with scope filtering
- [x] AuditLogsPage UI with filtering, export (CSV/JSON)
- [x] Workspace-scoped access (admins see only own workspace logs)

### Phase 9.6: API Keys & Service Accounts (COMPLETED)
- [x] Database schema extended with ApiKeyScope enum (USER, WORKSPACE, PROJECT)
- [x] ApiKey model with scope fields and service account support
- [x] apiKeyService for authentication and scoped permission checks
- [x] tRPC context with dual auth (JWT + API key)
- [x] apiKeyProcedure and hybridProcedure in router.ts
- [x] UI with scope selector, workspace/project dropdowns, service account option
- [x] Audit logging for API key events (created, updated, revoked, used)

### Phase 9.4: Bulk Operations (COMPLETED)
- [x] `bulkGrantPermission()` - Grant to multiple users/groups
- [x] `bulkRevokePermission()` - Revoke from multiple principals
- [x] `copyAclEntries()` - Copy ACL to other resources
- [x] `applyTemplate()` - Apply permission preset
- [x] MultiPrincipalSelector component for UI
- [x] BulkAclDialog with 4 modes (grant, revoke, copy, template)
- [x] AclPage toolbar integration

### Phase 9.5: Advanced ACL UI (COMPLETED)
- [x] Permission Matrix View - Grid principals × resources with effective permissions
- [x] Effective Permissions Calculator - Debug tool for permission breakdown
- [x] What-If Simulator - Preview ACL changes before implementation
- [x] Import/Export ACL - Backup/restore in JSON/CSV format
- [x] 6 new tRPC procedures (getPermissionMatrix, calculateEffective, simulateChange, exportAcl, importPreview, importExecute)
- [x] 5 new frontend components (PermissionMatrixPage, EffectivePermissionsPanel, WhatIfSimulator, AclExportDialog, AclImportDialog)
- [x] Tools dropdown in AclPage toolbar

### Phase 9.2+: Advanced Features (PLANNED)
- [ ] LDAP/AD Sync
- [ ] Task-level ACL

---

## 8. Technical Specifications

### 8.1 Core Services

| Service | Responsibility |
|---------|----------------|
| `AclService` | ACL CRUD, permission checks |
| `PermissionService` | High-level access checks, role mapping |
| `ScopeService` (new) | Determine user scope, filter queries |

### 8.2 ScopeService API (to be implemented)

```typescript
interface UserScope {
  level: 'system' | 'workspace' | 'project'
  workspaceIds: number[]  // Workspaces where user has access
  projectIds: number[]    // Projects where user has access
  permissions: {
    canManageUsers: boolean
    canManageGroups: boolean
    canManageWorkspaces: boolean
    canAccessAdminPanel: boolean
  }
}

class ScopeService {
  // Determine user's effective scope
  async getUserScope(userId: number): Promise<UserScope>

  // Filtered queries
  async getUsersInScope(userId: number): Promise<User[]>
  async getGroupsInScope(userId: number): Promise<Group[]>
  async getWorkspacesInScope(userId: number): Promise<Workspace[]>
  async getProjectsInScope(userId: number, workspaceId?: number): Promise<Project[]>

  // Scope checks
  async canSeeUser(viewerId: number, targetUserId: number): Promise<boolean>
  async canManageResource(userId: number, resourceType: string, resourceId: number): Promise<boolean>
}
```

### 8.3 Database Queries Pattern

All queries that fetch data must follow this pattern:

```typescript
// 1. Get user scope (cached)
const scope = await scopeService.getUserScope(ctx.user.id)

// 2. Build query filter based on scope
const whereClause = buildScopeFilter(scope, 'workspace')

// 3. Execute query with filter
const data = await prisma.workspace.findMany({
  where: whereClause,
  ...otherOptions
})
```

---

## 9. Migration Strategy

### 9.1 Backward Compatibility

During migration, the system must continue working:

1. **Existing users retain access** via current ACL entries
2. **New scope checks** are added gradually
3. **Feature flags** for new scoped functions
4. **Fallback to unscoped** if scope cannot be determined

### 9.2 Phased Rollout

```
Week 1-2: Implement ScopeService
    └── Unit tests for scope determination

Week 3-4: Contact list scoping
    └── First visible scoped feature

Week 5-6: Admin panel scoping
    └── Workspace admin view

Week 7-8: Menu scoping
    └── Conditional UI elements

Week 9+: Advanced features
    └── Audit, LDAP sync, etc.
```

---

## 10. Success Criteria

### 10.1 Functional Requirements

- [ ] Workspace Admin can ONLY manage own workspace
- [ ] Contact list shows ONLY users in scope
- [ ] Admin panel filtered per scope
- [ ] Menu items hidden if no access
- [ ] No data leakage between workspaces

### 10.2 Non-Functional Requirements

- [ ] Scope check < 50ms per request
- [ ] No breaking changes for existing users
- [x] Audit trail for all scope-related actions (Phase 9.1)
- [ ] AD-compatible group structure

---

## 11. References

- [README.md](./README.md) - ACL system basic documentation
- [ROADMAP.md](./ROADMAP.md) - Implementation roadmap
- [MIGRATION.md](./MIGRATION.md) - Migration guide
- Active Directory Security Model: https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 2.4.0 | 2026-01-09 | Phase 9.5 COMPLETED: Advanced ACL UI (Permission Matrix, Effective Permissions Calculator, What-If Simulator, Import/Export) |
| 2.3.0 | 2026-01-09 | Phase 9.4 COMPLETED: Bulk Operations (bulkGrant, bulkRevoke, copy, template) |
| 2.2.0 | 2026-01-09 | Phase 9.6 COMPLETED: API Keys & Service Accounts with scoped access |
| 2.1.0 | 2026-01-09 | Phase 9.1 COMPLETED: Security Audit Logging with scope-based access |
| 2.0.0 | 2026-01-08 | Phase 4B-8C COMPLETED: System-wide Feature ACL (40 features) |
| 1.2.0 | 2026-01-08 | Phase 4C: Extended Resource Hierarchy (Root, System, Dashboard) |
| 1.1.1 | 2026-01-08 | Phase 4B.1 completed: Security Groups CRUD in AclPage |
| 1.1.0 | 2026-01-08 | Phase 4B: Radical Simplification (AclPage single source of truth) |
| 1.0.0 | 2026-01-08 | Initial architecture document |
