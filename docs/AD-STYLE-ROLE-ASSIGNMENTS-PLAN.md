# AD-Style Permission System for Kanbu

## Overview

Implement an Active Directory-like permission system with Security Groups, LDAP-compatible structure, and granular permissions.

## Current Situation

**What already exists:**

- `Group` model with types: SYSTEM, WORKSPACE, WORKSPACE_ADMIN, PROJECT, CUSTOM
- `GroupMember` for memberships
- `GroupPermission` for fine-grained permissions (ALLOW/DENY)
- `Permission` table with 45+ permissions
- Domain Admins group with access to everything
- Auto-groups per workspace/project

**The Problem:**
Groups have `workspaceId`/`projectId` directly on the model → 1:1 binding to objects.
Cannot:

- Create cross-workspace groups ("All Developers")
- Assign one group to multiple workspaces
- True Security Groups like in AD

## Solution: Two-Tier Group System

### Tier 1: Auto-Groups (existing, unchanged)

- WORKSPACE, WORKSPACE_ADMIN, PROJECT types remain 1:1 bound
- Automatically created on workspace/project creation

### Tier 2: Security Groups (new)

- CUSTOM and SYSTEM types without object-binding
- Get access via **Role Assignments**
- Can get permissions on multiple objects

---

## Database Changes

### New Table: `role_assignments`

```sql
CREATE TABLE role_assignments (
  id              SERIAL PRIMARY KEY,
  group_id        INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  workspace_id    INT REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id      INT REFERENCES projects(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER',  -- VIEWER, MEMBER, ADMIN, OWNER
  inherit_to_children BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  created_by      INT REFERENCES users(id),

  UNIQUE(group_id, workspace_id, project_id)
);
```

### Update `groups` Table

```sql
ALTER TABLE groups ADD COLUMN is_security_group BOOLEAN DEFAULT false;
```

---

## Files to Modify

### 1. Database Schema

- `packages/shared/prisma/schema.prisma`
  - Add: RoleAssignment model
  - Add: isSecurityGroup field to Group
  - Add: AssignmentRole enum

### 2. Services

- `apps/api/src/services/roleAssignments.ts` (NEW)
  - assignGroupToWorkspace()
  - assignGroupToProject()
  - removeAssignment()
  - getUserWorkspaceRole() - check role assignments
  - getUserProjectRole() - with inheritance

- `apps/api/src/services/groupPermissions.ts` (UPDATE)
  - isWorkspaceAdmin() - also check role assignments
  - canAccessWorkspace() - also check role assignments
  - canAccessProject() - with inheritance from workspace

- `apps/api/src/services/permissions.ts` (UPDATE)
  - getWorkspaceRole() - include role assignments
  - getProjectRole() - inheritance from workspace
  - getUserWorkspaces() - include workspaces via role assignments

### 3. API Procedures

- `apps/api/src/trpc/procedures/roleAssignment.ts` (NEW)
  - assign: Assign group to object with role
  - remove: Remove assignment
  - listForWorkspace: Assignments for workspace
  - listForProject: Assignments for project
  - listForGroup: Where is group assigned
  - getEffectiveAccess: Effective permissions for user

- `apps/api/src/trpc/procedures/group.ts` (UPDATE)
  - createSecurityGroup: Create security group
  - getDirectoryTree: Tree structure for UI

### 4. Frontend

- `apps/web/src/pages/admin/GroupListPage.tsx` (UPDATE)
  - "Create Security Group" button
  - Security Group badge
  - Filter for Security vs Auto groups

- `apps/web/src/pages/admin/GroupEditPage.tsx` (UPDATE)
  - "Assignments" tab for security groups
  - Where is this group assigned + with which role

- `apps/web/src/components/admin/AssignGroupDialog.tsx` (NEW)
  - Group selector
  - Object selector (workspace/project)
  - Role selector
  - Inherit checkbox

- `apps/web/src/pages/admin/DirectoryPage.tsx` (NEW - optional)
  - Tree view of domain structure
  - Visual representation of AD

---

## Inheritance Model

```
Domain (Kanbu root)
  └── Workspace
        └── Project

Rules:
1. Domain Admin → access to EVERYTHING
2. Role on Workspace + inherit=true → same role on all Projects
3. Role on Project → only that project
4. Higher role wins (ADMIN > MEMBER > VIEWER)
```

---

## Implementation Order

### Sprint 1: Database + Core Services

1. Update Prisma schema with RoleAssignment
2. Run migration
3. Create RoleAssignmentService
4. Update GroupPermissionService for role assignments
5. Update PermissionService for inheritance

### Sprint 2: API

1. Create roleAssignment router
2. Extend group router with security group procedures
3. Testing

### Sprint 3: Frontend

1. Update GroupListPage
2. Add GroupEditPage Assignments tab
3. Create AssignGroupDialog
4. (Optional) DirectoryPage with tree view

---

## Backward Compatibility

- Auto-groups (WORKSPACE, WORKSPACE_ADMIN, PROJECT) continue working exactly the same
- Existing code doesn't need to change
- Security Groups are opt-in functionality
- No breaking changes in API

---

---

## Permission Registry Pattern

### The Core Principle

**Every feature/action in Kanbu must register itself as a permission node.**

This means:

1. No code may perform an action without a permission check
2. New features automatically become visible in the AD permission tree
3. Central place for all permissions - no scattered checks throughout the code

### Permission Tree Structure

```
kanbu (root)
├── system
│   ├── users
│   │   ├── view
│   │   ├── create
│   │   ├── edit
│   │   ├── delete
│   │   └── lock
│   ├── groups
│   │   ├── view
│   │   ├── create
│   │   ├── edit
│   │   ├── delete
│   │   └── assign
│   ├── settings
│   │   ├── view
│   │   └── manage
│   └── audit
│       └── view
│
├── workspace
│   ├── view
│   ├── create
│   ├── edit
│   ├── delete
│   ├── members
│   │   ├── view
│   │   ├── add
│   │   ├── remove
│   │   └── changeRole
│   └── settings
│       ├── view
│       └── manage
│
├── project
│   ├── view
│   ├── create
│   ├── edit
│   ├── delete
│   ├── archive
│   ├── members
│   │   ├── view
│   │   ├── add
│   │   ├── remove
│   │   └── changeRole
│   └── settings
│       ├── view
│       └── manage
│
├── board
│   ├── view
│   ├── columns
│   │   ├── view
│   │   ├── create
│   │   ├── edit
│   │   ├── delete
│   │   └── reorder
│   └── swimlanes
│       ├── view
│       ├── create
│       ├── edit
│       ├── delete
│       └── reorder
│
├── task
│   ├── view
│   ├── create
│   ├── edit
│   ├── delete
│   ├── move
│   ├── assign
│   ├── status
│   │   ├── open
│   │   ├── close
│   │   └── done
│   ├── priority
│   │   └── change
│   ├── dueDate
│   │   └── change
│   ├── subtasks
│   │   ├── view
│   │   ├── create
│   │   ├── edit
│   │   └── delete
│   └── comments
│       ├── view
│       ├── create
│       ├── edit
│       └── delete
│
├── views
│   ├── board
│   │   └── access
│   ├── list
│   │   └── access
│   ├── calendar
│   │   └── access
│   ├── timeline
│   │   └── access
│   └── analytics
│       └── access
│
├── planning
│   ├── sprints
│   │   ├── view
│   │   ├── create
│   │   ├── edit
│   │   ├── delete
│   │   ├── start
│   │   └── complete
│   └── milestones
│       ├── view
│       ├── create
│       ├── edit
│       └── delete
│
├── wiki
│   ├── view
│   ├── create
│   ├── edit
│   ├── delete
│   └── publish
│
├── integrations
│   ├── webhooks
│   │   ├── view
│   │   ├── create
│   │   ├── edit
│   │   └── delete
│   ├── email
│   │   ├── send
│   │   └── configure
│   ├── import
│   │   └── execute
│   └── export
│       ├── execute
│       └── print
│
└── api
    ├── access
    ├── tokens
    │   ├── view
    │   ├── create
    │   └── revoke
    └── hooks
        ├── view
        ├── create
        ├── edit
        └── delete
```

### Permission Definition in Code

Each module defines its permissions:

```typescript
// apps/api/src/permissions/definitions/task.permissions.ts

import { definePermissions } from '../registry';

export const taskPermissions = definePermissions('task', {
  view: {
    name: 'View tasks',
    description: 'Can see tasks in the project',
    defaultFor: ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  create: {
    name: 'Create tasks',
    description: 'Can create new tasks',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
  },
  edit: {
    name: 'Edit tasks',
    description: 'Can modify task details',
    defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'],
    // Fine-grained sub-permissions
    children: {
      title: { name: 'Edit title' },
      description: { name: 'Edit description' },
      dueDate: { name: 'Change due date' },
      priority: { name: 'Change priority' },
      assignee: { name: 'Change assignee' },
    },
  },
  delete: {
    name: 'Delete tasks',
    description: 'Can permanently delete tasks',
    defaultFor: ['MANAGER', 'ADMIN', 'OWNER'],
  },
  status: {
    name: 'Change task status',
    children: {
      open: { name: 'Re-open tasks', defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'] },
      close: { name: 'Close tasks', defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'] },
      done: { name: 'Mark as done', defaultFor: ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'] },
    },
  },
});
```

### Automatic Registration

On server startup, all permissions are loaded and synchronized with the database:

```typescript
// apps/api/src/permissions/registry.ts

class PermissionRegistry {
  private permissions: Map<string, PermissionDefinition> = new Map();

  register(module: string, definitions: PermissionDefinitions) {
    for (const [key, def] of Object.entries(definitions)) {
      const path = `${module}.${key}`;
      this.permissions.set(path, { ...def, path });

      // Register children recursively
      if (def.children) {
        this.register(path, def.children);
      }
    }
  }

  async syncToDatabase() {
    // Ensures all registered permissions exist in Permission table
    // Marks removed permissions as deprecated (don't delete - audit trail)
  }

  getTree(): PermissionNode[] {
    // Returns hierarchical tree for UI display
  }
}

export const permissionRegistry = new PermissionRegistry();
```

### Enforcement Pattern

Each API procedure uses a guard:

```typescript
// apps/api/src/trpc/procedures/task.ts

export const taskRouter = router({
  create: protectedProcedure
    .input(createTaskSchema)
    .use(requirePermission('task.create')) // <-- Guard
    .mutation(async ({ ctx, input }) => {
      // Only runs if user has task.create permission
    }),

  updateStatus: protectedProcedure
    .input(updateStatusSchema)
    .use(requirePermission('task.status.close')) // <-- Specific sub-permission
    .mutation(async ({ ctx, input }) => {
      // ...
    }),
});
```

### Frontend Integration

UI components hide/show based on permissions:

```tsx
// CanDo component - shows children only if user has permission
<CanDo permission="task.create">
  <Button onClick={handleCreate}>New Task</Button>
</CanDo>;

// useCanDo hook - for conditional logic
const canDelete = useCanDo('task.delete');
if (canDelete) {
  // show delete option in menu
}

// Bulk check
const permissions = usePermissions(['task.create', 'task.edit', 'task.delete']);
```

### Development Workflow

When a developer builds a new feature:

1. **Define permissions** in `permissions/definitions/{feature}.permissions.ts`
2. **Register** in `permissions/index.ts`
3. **Add guards** to API procedures
4. **Add UI checks** with `<CanDo>` or `useCanDo()`
5. **Run sync** - permissions appear in AD tree automatically

### Database Changes for Registry

```prisma
model Permission {
  id            Int       @id @default(autoincrement())

  // Hierarchical path: "task.status.close"
  path          String    @unique

  // Display info
  name          String              // "Close tasks"
  description   String?

  // Tree structure
  parentPath    String?             // "task.status"

  // Categorization
  module        String              // "task"

  // Lifecycle
  deprecated    Boolean   @default(false)
  deprecatedAt  DateTime?

  // Auto-populated from code
  defaultRoles  String[]  @default([])  // ["MEMBER", "MANAGER", ...]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  groupPermissions GroupPermission[]

  @@index([module])
  @@index([parentPath])
}
```

---

## Adjusted Implementation Order

### Sprint 1: Permission Registry Foundation

1. PermissionRegistry class
2. Permission definitions for core modules (task, project, workspace)
3. Database sync mechanism
4. requirePermission middleware
5. Migrate existing permission checks

### Sprint 2: Role Assignments (original plan)

1. RoleAssignment model
2. Security Groups
3. Inheritance logic

### Sprint 3: Frontend

1. CanDo component
2. useCanDo / usePermissions hooks
3. Permission tree viewer in admin
4. Group permission editor with tree

### Sprint 4: Remaining Modules

1. Define permissions for all features
2. Add guards to all procedures
3. Add UI checks everywhere

---

## Open Questions

1. **DirectoryPage**: Do you want a tree view UI like AD Users & Computers? Or is the Groups list sufficient?

2. **Inheritance opt-out**: Should an admin be able to choose per assignment whether permissions inherit to projects?

3. **Scope**: Start with only Workspace-level assignments, or immediately also Project-level?

4. **Granularity**: How deep should the permission tree go? For example:
   - `task.edit` = edit everything on a task
   - OR `task.edit.title`, `task.edit.dueDate`, etc. = per field

5. **Default behavior**: If a permission is not explicitly granted - DENY or ALLOW? (Suggest: DENY by default)

---

## LDAP Compatibility

### Why LDAP?

1. **Enterprise integration**: Large organizations use Active Directory / LDAP
2. **Single Sign-On**: Users don't need to be created separately in Kanbu
3. **Central group management**: IT department manages groups in AD, Kanbu respects them
4. **Compliance**: Audit trails and access control from one place

### LDAP-Compatible Schema

Our permission tree follows LDAP naming conventions:

```
Distinguished Names (DN):
- CN=Domain Admins,OU=Groups,DC=kanbu,DC=local
- CN=Mblock BV,OU=Workspaces,DC=kanbu,DC=local
- CN=Kanbu Project,OU=Projects,OU=Mblock BV,OU=Workspaces,DC=kanbu,DC=local

Object Classes:
- organizationalUnit (OU) - Workspaces, Projects containers
- group - Security Groups
- user - Users
- kanbuPermission - Custom class for permissions
```

### Database Fields for LDAP

```prisma
model Group {
  // ... existing fields ...

  // LDAP-compatible fields
  objectGuid        String    @unique @default(uuid())  // AD Object GUID
  distinguishedName String?   @unique                    // Full DN path
  samAccountName    String?   @unique                    // Short name (max 20 chars)

  // Sync tracking
  ldapSource        LdapSource @default(LOCAL)
  ldapLastSync      DateTime?
  ldapExternalId    String?    // objectSid or entryUUID from external LDAP

  @@index([ldapSource])
}

model User {
  // ... existing fields ...

  // LDAP-compatible fields
  objectGuid           String    @unique @default(uuid())
  distinguishedName    String?   @unique
  samAccountName       String?   @unique
  userPrincipalName    String?   @unique  // user@domain.local

  // Sync tracking
  ldapSource           LdapSource @default(LOCAL)
  ldapLastSync         DateTime?
  ldapExternalId       String?
}

enum LdapSource {
  LOCAL           // Created in Kanbu
  ACTIVE_DIRECTORY
  OPENLDAP
  AZURE_AD
  OKTA
}
```

### Permission Paths as LDAP Attributes

```
LDAP Attribute: kanbuPermission
Multi-valued: Yes
Syntax: DirectoryString

Example values on a group:
- task.create
- task.edit
- task.delete
- project.view
- planning.sprints.manage
```

### Sync Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   External AD   │◄───────►│  Kanbu Sync     │
│   / LDAP        │  LDAPS  │  Service        │
└─────────────────┘         └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  Kanbu Database │
                            │  (PostgreSQL)   │
                            └─────────────────┘

Sync modes:
1. Import-only: AD → Kanbu (read-only AD)
2. Export-only: Kanbu → AD (Kanbu is master)
3. Bidirectional: Merge changes both ways
```

### LDAP Query Examples

If Kanbu would expose an LDAP server:

```ldap
# Find all groups a user belongs to
(&(objectClass=group)(member=CN=Robin,OU=Users,DC=kanbu,DC=local))

# Find all users with task.create permission
(&(objectClass=user)(kanbuPermission=task.create))

# Find all workspace admins
(&(objectClass=group)(cn=*Admins)(ou=Workspaces))
```

### Future: LDAP Server Mode

Kanbu can function as an LDAP server itself for other applications:

```typescript
// apps/api/src/ldap/server.ts

import { createLDAPServer } from 'ldapjs';

const server = createLDAPServer();

server.bind('dc=kanbu,dc=local', async (req, res, next) => {
  // Authenticate against Kanbu user database
});

server.search('dc=kanbu,dc=local', async (req, res, next) => {
  // Return users, groups, permissions as LDAP entries
});
```

### Mapping Table

| Kanbu Concept   | LDAP Equivalent           | AD Equivalent           |
| --------------- | ------------------------- | ----------------------- |
| Domain          | DC=kanbu,DC=local         | Forest Root             |
| Workspace       | OU=Workspaces             | Organizational Unit     |
| Project         | OU=Projects               | Organizational Unit     |
| Security Group  | CN=GroupName,OU=Groups    | Security Group          |
| User            | CN=UserName,OU=Users      | User Account            |
| Permission      | kanbuPermission attribute | Custom schema extension |
| Role Assignment | group membership + scope  | Group membership        |

### Implementation Priority

1. **Phase 1 (Now)**: LDAP-compatible schema in database
2. **Phase 2 (Later)**: LDAP import/sync from external AD
3. **Phase 3 (Future)**: Kanbu as LDAP server for other apps
