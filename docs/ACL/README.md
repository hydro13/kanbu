# Access Control Lists (ACL) System

> **Vision & Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete vision of the scoped permission model.
> **Implementation Status:** See [ROADMAP.md](./ROADMAP.md) for current status and planning.

## Overview

Kanbu uses a **filesystem-style ACL system** inspired by NTFS/Active Directory permissions. This provides a flexible and powerful authorization model that supports both simple and complex access scenarios.

The system evolves towards a **Scoped Permission Model** with:
- **Resource hierarchy**: System > Workspaces > Projects
- **Security Groups**: AD-compatible groups for role-based access
- **Workspace isolation**: Delegated administration per workspace
- **Scoped data access**: Users only see data within their scope

## Why ACL?

The previous role-based system (WorkspaceUser, ProjectMember) had limitations:
- No support for explicit deny
- No inheritance between resources
- Limited granularity (only predefined roles)
- No group-based permissions at resource level

The new ACL system solves this with:
- **Bitmask permissions** - Flexible combination of rights
- **Deny-first logic** - Explicit denial always overrides permission
- **Inheritance** - Workspace permissions inherit to projects
- **Principal types** - Both users and groups can receive rights

## Permission Model (RWXDP)

```
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION BITS                          │
├─────────┬───────┬─────────────────────────────────────────┤
│ Letter  │ Value │ Meaning                                  │
├─────────┼───────┼─────────────────────────────────────────┤
│ R       │ 1     │ Read - View content                      │
│ W       │ 2     │ Write - Modify content                   │
│ X       │ 4     │ Execute - Create new items               │
│ D       │ 8     │ Delete - Remove items                    │
│ P       │ 16    │ Permissions - Manage ACLs                │
└─────────┴───────┴─────────────────────────────────────────┘
```

### Presets

| Preset       | Value | Bits  | Description                     |
|--------------|-------|-------|---------------------------------|
| None         | 0     | -----  | No rights                       |
| Read Only    | 1     | R----  | Read only                       |
| Contributor  | 7     | RWX--  | Read, write, create             |
| Editor       | 15    | RWXD-  | Everything except ACL management|
| Full Control | 31    | RWXDP  | Full control                    |

### Bitmask Calculation

Permissions are stored as an integer bitmask:

```typescript
// Example: Read + Write = 1 + 2 = 3
const permissions = ACL_PERMISSIONS.READ | ACL_PERMISSIONS.WRITE // 3

// Check if a permission is present
const hasRead = (permissions & ACL_PERMISSIONS.READ) !== 0 // true
const hasDelete = (permissions & ACL_PERMISSIONS.DELETE) !== 0 // false
```

## Database Model

```prisma
model AclEntry {
  id              Int      @id @default(autoincrement())
  resourceType    String   // 'workspace', 'project', 'admin', 'profile'
  resourceId      Int?     // null = root/all resources of type
  principalType   String   // 'user' or 'group'
  principalId     Int      // user.id or group.id
  permissions     Int      // bitmask (0-31)
  deny            Boolean  // true = deny entry, false = allow entry
  inherited       Boolean  // true = inherited from parent
  inheritToChildren Boolean // true = inherits to children
  createdAt       DateTime
  createdById     Int?
  updatedAt       DateTime
}
```

## Deny-First Logic

Like NTFS, the ACL system works with **deny-first**:

1. Collect all DENY entries for the user (direct + via groups)
2. Collect all ALLOW entries for the user (direct + via groups)
3. Calculate: `effectivePermissions = allowedPermissions & ~deniedPermissions`

```
┌────────────────────────────────────────────────────────────┐
│                    PERMISSION FLOW                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│   User Request                                              │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────────┐                                          │
│   │ Check DENY  │──── Denied? ────► ACCESS DENIED          │
│   │  entries    │                                          │
│   └─────────────┘                                          │
│        │                                                    │
│        ▼ Not denied                                         │
│   ┌─────────────┐                                          │
│   │ Check ALLOW │──── Allowed? ───► ACCESS GRANTED         │
│   │  entries    │                                          │
│   └─────────────┘                                          │
│        │                                                    │
│        ▼ Not found                                          │
│   ACCESS DENIED (implicit deny)                             │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Inheritance

Permissions can inherit from parent to child resources:

```
┌─────────────────────────────────────────────────────────────┐
│                    RESOURCE HIERARCHY                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   workspace (null)     ← Root: all workspaces               │
│        │                                                     │
│        ▼                                                     │
│   workspace (id: 1)    ← Specific workspace                 │
│        │                                                     │
│        ▼ inheritToChildren=true                              │
│   project (id: 5)      ← Project inherits workspace perms   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

If a user has READ on `workspace:1` with `inheritToChildren=true`, that user automatically also has READ on all projects within that workspace.

## Role Mapping

ACL permissions are translated to workspace/project roles for compatibility:

| ACL Permissions | Workspace Role | Project Role |
|----------------|----------------|--------------|
| R              | VIEWER         | VIEWER       |
| RW or RWX      | MEMBER         | MEMBER       |
| RWXD           | MEMBER         | MANAGER      |
| RWXDP          | ADMIN          | OWNER        |

## API Endpoints

### tRPC Procedures (`trpc.acl.*`)

| Procedure       | Description                              |
|-----------------|-------------------------------------------|
| `list`          | Retrieve ACL entries for a resource      |
| `grant`         | Grant permissions to user/group          |
| `deny`          | Explicitly deny permissions              |
| `revoke`        | Revoke all permissions                   |
| `update`        | Modify existing ACL entry                |
| `delete`        | Delete ACL entry                         |
| `checkPermission` | Check effective permissions            |
| `getPresets`    | Retrieve available presets               |
| `getPrincipals` | Retrieve users and groups for assignment |
| `getResources`  | Retrieve resources that can have ACLs    |
| `getStats`      | ACL statistics (admin only)              |

## Service Layer

### AclService (`services/aclService.ts`)

```typescript
// Check single permission
await aclService.hasPermission(userId, 'workspace', workspaceId, ACL_PERMISSIONS.READ)

// Check all permissions
const result = await aclService.checkPermission(userId, 'project', projectId)
// result.effectivePermissions = 7 (RWX)
// result.deniedPermissions = 0
// result.sources = [{ type: 'user', ... }, { type: 'group', ... }]

// Grant permission
await aclService.grantPermission({
  resourceType: 'workspace',
  resourceId: 1,
  principalType: 'user',
  principalId: 5,
  permissions: ACL_PRESETS.CONTRIBUTOR,
  inheritToChildren: true,
})

// Deny permission
await aclService.denyPermission({
  resourceType: 'project',
  resourceId: 10,
  principalType: 'group',
  principalId: 3,
  permissions: ACL_PERMISSIONS.DELETE,
})
```

## UI

The ACL Manager is available via **Administration > ACL Manager** (`/admin/acl`).

Features:
- Resource selector (workspaces, projects, admin)
- Overview of all ACL entries with ALLOW/DENY badges
- Grant/Deny dialogs with preset selection
- Custom permission toggles
- Inheritance options
- Statistics overview

## Current Status

### Pure ACL Mode ✓

The system now runs in **pure ACL mode** (Phase 3B completed):
- [x] All workspace/project access via ACL
- [x] Legacy fallback removed
- [x] Members read from ACL
- [x] Procedures write only to ACL

### Implemented ✓

- [x] Database model (AclEntry)
- [x] AclService with all core functions
- [x] tRPC procedures for CRUD
- [x] ACL Manager UI with VSCode-style tree (Phase 4)
- [x] Security Groups section in tree
- [x] Real-time WebSocket updates
- [x] Integration in PermissionService
- [x] Workspace listing/access via ACL
- [x] Project listing/access via ACL
- [x] 15 unit tests

### Completed (Phase 4B-8C)

- [x] **Phase 4B**: [+] button for Security Groups, GroupListPage removed
- [x] **Phase 4C**: Extended Resource Hierarchy (root, system, dashboard)
- [x] **Phase 5**: ScopeService for data filtering
- [x] **Phase 6**: Workspace-scoped admin panel
- [x] **Phase 7**: Conditional menus and AclGate component
- [x] **Phase 8B**: Feature ACL for Projects (11 features)
- [x] **Phase 8C**: System-wide Feature ACL (40 features total)

### Feature ACL Overview

**40 features across 4 scopes:**
- `dashboard` (4): overview, my-tasks, my-subtasks, my-workspaces
- `profile` (16): summary, time-tracking, last-logins, sessions, password-history, metadata, edit-profile, avatar, change-password, two-factor-auth, public-access, notifications, external-accounts, integrations, api-tokens, hourly-rate
- `admin` (9): users, create-user, acl, permission-tree, invites, workspaces, settings-general, settings-security, backup
- `project` (11): board, list, calendar, timeline, sprints, milestones, analytics, members, settings, import-export, webhooks

### Completed (Phase 9.1, 9.4, 9.5, 9.6)

- [x] **Phase 9.1**: Audit Logging - Security audit trail for all critical events
- [x] **Phase 9.4**: Bulk Operations - bulkGrant, bulkRevoke, copyPermissions, applyTemplate
- [x] **Phase 9.5**: Advanced ACL UI - Permission Matrix view, Effective Permissions Calculator, What-If Simulator, Import/Export ACL
- [x] **Phase 9.6**: API Keys & Service Accounts - Scoped API keys (USER/WORKSPACE/PROJECT), service accounts, dual auth (JWT + API key)

### Planned (Phase 9.2, 9.3)

- [ ] **Phase 9.2**: LDAP/AD Sync
- [ ] **Phase 9.3**: Task-level ACL

See [ROADMAP.md](./ROADMAP.md) for the complete planning.

## To Be Removed in Phase 4B

> ⚠️ **Radical Simplification:** The following systems will be COMPLETELY removed.

### Tables (Database)

| Table | Reason for removal |
|-------|------------------------|
| `GroupPermission` | Named permissions not needed, ACL bitmask is better |
| `Permission` | Only used by GroupPermission |
| `RoleAssignment` | Not needed, ACL presets are sufficient |
| `WorkspaceUser` | ❌ ALREADY REMOVED - replaced by AclEntry |
| `ProjectMember` | ❌ ALREADY REMOVED - replaced by AclEntry |

### Frontend Pages

| Page | Reason for removal |
|------|------------------------|
| `GroupListPage.tsx` | Not needed, groups visible in AclPage ResourceTree |
| `GroupEditPage.tsx` | Not needed, members via GroupMembersPanel in AclPage |

### Backend Services

| Service | Reason for removal |
|---------|------------------------|
| `groupPermissions.ts` | Named permissions no longer needed |
| `roleAssignmentService.ts` | RoleAssignment no longer needed |
| `roleAssignment.ts` (procedures) | RoleAssignment no longer needed |

### What Remains

**AclPage is the single source of truth for:**
- Creating Security Groups ([+] button)
- Managing group members (GroupMembersPanel)
- Assigning ACL permissions (Grant/Deny dialogs)
- Managing resources (ResourceTree)

## Files

| File | Description |
|---------|--------------|
| `apps/api/src/services/aclService.ts` | Core ACL service |
| `apps/api/src/services/permissions.ts` | PermissionService with ACL integration |
| `apps/api/src/trpc/procedures/acl.ts` | tRPC endpoints |
| `apps/web/src/pages/admin/AclPage.tsx` | ACL Manager UI |
| `apps/web/src/components/admin/ResourceTree.tsx` | VSCode-style resource tree component |
| `packages/shared/prisma/schema.prisma` | AclEntry model |

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete vision and technical specifications
- [ROADMAP.md](./ROADMAP.md) - Implementation roadmap with status
- [MIGRATION.md](./MIGRATION.md) - Migration guide
