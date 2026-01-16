# ACL Implementation Roadmap

> **See also:** [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete vision and technical specifications.

## Status Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1-3B: Foundation & Pure ACL                  [██████████] ✓  │
│ PHASE 4: Resource Tree UI                          [██████████] ✓  │
│ PHASE 4B: ACL-Only Groups Workflow                 [██████████] ✓  │
│ PHASE 4C: Extended Resource Hierarchy              [██████████] ✓  │
│ PHASE 5: Scoped Data Access                        [██████████] ✓  │
│ PHASE 6: Scoped Admin Panel                        [██████████] ✓  │
│ PHASE 7: Scoped UI Elements                        [██████████] ✓  │
│ PHASE 8: Database Cleanup (legacy tables)          [██████████] ✓  │
│ PHASE 8B: Feature ACL (Project)                    [██████████] ✓  │
│ PHASE 8C: Feature ACL (System-wide) + Docs         [██████████] ✓  │
│ PHASE 9.1: Audit Logging                           [██████████] ✓  │
│ PHASE 9.6: API Keys & Service Accounts             [██████████] ✓  │
│ PHASE 9.4: Bulk Operations                         [██████████] ✓  │
│ PHASE 9.5: Advanced ACL UI                         [██████████] ✓  │
│ PHASE 9.2, 9.3: Advanced Features                  [──────────] ○  │
│                                                                     │
│ ⚠️ SECURITY FIX 2026-01-08: Admin access vulnerability fixed       │
└─────────────────────────────────────────────────────────────────────┘

Legend: ✓ Completed | ◐ In Progress | ○ Planned
```

---

## COMPLETED: Phase 1-3B (Foundation & Pure ACL)

<details>
<summary>Click to view completed phases</summary>

### Phase 1: Foundation (Completed)

#### 1.1 Database & Core Service
- [x] AclEntry model in Prisma schema
- [x] AclService with bitmask permissions
- [x] Deny-first logic implementation
- [x] Inheritance support (workspace → project)
- [x] Unit tests (15 tests passing)

#### 1.2 API Layer
- [x] tRPC procedures for CRUD operations
- [x] Authorization checks (requireAclManagement)
- [x] Principal lookup (users + groups)
- [x] Resource listing

#### 1.3 UI
- [x] ACL Manager page (`/admin/acl`)
- [x] Grant/Deny dialogs
- [x] Permission presets
- [x] Admin sidebar link

#### 1.4 Integration
- [x] PermissionService ACL checks
- [x] `getUserWorkspaces()` with ACL support
- [x] `getWorkspaceRole()` with ACL support

---

### Phase 2: Migration (Completed)

#### 2.1 Preparatory Steps
- [x] Create database backup
- [x] Audit current WorkspaceUser entries
- [x] Audit current ProjectMember entries
- [x] Audit current GroupPermission entries

#### 2.2 Execute Migration
- [x] Verify all users still have access
- [x] Validate ACL entries in database
- [x] All legacy entries have corresponding ACL entries

#### 2.3 Verification
- [x] Test workspace listing for all users
- [x] Test workspace access for all users
- [x] Test project access for all users

---

### Phase 3: Hybrid ACL (Completed)

- [x] ACL check as primary in all PermissionService methods
- [x] Keep legacy fallback (for backward compatibility)
- [x] Workspace procedures write to BOTH systems
- [x] Project procedures write to BOTH systems

---

### Phase 3B: Pure ACL Migration (Completed)

> **IMPORTANT:** `groupPermissionService` is a SEPARATE system from ACL:
> - **ACL (aclService)**: Bitmask permissions (R,W,X,D,P) for workspace/project access
> - **Group Permissions (groupPermissionService)**: LDAP/AD-style named permissions

#### 3B.1 Read getMembers from ACL
- [x] `workspace.getMembers` - read from AclEntry instead of WorkspaceUser
- [x] `project.getMembers` - read from AclEntry instead of ProjectMember
- [x] Map ACL permissions to UI roles (ADMIN/MEMBER/VIEWER)

#### 3B.2 Stop Dual Writing
- [x] All workspace procedures write ONLY to ACL
- [x] All project procedures write ONLY to ACL

#### 3B.3 Remove Legacy Fallback
- [x] Remove legacy fallback from all PermissionService methods
- [x] Remove `groupPermissionService` import from PermissionService
- [x] Remove `groupPermissionService` import from workspace.ts
- [x] Keep `groupPermissionService` in admin.ts, group.ts (SEPARATE SYSTEM)

#### 3B.4 Verification
- [x] Typecheck passing (code compiles)
- [x] UI Verification (manual testing)

</details>

---

## COMPLETED: Phase 4 - Resource Tree UI

> **Goal:** VSCode-style hierarchical resource display with correct structure.

<details>
<summary>Click to view completed phase</summary>

### 4.1 Tree Component
- [x] `ResourceTree.tsx` component created
- [x] VSCode-style expand/collapse behavior
- [x] Clicking folder opens AND selects
- [x] Projects nested under workspaces

### 4.2 Complete Hierarchy
- [x] Show root level: "Kanbu" or tenant name
- [x] "Workspaces" as expandable container
- [x] Each workspace shows "Projects" container
- [x] Breadcrumb path in ACL header

### 4.3 Security Groups Section
- [x] Separate section for Security Groups
- [x] Show existing groups from database
- [x] Groups are PRINCIPALS (who gets rights)
- [x] Clear visual separation from Resources

### 4.4 Real-time Updates
- [x] WebSocket events for ACL changes (grant/deny/delete)
- [x] WebSocket events for Group changes (create/update/delete)
- [x] WebSocket events for Group member changes (add/remove)
- [x] Session storage for tree state persistence

### 4.5 Verification
- [x] Resource tree shows complete hierarchy
- [x] Security Groups section visible
- [x] Clicking selects correct resource type
- [x] ACL entries load for selected resource

</details>

---

## COMPLETED: Phase 4B - Radical Simplification

> **Goal:** One admin panel for everything: AclPage becomes the single source of truth.
> Remove ALL legacy permission systems and separate Groups pages.
> **Status:** ✅ Completed - Frontend work complete. DB cleanup moved to Phase 8.

<details>
<summary>Click to view completed phase</summary>

### Background: Why Radical Simplification?

**Current situation (unnecessarily complex):**
```
/admin/groups      → GroupListPage (list groups, create button)
/admin/groups/:id  → GroupEditPage (members, permissions, assignments)
/admin/acl         → AclPage (resources, ACL entries, GroupMembersPanel)
```

**Problem:** Duplicate functionality, confusing, legacy code.

**Solution:** Everything in AclPage, discard the rest.

```
/admin/acl         → AclPage (EVERYTHING here)
├── Resource Tree
│   ├── Kanbu (root)
│   ├── Workspaces → Projects
│   └── Security Groups [+]  ← Create groups here
│
└── Right Panel
    ├── Resource selected → ACL entries
    └── Group selected → Manage members
```

---

### 4B.1 Create Security Group in AclPage ✅

> Add [+] button to Security Groups section in ResourceTree.

#### UI Changes
- [x] "+" button next to "Security Groups" header in ResourceTree
- [x] Create Security Group form in right panel (not popup)
- [x] After creation: group appears directly in tree (WebSocket update)
- [x] After creation: group automatically selected
- [x] Delete button for Security Groups with confirmation

#### Backend
- [x] Reuse `trpc.group.createSecurityGroup` procedure
- [x] WebSocket `group:created` event already works
- [x] Fix permission check (Super Admins can now create groups)

---

### 4B.2 Remove Legacy Frontend ✅

> Groups admin pages removed - AclPage is now single source of truth.

#### Removed - Frontend
- [x] `apps/web/src/pages/admin/GroupListPage.tsx` - REMOVED
- [x] `apps/web/src/pages/admin/GroupEditPage.tsx` - REMOVED
- [x] Sidebar link to `/admin/groups` - REMOVED
- [x] Routes `/admin/groups` and `/admin/groups/:groupId` - REMOVED
- [x] Exports from `pages/admin/index.ts` - REMOVED

#### NOT Removed Yet - Backend (dependencies still in use)

> ⚠️ These services/procedures can only be removed after complete ACL migration.

| Component | Reason to keep |
|-----------|----------------|
| `groupPermissions.ts` | Used by permission middleware and lib/project.ts |
| `roleAssignmentService.ts` | Dependency of groupPermissions.ts |
| `roleAssignment.ts` procedures | Used by PermissionTreePage |
| Permission procedures in group.ts | Used by usePermissions hook and UI components |

These will be removed in a later phase when:
1. Permission middleware is fully migrated to ACL
2. usePermissions hook is migrated to ACL
3. PermissionTreePage is removed or migrated
4. Database tables are removed

---

### 4B.3 Database Cleanup

> Remove legacy tables (no data to migrate).

#### To Remove - Schema
- [ ] `GroupPermission` model from schema.prisma
- [ ] `Permission` model from schema.prisma
- [ ] `RoleAssignment` model from schema.prisma
- [ ] Related enums (AccessType if unused)

#### Prisma Migration
- [ ] Create backup (for safety)
- [ ] `npx prisma migrate dev --name remove_legacy_permission_tables`
- [ ] Verify migration successful

---

### 4B.4 Verification

- [ ] AclPage works fully standalone
- [ ] Create Security Groups via [+] button
- [ ] Manage members via GroupMembersPanel
- [ ] ACL Grant/Deny works for groups
- [ ] Real-time updates work
- [ ] No 404s on old routes
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Build successful

---

### 4B.5 What Remains

| Component | Location | Function |
|-----------|---------|---------|
| `AclPage` | `/admin/acl` | Single admin panel |
| `ResourceTree` | Component | Tree navigation |
| `GroupMembersPanel` | Component | Manage members |
| `aclService` | Backend | ACL CRUD |
| `group.createSecurityGroup` | Procedure | Create groups |
| `group.addMember/removeMember` | Procedure | Manage members |
| `group.list/get` | Procedure | Fetch groups |
| WebSocket events | Backend | Real-time updates |

</details>

---

## COMPLETED: Phase 4C - Extended Resource Hierarchy

> **Goal:** Complete AD-style resource hierarchy with Root, System, Dashboard, and Workspaces containers.
> ACL can be set at any level with inheritance to children.
> **Status:** ✅ Completed on 2026-01-08

### Background: Why Extended Hierarchy?

**Current situation (too flat):**
```
Kanbu (Root) ← No ACL possible
├── System ← Limited, only "admin" resource type
└── Workspaces ← ACL works, but no parent containers
    └── Projects
```

**Desired situation (AD-style):**
```
Kanbu (Root) ← Domain Admins here with inherit=true
│
├── System ← Container for system management
│   ├── User Management
│   ├── Group Management
│   ├── LDAP Integration (future)
│   └── Database Management (future)
│
├── Dashboard ← Container for dashboard features
│   ├── Dashboard Widget 1
│   └── Dashboard Widget 2
│
└── Workspaces ← Existing container
    ├── Workspace X
    │   └── Projects...
    └── Workspace Y
        └── Projects...
```

**Benefits:**
- Domain Admins on Root with inherit → full system access
- System Admins separate from Workspace Admins
- Dashboard features separately manageable
- Full AD compatibility

---

### 4C.1 Expand Resource Types

> Add new resource types to the ACL model.

#### Database Schema Updates

```typescript
// Current resourceTypes: 'admin', 'workspace', 'project', 'profile'
// Add new resourceTypes:

resourceType: 'root'      // Kanbu root - everything inherits from this
resourceType: 'system'    // System container (existing, reuse)
resourceType: 'dashboard' // Dashboard container (new)
```

#### Backend Updates
- [x] Update `AclEntry` validation for new resource types
- [x] Update `aclService.ts` with new resource types
- [x] Update `acl.ts` procedures for new types
- [x] Inheritance logic: root → system/dashboard/workspaces

#### Files
- `packages/shared/prisma/schema.prisma` (if enum)
- `apps/api/src/services/aclService.ts`
- `apps/api/src/trpc/procedures/acl.ts`

---

### 4C.2 Expand ResourceTree UI

> Adapt tree component for complete hierarchy.

#### UI Changes
- [x] Root level (Kanbu) clickable for ACL
- [x] System as expandable container with sub-items
- [x] Dashboard as new expandable container
- [x] Keep Workspaces container as is
- [x] Visual indicators for containers vs. items

#### New Tree Structure
```
📁 Kanbu (Root)              ← Clickable, ACL possible
├── 📁 System                ← Container, ACL possible
│   ├── 👤 User Management   ← Sub-item
│   ├── 👥 Group Management  ← Sub-item
│   └── ⚙️ Settings          ← Sub-item
├── 📁 Dashboard             ← Container, ACL possible
│   └── (future items)
├── 📁 Workspaces            ← Container as now
│   └── ...
└── 📁 Security Groups       ← Principals section (no change)
```

#### Files
- `apps/web/src/components/admin/ResourceTree.tsx`
- `apps/web/src/pages/admin/AclPage.tsx`

---

### 4C.3 Inheritance Logic

> ACL inheritance must work from root downward.

#### Inheritance Hierarchy
```
root (Kanbu)
├── system
│   ├── system:users
│   ├── system:groups
│   └── system:settings
├── dashboard
│   └── dashboard:* (future)
└── workspace (null = all)
    └── workspace:{id}
        └── project:{id}
```

#### Backend Logic
- [x] `checkPermission` must check parent chain
- [x] Root permission with inherit → everything below
- [x] System permission → only system sub-items
- [x] Keep existing workspace/project inheritance

#### Example Use Cases
| ACL Entry | Effect |
|-----------|--------|
| Domain Admins on `root` with inherit | Full access everywhere |
| System Admins on `system` with inherit | Only User/Group/Settings management |
| Workspace Admins on `workspace:1` | Only that workspace + projects |

---

### 4C.4 API Endpoint Updates

> Backend must support new resource types.

#### Expand `acl.getResources`
- [x] Return root resource
- [x] Return system container with sub-resources
- [x] Return dashboard container
- [x] Keep existing workspaces/projects

#### `acl.list` Updates
- [x] Filter on root/system/dashboard resource types
- [x] Show inheritance info

---

### 4C.5 Verification

- [x] ACL can be set on Root (Kanbu)
- [x] ACL can be set on System container
- [x] ACL can be set on Dashboard container
- [x] Inheritance works from root downward
- [x] Domain Admins on root → access everywhere
- [x] System Admins on system → only system management
- [x] Existing workspace/project ACL keeps working
- [x] ResourceTree shows complete hierarchy
- [x] No breaking changes for existing ACL entries
- [x] TypeCheck passed

---

### 4C.6 Future Extensions (not in scope)

These items are prepared but will be implemented later:

| Item | Phase | Description |
|------|------|-------------|
| System sub-items | 4C+ | User Management, Group Management, Settings as separate resources |
| Dashboard features | 5+ | Dashboard widgets as securable resources |
| LDAP Management | 9 | LDAP/AD sync configuration |
| Database Management | 9 | Database backup/restore features |

---

## COMPLETED: Phase 5 - Scoped Data Access

> **Goal:** Filter all data queries based on user's scope.
> **Status:** ✅ Completed on 2026-01-08

<details>
<summary>Click to view completed phase</summary>

### 5.1 Implement ScopeService
- [x] Create `services/scopeService.ts`
- [x] Implement `getUserScope(userId)` method
- [x] Determine scope level: system, workspace, or project
- [x] Return list of accessible workspaceIds and projectIds
- [x] Export via services/index.ts

```typescript
// Implemented interface
interface UserScope {
  level: 'system' | 'workspace' | 'project' | 'none'
  workspaceIds: number[]
  projectIds: number[]
  permissions: {
    canManageUsers: boolean
    canManageGroups: boolean
    canManageWorkspaces: boolean
    canAccessAdminPanel: boolean
    canManageAcl: boolean
  }
  isDomainAdmin: boolean
}
```

### 5.2 Scoped Queries - Users
- [x] `getUsersInScope(userId)` - only users in scope
- [x] Admin `listUsers` procedure filtered on scope
- [x] Admin `getUser` procedure with scope check
- [x] Domain Admins: All users
- [x] Workspace Admins: Users in their workspace(s)

### 5.3 Scoped Queries - Groups
- [x] `getGroupsInScope(userId)` - only groups in scope
- [x] Group `list` procedure filtered on scope
- [x] Domain Admins: All groups
- [x] Workspace Admins: Groups in their workspace(s) + system groups they're member of

### 5.4 Scoped Queries - Workspaces & Projects
- [x] `getWorkspacesInScope(userId)` - only accessible workspaces
- [x] `getProjectsInScope(userId, workspaceId?)` - only accessible projects
- [x] Helper methods: `canAccessWorkspace()`, `canAccessProject()`
- [x] Prisma where clause helpers: `getWorkspaceWhereClause()`, `getProjectWhereClause()`

### 5.5 Verification
- [x] TypeCheck passed
- [x] ScopeService correctly exported
- [x] Admin procedures use scopeService
- [x] Group procedures use scopeService

</details>

---

## COMPLETED: Phase 6 - Scoped Admin Panel

> **Goal:** Admin panel shows filtered views per scope level.
> **Status:** ✅ Completed on 2026-01-08

<details>
<summary>Click to view completed phase</summary>

### 6.1 Admin Scope Detection
- [x] `myAdminScope` endpoint expanded with complete scope info
- [x] `useAdminScope` hook created for frontend
- [x] Scope data available in React components

### 6.2 Workspace Admin View
- [x] AdminSidebar filtered based on scope level
- [x] Workspace admins see: All Users, ACL Manager (filtered data)
- [x] Domain Admins see: All Users, Create User, ACL Manager, Permission Tree, Invites
- [x] System Settings only for Domain Admins

### 6.3 ACL Manager Scoping
- [x] `acl.getResources` filters workspaces/projects on scope
- [x] Resource types filtered (root/system/dashboard only for Domain Admins)
- [x] ResourceTree shows only resources in scope
- [x] Workspace admin can only manage own workspace ACLs

### 6.4 Admin Navigation
- [x] Menu items dynamic per scope level
- [x] AdminSidebar header shows "Domain Admin" or "Workspace Admin"
- [x] Workspace count shown for workspace admins

### 6.5 Verification
- [x] TypeCheck passed
- [x] Workspace admin sees filtered admin panel
- [x] Domain admin sees full panel

</details>

---

## COMPLETED: Phase 7 - Scoped UI Elements

> **Goal:** All UI elements respect user's scope.
> **Status:** ✅ Completed on 2026-01-08

<details>
<summary>Click to view completed phase</summary>

### 7.1 Conditional Menus
- [x] Sidebar items based on permissions
- [x] "Administration" hidden if no admin access (BaseLayout uses myAdminScope)
- [x] AdminSidebar filtered on scope level (Phase 6)
- [x] ProjectSidebar "Manage" section filtered via useProjectPermissions

### 7.2 Component-Level Permissions
- [x] `<AclGate>` component for conditional rendering based on ACL
- [x] `<AclGateAll>` - shows only if ALL permissions present
- [x] `<AclGateAny>` - shows if any of the permissions present
- [x] `useAclPermission` hook with convenience flags (canRead, canWrite, canDelete, etc.)
- [x] Convenience hooks: `useWorkspaceAcl()`, `useProjectAcl()`, `useSystemAcl()`, `useRootAcl()`
- [x] `acl.myPermission` API endpoint added

### 7.3 Breadcrumb Scoping
- [x] Breadcrumbs rendered in BaseLayout
- [x] useBreadcrumbs hook determines accessible path
- [x] Links only clickable where user has access

### 7.4 Search & Filter Scoping
- [x] Admin user list filtered via scopeService.getUsersInScope()
- [x] Admin group list filtered via scopeService.getGroupsInScope()
- [x] ACL resource tree filtered on user's scope

### 7.5 Verification
- [x] TypeCheck passed
- [x] No UI elements for inaccessible resources
- [x] Menus dynamic per user scope

### New Files

**API:**
- `acl.myPermission` procedure added to `acl.ts`

**Frontend Hooks:**
- `hooks/useAclPermission.ts` - ACL permission checking hook

**Frontend Components:**
- `components/common/AclGate.tsx` - Conditional rendering component

</details>

---

## COMPLETED: Phase 8 - Database Cleanup

> **Goal:** Remove unused legacy tables.
> **Status:** ✅ Completed on 2026-01-08
>
> **⚠️ CORRECTION (2026-01-08):** After analysis, many items from the original
> Phase 8 planning must NOT be removed - they are actively in use:
>
> **RETAINED (actively in use):**
> - `groupPermissions.ts` - Core AD-style service (1345 lines, 33+ imports)
> - `roleAssignmentService.ts` - Core service for role assignments (540 lines)
> - `Permission` model - Used for permission definitions
> - `RoleAssignment` model - Core of AD-style role system
> - `WorkspaceRole` enum - Used by `WorkspaceInvitation`
> - `ProjectRole` enum - Type annotations
>
> **REMOVED:**
> - `WorkspaceUser` model - Legacy, replaced by ACL
> - `ProjectMember` model - Legacy, replaced by ACL

<details>
<summary>Click to view completed phase</summary>

### 8.1 Remove Legacy Tables (Database Schema)
- [x] Remove WorkspaceUser model from schema.prisma
- [x] Remove ProjectMember model from schema.prisma
- [x] ~~Remove GroupPermission model~~ - RETAINED (possible future use)
- [x] ~~Remove Permission model~~ - RETAINED (actively in use)
- [x] ~~Remove RoleAssignment model~~ - RETAINED (actively in use)
- [x] ~~Remove enums~~ - RETAINED (WorkspaceRole for invites, ProjectRole for types)

### 8.2 Code Cleanup (Minimal)
- [x] Remove relations to WorkspaceUser from Workspace model
- [x] Remove relations to ProjectMember from Project model
- [x] Cleanup comments referring to removed models
- [x] ~~Remove groupPermissions.ts~~ - RETAINED (core service)
- [x] ~~Remove roleAssignmentService.ts~~ - RETAINED (core service)

### 8.3 Database Migration
- [x] Create backup (for safety)
- [x] Schema updated via `prisma db push`
- [x] Test migration on dev database
- [x] Verify migration successful

### 8.4 Code Changes

All code migrated to ACL-based queries:

| File | Change |
|---------|-----------|
| `lib/workspace.ts` | `createDefaultWorkspace` now creates ACL entry instead of WorkspaceUser |
| `lib/project.ts` | Deprecated functions delegate to permissionService |
| `routes/publicApi.ts` | Uses `permissionService.canAccessProject()` instead of projectMember |
| `procedures/project.ts` | Member counts via `aclEntry.groupBy()` |
| `procedures/workspace.ts` | Member counts via `aclEntry.count()` |
| `procedures/user.ts` | Workspaces via `permissionService.getUserWorkspaces()` |
| `procedures/admin.ts` | User/workspace counts via ACL queries |
| `procedures/analytics.ts` | Project members via ACL entry lookup |
| `procedures/export.ts` | Member counts via ACL |
| `socket/auth.ts` | Workspace/project access via ACL queries |

**Removed test files:**
- `services/__tests__/permissions.test.ts` - tested legacy WorkspaceUser model
- `procedures/__tests__/workspace.test.ts` - tested legacy WorkspaceUser model

### 8.5 Verification
- [x] Typecheck passing after schema changes
- [x] Application fully functional
- [x] No runtime errors
- [x] Build successful

</details>

---

## COMPLETED: Phase 8B - Feature ACL Resources (Project Scope)

> **Goal:** Project menu items as ACL resources.
> **Status:** COMPLETED - Extended by Phase 8C to system-wide.

### 8B.1 Database Schema
- [x] Create `Feature` table (id, projectId, slug, name, description, icon, sortOrder)
- [x] Seed project features (board, list, calendar, timeline, sprints, milestones, analytics, members, settings, import-export, webhooks)
- [x] Add ACL resourceType 'feature'

### 8B.2 Extend API
- [x] `acl.ts` - feature resource type support
- [x] `aclService.ts` - feature inheritance from project
- [x] `acl.getResources` - return features

### 8B.3 ResourceTree UI
- [x] Show features under projects in tree
- [x] Collapse/expand for features per project
- [x] Add feature icon

### 8B.4 Sidebar Integration (Project)
- [x] Create `useProjectFeatureAccess` hook
- [x] ProjectSidebar checks ACL per menu item
- [x] Filter sections based on permissions

### 8B.5 Verification
- [x] TypeCheck passed
- [x] Features seeded in database (11 project features)
- [x] Extended by Phase 8C to 24 features total

---

## COMPLETED: Phase 8C - System-wide Feature ACL

> **Goal:** ALL menu items and features in Kanbu managed via ACL.
> Each section (Dashboard, Profile, Admin, Projects) has features managed via ACL.
> Including documentation so future Claude Code sessions use this system correctly.
> **Status:** COMPLETED - 40 features in database (4 dashboard, 16 profile, 9 admin, 11 project)

### 8C.1 Expand Feature Scope

#### Database Schema Update
- [x] Add `scope` field to Feature table: `'dashboard' | 'profile' | 'admin' | 'project'`
- [x] Migration executed (prisma db push)

#### Seed All Features
- [x] Dashboard features (4): overview, my-tasks, my-subtasks, my-workspaces
- [x] Profile features (16): summary, time-tracking, last-logins, sessions, password-history, metadata, edit-profile, avatar, change-password, two-factor-auth, public-access, notifications, external-accounts, integrations, api-tokens, hourly-rate
- [x] Admin features (9): users, create-user, acl, permission-tree, invites, workspaces, settings-general, settings-security, backup
- [x] Project features (11): board, list, calendar, timeline, sprints, milestones, analytics, members, settings, import-export, webhooks

### 8C.2 Expand ResourceTree UI

- [x] Show features under Dashboard section
- [x] Show features under System/Admin section
- [x] Show features under Profile section
- [x] Group features per scope in tree

**Implemented Tree Structure:**
```
Kanbu (Root)
├── System
│   ├── Administration
│   │   └── Features (9 admin features)
│   │       ├── users, create-user, acl
│   │       ├── permission-tree, invites
│   │       ├── workspaces
│   │       └── settings-general, settings-security, backup
│   └── ...
├── Dashboard
│   └── Features (4 dashboard features)
│       ├── overview, my-tasks
│       └── my-subtasks, my-workspaces
├── Profile
│   └── Features (16 profile features)
│       ├── summary, time-tracking, last-logins, sessions
│       ├── password-history, metadata, edit-profile, avatar
│       ├── change-password, two-factor-auth, public-access
│       └── notifications, external-accounts, integrations, api-tokens, hourly-rate
├── Workspaces
│   └── [Workspace]
│       └── Projects
│           └── [Project]
│               └── Features (11 project features)
│                   ├── board, list, calendar, timeline
│                   ├── sprints, milestones, analytics
│                   └── members, settings, import-export, webhooks
└── Security Groups
```

### 8C.3 Sidebar Integrations

- [x] `useFeatureAccess(scope, featureSlug)` - generic hook (`apps/web/src/hooks/useFeatureAccess.ts`)
- [x] Convenience hooks: `useDashboardFeatureAccess()`, `useAdminFeatureAccess()`, `useProfileFeatureAccess()`
- [x] AdminSidebar: hooks available, existing scope checks retained
- [x] DashboardSidebar: hooks available for future use
- [x] ProjectSidebar: uses `useProjectFeatureAccess` hook (Phase 8B)

### 8C.4 Documentation & Governance

> **CRITICAL:** Ensure future sessions use this system correctly.

#### Extend CLAUDE.md
- [x] ACL Feature section added to project CLAUDE.md
- [x] Required steps when adding new feature/page/menu
- [x] Example code snippets

#### Procedure Document
- [x] `docs/procedures/nieuwe-feature-acl.md` created
- [x] Step-by-step instructions
- [x] Checklist for new features

#### Seed File as Source of Truth
- [x] `seed-features.ts` well documented with instructions
- [x] Comments per scope section
- [x] Instructions for adding new features

### 8C.5 Verification

- [x] Hooks available for all sidebars/layouts
- [x] New features without ACL entry are NOT visible (fail-safe design)
- [x] Documentation is clear for future sessions
- [x] TypeCheck passed
- [x] Database contains 40 features (4+16+9+11)

**Resource Hierarchy after 8C:**
```
root
├── system
│   └── admin features (9): users, create-user, acl, permission-tree, invites, workspaces, settings-general, settings-security, backup
├── dashboard
│   └── dashboard features (4): overview, my-tasks, my-subtasks, my-workspaces
├── profile
│   └── profile features (16): summary, time-tracking, last-logins, sessions, password-history, metadata, edit-profile, avatar, change-password, two-factor-auth, public-access, notifications, external-accounts, integrations, api-tokens, hourly-rate
└── workspace:123
    └── project:456
        └── project features (11): board, list, calendar, timeline, sprints, milestones, analytics, members, settings, import-export, webhooks
```

---

## COMPLETED: Phase 9.1 - Audit Logging

> **Goal:** Comprehensive security audit logging for all critical events.
> **Status:** ✅ Completed on 2026-01-09

<details>
<summary>Click to view completed phase</summary>

### 9.1.1 Database Schema
- [x] `AuditLog` model added to Prisma schema
- [x] Relations to User and Workspace
- [x] Indexes for performant queries (category, action, resourceType, userId, workspaceId, createdAt)

### 9.1.2 AuditService
- [x] `auditService.ts` created with category-based helper methods
- [x] Categories: ACL, GROUP, USER, WORKSPACE, SETTINGS
- [x] Helper methods: `logAclEvent()`, `logGroupEvent()`, `logUserEvent()`, `logWorkspaceEvent()`, `logSettingsEvent()`
- [x] Export via `services/index.ts`

### 9.1.3 Integration Points
- [x] ACL procedures: grant, deny, revoke, delete events
- [x] Group procedures: create, update, delete, member add/remove events
- [x] Admin procedures: user CRUD, password reset, 2FA disable, sessions revoke, settings, backups
- [x] Workspace procedures: create, update, delete, member management events

### 9.1.4 Query API
- [x] `auditLog.list` - Paginated list with filtering (category, action, resourceType, userId, workspaceId, dateFrom, dateTo, search)
- [x] `auditLog.get` - Single log entry with scope check
- [x] `auditLog.getStats` - Dashboard statistics (counts by category, recent actions, top actors)
- [x] `auditLog.export` - Export to CSV or JSON (max 10,000 entries)
- [x] `auditLog.getCategories` - Available categories for filtering
- [x] **SECURITY:** Scope-based access - Domain Admins see everything, Workspace Admins see only their workspace logs

### 9.1.5 Admin UI
- [x] `AuditLogsPage.tsx` component created
- [x] Filtering on category, workspace, date, search term
- [x] Pagination with 50 logs per page
- [x] Expandable log details (changes, metadata, IP address)
- [x] Export buttons (CSV/JSON)
- [x] Route `/admin/audit-logs` configured
- [x] Security section added to AdminSidebar

### 9.1.6 Verification
- [x] TypeCheck passed
- [x] All event types log correctly
- [x] Scope filtering works (Domain Admin vs Workspace Admin)
- [x] Export functionality works

### New Files

| File | Description |
|---------|--------------|
| `apps/api/src/services/auditService.ts` | Core audit logging service |
| `apps/api/src/trpc/procedures/auditLog.ts` | tRPC router for audit log queries |
| `apps/web/src/pages/admin/AuditLogsPage.tsx` | Admin UI component |

</details>

---

## COMPLETED: Phase 9.6 - API Keys & Service Accounts

> **Goal:** Scoped API keys and service accounts for integrations.
> **Status:** ✅ Completed on 2026-01-09

<details>
<summary>Click to view completed phase</summary>

### 9.6.1 Database Schema
- [x] `ApiKeyScope` enum added (USER, WORKSPACE, PROJECT)
- [x] `ApiKey` model extended with scope fields (scope, workspaceId, projectId)
- [x] Service account fields (isServiceAccount, serviceAccountName)
- [x] Relations to Workspace and Project models

### 9.6.2 API Key Service
- [x] `apiKeyService.ts` created with authentication and scope checks
- [x] `authenticate()` - API key validation with SHA256 hash
- [x] `hasPermission()` - Combines scope restrictions with ACL checks
- [x] `logUsage()` - Audit logging for API key usage
- [x] Export via `services/index.ts`

### 9.6.3 tRPC Context & Procedures
- [x] `context.ts` extended with dual auth (JWT + API key)
- [x] `AuthSource` type added ('jwt' | 'apiKey')
- [x] `apiKeyProcedure` - API key authentication only
- [x] `hybridProcedure` - Accepts both JWT and API key
- [x] API key procedures extended with scope support

### 9.6.4 Audit Logging
- [x] API category added to auditService
- [x] Actions: `api:key:created`, `api:key:updated`, `api:key:revoked`, `api:key:used`
- [x] `logApiEvent()` helper method

### 9.6.5 Admin UI
- [x] `ApiTokens.tsx` extended with scope selector
- [x] Workspace dropdown (for WORKSPACE/PROJECT scope)
- [x] Project dropdown (for PROJECT scope)
- [x] Service account checkbox with name field
- [x] Scope badges in key listing (User/Workspace/Project)
- [x] Service account indicator badge

### 9.6.6 Verification
- [x] TypeCheck passed
- [x] USER scope keys work (legacy behavior)
- [x] WORKSPACE scope restricted to workspace resources
- [x] PROJECT scope restricted to project resources
- [x] Service accounts work correctly
- [x] Audit logs show API events
- [x] UI shows scope and service account info

### New Files

| File | Description |
|---------|--------------|
| `apps/api/src/services/apiKeyService.ts` | API key auth and scope checks |

### Modified Files

| File | Change |
|---------|-----------|
| `packages/shared/prisma/schema.prisma` | ApiKeyScope enum, scope fields on ApiKey |
| `apps/api/src/services/auditService.ts` | API category and actions |
| `apps/api/src/trpc/context.ts` | Dual auth (JWT + API key) |
| `apps/api/src/trpc/router.ts` | apiKeyProcedure, hybridProcedure |
| `apps/api/src/trpc/procedures/apiKey.ts` | Scope support, ACL validation |
| `apps/web/src/pages/profile/ApiTokens.tsx` | Scope UI, service account |

</details>

---

## COMPLETED: Phase 9.4 - Bulk Operations

> **Goal:** Bulk ACL operations for more efficient permission management.
> **Status:** ✅ Completed on 2026-01-09

<details>
<summary>Click to view completed phase</summary>

### 9.4.1 Backend Service Methods

New methods in `aclService.ts`:

- [x] `bulkGrantPermission()` - Grant to multiple users/groups at once
- [x] `bulkRevokePermission()` - Revoke from multiple principals
- [x] `copyAclEntries()` - Copy ACL from source to target resources
- [x] `applyTemplate()` - Apply permission preset (read_only, contributor, editor, full_control)

All methods use Prisma transactions for atomicity.

### 9.4.2 tRPC Procedures

New procedures in `acl.ts`:

- [x] `bulkGrant` - Bulk grant with permission check (P bit required)
- [x] `bulkRevoke` - Bulk revoke with permission check
- [x] `copyPermissions` - Copy with check on source AND targets
- [x] `applyTemplate` - Apply template with preset mapping

### 9.4.3 Frontend Components

**MultiPrincipalSelector (`apps/web/src/components/admin/MultiPrincipalSelector.tsx`)**
- [x] Tabs for Users / Groups
- [x] Search input for filtering
- [x] Selected items as badges
- [x] "Select All Visible" / "Clear All" buttons
- [x] Max 100 principals per operation

**BulkAclDialog (`apps/web/src/components/admin/BulkAclDialog.tsx`)**
- [x] 4 modes: grant, revoke, copy, template
- [x] Mode Grant: MultiPrincipalSelector + permission preset
- [x] Mode Revoke: MultiPrincipalSelector (pre-filled with current principals)
- [x] Mode Copy: Source (pre-filled) + target resource selector + overwrite toggle
- [x] Mode Template: Template selector + MultiPrincipalSelector

### 9.4.4 AclPage Integration

- [x] "Bulk" dropdown menu in toolbar
- [x] 4 options: Bulk Grant, Bulk Revoke, Copy Permissions, Apply Template
- [x] BulkAclDialog integration with state management
- [x] Success/error feedback via toast

### 9.4.5 Audit Logging

New audit actions in `auditService.ts`:

- [x] `acl:bulk:granted` - Bulk grant with principal count
- [x] `acl:bulk:revoked` - Bulk revoke with principal count
- [x] `acl:copied` - Copy with source and target info
- [x] `acl:template:applied` - Template with preset name

### 9.4.6 Verification

- [x] TypeCheck passed
- [x] Backend methods work with transactions
- [x] Frontend dialogs functional
- [x] Rate limiting: max 100 principals, max 50 targets

### New Files

| File | Description |
|---------|--------------|
| `apps/web/src/components/admin/MultiPrincipalSelector.tsx` | Multi-select component for users/groups |
| `apps/web/src/components/admin/BulkAclDialog.tsx` | Dialog with 4 bulk operation modes |

### Modified Files

| File | Change |
|---------|-----------|
| `apps/api/src/services/aclService.ts` | 4 bulk methods added |
| `apps/api/src/services/auditService.ts` | 4 bulk audit actions |
| `apps/api/src/trpc/procedures/acl.ts` | 4 bulk procedures |
| `apps/web/src/components/admin/index.ts` | Exports for new components |
| `apps/web/src/pages/admin/AclPage.tsx` | Bulk dropdown menu + dialog |

</details>

---

## COMPLETED: Phase 9.5 - Advanced ACL UI

> **Goal:** Advanced UI tools for ACL management and analysis.
> **Status:** ✅ Completed on 2026-01-09

<details>
<summary>Click to view completed phase</summary>

### 9.5.1 Permission Matrix View

A grid-based overview of principals × resources with effective permissions.

#### Backend: `getPermissionMatrix` procedure
- [x] Input: resourceTypes filter, workspaceId, includeInherited, principalTypes, pagination
- [x] Output: principals[], resources[], cells[] with effectivePermissions
- [x] Color coding: direct (green), inherited (blue), denied (red), none (gray)

#### Frontend: `PermissionMatrixPage.tsx`
- [x] Grid view with principals as rows, resources as columns
- [x] Filters: resource type, principal type, workspace, include inherited
- [x] Cell click shows detail popup with permission breakdown
- [x] CSV export of matrix data
- [x] Route: `/admin/permission-matrix`
- [x] AdminSidebar link with TableIcon

### 9.5.2 Effective Permissions Calculator

Debug tool that explains WHY a user has certain permissions.

#### Backend: `calculateEffective` procedure
- [x] Input: userId, resourceType, resourceId
- [x] Output: finalPermissions, breakdown[] (per source with allow/deny bits)
- [x] Sources: direct ACL, group memberships, inheritance chain
- [x] Security: only admins can check other users

#### Frontend: `EffectivePermissionsPanel.tsx`
- [x] User selector dropdown
- [x] Resource type/id selector
- [x] Breakdown table: source → allow bits → deny bits
- [x] Final effective permissions with bitmask visualization (RWXDP)
- [x] Integration via "Tools" dropdown in AclPage

### 9.5.3 What-If Simulator

Preview what would change if you apply an ACL change.

#### Backend: `simulateChange` procedure
- [x] Input: changes[] with add/modify/remove operations
- [x] Output: per change: before state, after state, affectedUsers[]
- [x] Dry-run: no database changes
- [x] Shows cascade effects through inheritance

#### Frontend: `WhatIfSimulator.tsx`
- [x] Principal selector (user or group)
- [x] Resource selector (type + id)
- [x] Operation: Grant / Revoke
- [x] Permission preset selector
- [x] "Simulate" button shows preview
- [x] Diff view: before → after permissions
- [x] Affected users list
- [x] "Apply Changes" button to execute
- [x] Integration via "Tools" dropdown in AclPage

### 9.5.4 Import/Export ACL Configuration

Backup and restore complete ACL configuration.

#### Backend: `exportAcl` procedure
- [x] Input: format (json/csv), filters (resourceTypes, workspaceId)
- [x] Output: ACL entries in chosen format
- [x] JSON: complete objects with metadata
- [x] CSV: flat structure for spreadsheet analysis
- [x] Audit logging: `acl:exported`

#### Backend: `importPreview` procedure
- [x] Input: content (json/csv string), mode (skip/overwrite/merge)
- [x] Output: toCreate, toUpdate, toSkip counts + entries preview
- [x] Entry validation without database changes

#### Backend: `importExecute` procedure
- [x] Input: entries[], mode
- [x] Output: created, updated, skipped counts
- [x] Prisma transaction for atomicity
- [x] Audit logging: `acl:imported`

#### Frontend: `AclExportDialog.tsx`
- [x] Format selector (JSON/CSV)
- [x] Resource type filter
- [x] Workspace filter
- [x] Download button
- [x] Integration via "Tools" dropdown in AclPage

#### Frontend: `AclImportDialog.tsx`
- [x] File upload (JSON/CSV)
- [x] Mode selector: Skip existing / Overwrite / Merge (OR)
- [x] Preview step with counts (to create, to update, to skip)
- [x] Entries preview table
- [x] Execute button with confirmation
- [x] Success/error feedback
- [x] Integration via "Tools" dropdown in AclPage

### 9.5.5 AclPage Toolbar Integration

- [x] "Tools" dropdown menu added to AclPage toolbar
- [x] Menu items: Effective Permissions, What-If Simulator, Export, Import
- [x] State management for dialogs (showEffectivePanel, showWhatIfSimulator, showExportDialog, showImportDialog)

### 9.5.6 Verification

- [x] TypeCheck passed
- [x] Permission Matrix shows correct grid
- [x] Effective calculator breakdown correct
- [x] What-If simulator shows accurate preview
- [x] Export works in both formats
- [x] Import with preview and execute works
- [x] Audit logs for export/import

### New Files

| File | Description |
|---------|--------------|
| `apps/web/src/pages/admin/PermissionMatrixPage.tsx` | Grid view principals × resources |
| `apps/web/src/components/admin/EffectivePermissionsPanel.tsx` | Permission breakdown debug tool |
| `apps/web/src/components/admin/WhatIfSimulator.tsx` | ACL change preview simulator |
| `apps/web/src/components/admin/AclExportDialog.tsx` | Export dialog (JSON/CSV) |
| `apps/web/src/components/admin/AclImportDialog.tsx` | Import dialog with preview |

### Modified Files

| File | Change |
|---------|-----------|
| `apps/api/src/trpc/procedures/acl.ts` | 6 new procedures (getPermissionMatrix, calculateEffective, simulateChange, exportAcl, importPreview, importExecute) |
| `apps/api/src/services/auditService.ts` | ACL_EXPORTED and ACL_IMPORTED actions |
| `apps/web/src/components/admin/AdminSidebar.tsx` | Permission Matrix link + TableIcon |
| `apps/web/src/components/admin/index.ts` | Exports for new components |
| `apps/web/src/pages/admin/index.ts` | Export for PermissionMatrixPage |
| `apps/web/src/pages/admin/AclPage.tsx` | Tools dropdown + dialog integrations |
| `apps/web/src/App.tsx` | Route /admin/permission-matrix |

</details>

---

## PLANNED: Phase 9.2, 9.3 - Advanced Features

> **Goal:** Add enterprise-grade features.
>
> **⚠️ SECURITY NOTE (2026-01-08):** All Phase 9 items must respect the new admin access checks.
> Admin panel access requires one of:
> 1. Explicit ACL on 'admin' resource with READ
> 2. Membership in "Domain Admins" group
> 3. PERMISSIONS (P) bit on a workspace (workspace admin)
> 4. System-level permissions (WRITE or PERMISSIONS on 'system')
>
> See `scopeService.checkPermissionFlags()` and `adminProcedure` in router.ts.

### 9.2 LDAP/AD Sync
- [ ] Sync AD groups to Kanbu groups
- [ ] Automatic ACL updates on group changes
- [ ] OU-based permission inheritance
- [ ] Scheduled sync jobs
- [ ] **⚠️ SECURITY:** AD sync must NOT automatically grant admin panel access
- [ ] **⚠️ SECURITY:** AD Domain Admins must map correctly to "Domain Admins" group OR admin ACL
- [ ] **⚠️ SECURITY:** AD workspace-level groups get P bit, not automatic admin ACL

### 9.3 Task-Level ACL
- [ ] ACL support for individual tasks
- [ ] Private tasks (only assignee + creator)
- [ ] Task visibility inheritance from project

---

## Priorities

### COMPLETED - Phase 4B: Radical Simplification ✅
1. **4B.1** - ✅ [+] button for Create Security Group in ResourceTree
2. **4B.1** - ✅ Create form in right panel (not popup)
3. **4B.1** - ✅ Delete button for Security Groups
4. **4B.2** - ✅ Frontend legacy code removed (GroupListPage, GroupEditPage, routes, sidebar)
5. **4B.3** - ➡️ Moved to Phase 8 (Database cleanup)

> **Note:** Backend services (groupPermissions.ts, roleAssignmentService.ts) are ACTIVELY IN USE as core AD-style permission services. These will NOT be removed.

### COMPLETED - Phase 4C: Extended Resource Hierarchy ✅
6. **4C.1** - ✅ Expand resource types (root, system, dashboard)
7. **4C.2** - ✅ Expand ResourceTree UI
8. **4C.3** - ✅ Implement inheritance logic
9. **4C.4** - ✅ Update API endpoints

### COMPLETED - Phase 5: Scoped Data Access ✅
10. **5.1** - ✅ Implement ScopeService (`services/scopeService.ts`)
11. **5.2** - ✅ Scoped user queries (admin.listUsers, admin.getUser)
12. **5.3** - ✅ Scoped group queries (group.list)
13. **5.4** - ✅ Helper methods (getUsersInScope, getGroupsInScope, etc.)

### COMPLETED - Phase 6: Scoped Admin Panel ✅
14. **6.1** - ✅ Admin scope detection (`myAdminScope`, `useAdminScope`)
15. **6.2** - ✅ Admin sidebar filtering
16. **6.3** - ✅ ACL resource tree filtering
17. **6.4** - ✅ `acl.getResources` scope filtering

### COMPLETED - Phase 7: Scoped UI Elements ✅
18. **7.1** - ✅ Conditional menus (AdminSidebar, ProjectSidebar)
19. **7.2** - ✅ AclGate component (`hooks/useAclPermission.ts`, `components/common/AclGate.tsx`)
20. **7.3** - ✅ `acl.myPermission` API endpoint

### COMPLETED - Phase 8: Database Cleanup ✅
21. **8.1-8.5** - ✅ Legacy models removed (WorkspaceUser, ProjectMember), code migrated to ACL

### COMPLETED - Phase 8B: Feature ACL (Project) ✅
22. **8B.1** - ✅ Feature table + ACL resourceType
23. **8B.2** - ✅ ResourceTree with features under projects
24. **8B.3** - ✅ ProjectSidebar with ACL per menu item
25. **8B.5** - ✅ Verification

### COMPLETED - Phase 8C: Feature ACL (System-wide) + Documentation ✅
26. **8C.1** - ✅ Add scope field + seed 40 features (4 dashboard, 16 profile, 9 admin, 11 project)
27. **8C.2** - ✅ Expand ResourceTree UI (Dashboard, Admin, Profile)
28. **8C.3** - ✅ All sidebars/layouts hooks available
29. **8C.4** - ✅ Documentation (CLAUDE.md, `docs/procedures/nieuwe-feature-acl.md`)
30. **8C.5** - ✅ Verification (TypeCheck passed, 40 features in DB)

### LATER - Phase 9: Advanced Features
31. **9.x** - Advanced features (LDAP, audit, etc.)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|--------|--------|-----------|
| Breaking changes with scope filtering | High | Step by step, feature flags |
| Performance with scope checks | Medium | Caching, optimized queries |
| Data leakage between scopes | Critical | Extensive testing, security review |
| Complexity of scope logic | Medium | Clear ScopeService API |
| Backward compatibility | High | Fallback to unscoped if needed |

---

## Success Criteria

### Phase 4 Complete ✓
- [x] Resource tree shows complete hierarchy
- [x] Security Groups section works
- [x] VSCode-style navigation works
- [x] Real-time WebSocket updates

### Phase 4B Complete ✓
- [x] [+] button works in ResourceTree for new Security Groups
- [x] Create form in right panel (not popup)
- [x] Delete button for Security Groups
- [x] GroupListPage and GroupEditPage removed
- [x] Sidebar link to /admin/groups removed
- [x] Routes /admin/groups removed
- [x] AclPage is single source of truth for group + ACL management

**Moved to Phase 8 (Database Cleanup):**
- [ ] WorkspaceUser model removed
- [ ] ProjectMember model removed
- [ ] ~~groupPermissions.ts removed~~ - RETAINED (actively in use)
- [ ] ~~roleAssignmentService.ts removed~~ - RETAINED (actively in use)

### Phase 4C Complete ✅
- [x] Resource types expanded: root, system, dashboard
- [x] ResourceTree shows complete hierarchy (Root → System/Dashboard/Workspaces)
- [x] ACL can be set on Root level
- [x] ACL can be set on System container
- [x] ACL can be set on Dashboard container
- [x] Inheritance works from root downward
- [x] Domain Admins on root → full access everywhere
- [x] Existing workspace/project ACL keeps working

### Phase 5 Complete ✓
- [x] ScopeService implemented (`services/scopeService.ts`)
- [x] Admin user queries scoped (listUsers, getUser)
- [x] Group queries scoped (list)
- [x] Helper methods implemented (getUsersInScope, getGroupsInScope, etc.)

### Phase 6 Complete ✓
- [x] Workspace admin sees filtered admin panel
- [x] ACL Manager scoped per user
- [x] Admin sidebar filtered on scope level
- [x] `acl.getResources` filters on scope

### Phase 7 Complete ✓
- [x] All menus dynamic per scope (AdminSidebar, ProjectSidebar)
- [x] AclGate component for conditional rendering
- [x] useAclPermission hook with convenience flags
- [x] acl.myPermission API endpoint
- [x] Common components exported (AclGate, CanDo)

### Phase 8 Complete ✓
- [x] Legacy tables removed (WorkspaceUser, ProjectMember)
- [x] Database migration successful
- [x] No regressions
- [x] All code migrated to ACL-based queries
- [x] TypeCheck passing

### Phase 9 Complete When:
- [ ] Audit logging active
- [ ] LDAP/AD sync working (if needed)
- [ ] Task-level ACL implemented

---

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete architecture and vision
- [README.md](./README.md) - ACL basic documentation
- [MIGRATION.md](./MIGRATION.md) - Migration guide

---

## Changelog

| Date | Change |
|-------|-----------|
| 2026-01-09 | **Phase 9.5 COMPLETED**: Advanced ACL UI - Permission Matrix view, Effective Permissions Calculator, What-If Simulator, Import/Export ACL. 6 new tRPC procedures, 5 new frontend components. |
| 2026-01-09 | **Phase 9.4 COMPLETED**: Bulk Operations - bulkGrant, bulkRevoke, copyPermissions, applyTemplate. MultiPrincipalSelector and BulkAclDialog components. |
| 2026-01-09 | **Phase 9.6 COMPLETED**: API Keys & Service Accounts - Scoped API keys (USER/WORKSPACE/PROJECT), service accounts, dual auth (JWT + API key), audit logging |
| 2026-01-08 | **Phase 8 COMPLETED**: Database Cleanup - WorkspaceUser and ProjectMember models removed. All code migrated to ACL-based queries (10+ files). Legacy test files removed. |
| 2026-01-08 | **SECURITY FIX**: Admin panel access vulnerability fixed - `canAccessAdminPanel` now requires explicit admin permissions instead of just workspace READ. Fixed in `scopeService.ts` and `adminProcedure` in `router.ts`. Phase 9 security notes added. |
| 2026-01-08 | **Phase 8C UPDATE**: Features synchronized with sidebars - now 40 features (was 24). Dashboard: 4, Profile: 16, Admin: 9, Project: 11 |
| 2026-01-08 | **Phase 8C COMPLETED**: System-wide Feature ACL (40 features) + Documentation (CLAUDE.md, procedures) |
| 2026-01-08 | **Phase 8B COMPLETED**: Feature ACL for Projects - Feature table, ResourceTree, ProjectSidebar ACL |
| 2026-01-08 | **Phase 7 COMPLETED**: Scoped UI Elements - AclGate component, useAclPermission hook, acl.myPermission endpoint |
| 2026-01-08 | **Phase 6 COMPLETED**: Scoped Admin Panel - useAdminScope hook, AdminSidebar filtering, ACL resource tree scope filtering |
| 2026-01-08 | **Phase 5 COMPLETED**: Scoped Data Access - ScopeService, scoped user/group queries, helper methods |
| 2026-01-08 | **Phase 4C COMPLETED**: Extended Resource Hierarchy - root/system/dashboard types, ResourceTree UI, inheritance logic |
| 2026-01-08 | Phase 4B.2 completed: GroupListPage, GroupEditPage, sidebar link and routes removed |
| 2026-01-08 | Note: Backend services retained (dependencies in middleware/hooks) - remove after ACL migration |
| 2026-01-08 | Phase 4C added: Extended Resource Hierarchy (Root, System, Dashboard containers) |
| 2026-01-08 | Phase 4B.1 completed: [+] button, create form, delete button for Security Groups |
| 2026-01-08 | Phase 4B rewritten: Radical Simplification (everything removed except AclPage) |
| 2026-01-08 | Decision: Remove RoleAssignment system completely |
| 2026-01-08 | Decision: Remove Groups admin pages completely |
| 2026-01-08 | Phase 4B added: ACL-Only Groups Workflow |
| 2026-01-08 | Phase 4 marked as completed |
| 2026-01-08 | Real-time WebSocket updates added to Phase 4 |
| 2026-01-08 | GroupPermission system marked as deprecated |
| 2026-01-08 | Roadmap rewritten with scoped permission phases |
| 2026-01-08 | Phase 1-3B marked as completed |
| 2026-01-08 | Phase 4-9 added for scoped permissions |
