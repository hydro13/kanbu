# Kanbu Permission System - AD-Style Design

## Overview

An Active Directory-like permission system with Security Groups, LDAP-compatible structure, and granular permissions.

---

## 1. Database Schema

### 1.1 Security Groups

```prisma
// Security Group - the core of the system
model SecurityGroup {
  id              Int       @id @default(autoincrement())

  // LDAP-compatible fields
  objectGuid      String    @unique @default(uuid())  // Unique identifier
  name            String    @unique                    // sAMAccountName: "project-kanbu-editors"
  displayName     String                               // "Project Kanbu Editors"
  description     String?
  distinguishedName String  @unique                    // "CN=Editors,OU=Kanbu,OU=Projects,DC=kanbu,DC=local"

  // Type and scope
  type            SecurityGroupType                    // SYSTEM, WORKSPACE, PROJECT, CUSTOM
  scope           SecurityGroupScope   @default(DOMAIN_LOCAL)  // DOMAIN_LOCAL, GLOBAL, UNIVERSAL

  // Hierarchy linking (optional)
  workspaceId     Int?
  workspace       Workspace?  @relation(fields: [workspaceId], references: [id])
  projectId       Int?
  project         Project?    @relation(fields: [projectId], references: [id])

  // Nested groups support
  parentGroupId   Int?
  parentGroup     SecurityGroup?   @relation("GroupHierarchy", fields: [parentGroupId], references: [id])
  childGroups     SecurityGroup[]  @relation("GroupHierarchy")

  // Source tracking
  source          GroupSource      @default(LOCAL)     // LOCAL, LDAP, AZURE_AD
  externalId      String?                              // ID in external directory

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  members         SecurityGroupMember[]
  permissions     SecurityGroupPermission[]

  @@index([workspaceId])
  @@index([projectId])
  @@index([type])
}

enum SecurityGroupType {
  SYSTEM            // Domain Admins, etc.
  WORKSPACE         // Workspace-level groups
  WORKSPACE_ADMIN   // Workspace administrators
  PROJECT           // Project-level groups
  PROJECT_ADMIN     // Project administrators
  CUSTOM            // User-defined groups
}

enum SecurityGroupScope {
  DOMAIN_LOCAL      // Only within this domain
  GLOBAL            // Can have members from other domains
  UNIVERSAL         // Can be used anywhere
}

enum GroupSource {
  LOCAL             // Created in Kanbu
  LDAP              // Synchronized from LDAP
  AZURE_AD          // Synchronized from Azure AD
  SCIM              // Via SCIM provisioning
}
```

### 1.2 Group Membership

```prisma
// Link between users and groups
model SecurityGroupMember {
  id              Int       @id @default(autoincrement())

  groupId         Int
  group           SecurityGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  userId          Int
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Membership type
  memberType      MemberType @default(DIRECT)  // DIRECT or via nested group

  // Audit
  addedBy         Int?
  addedAt         DateTime  @default(now())
  expiresAt       DateTime?                    // Temporary membership

  @@unique([groupId, userId])
  @@index([userId])
  @@index([groupId])
}

enum MemberType {
  DIRECT            // Direct member of the group
  NESTED            // Member via a nested group
  DYNAMIC           // Dynamic based on rules
}
```

### 1.3 Permissions

```prisma
// Permission definition
model Permission {
  id              Int       @id @default(autoincrement())

  // Identifier
  name            String    @unique   // "tasks.create", "sprints.manage", etc.
  displayName     String              // "Create Tasks"
  description     String?

  // Categorization
  category        String              // "tasks", "sprints", "milestones", etc.

  // Hierarchy (for inheritance)
  parentId        Int?
  parent          Permission?   @relation("PermissionHierarchy", fields: [parentId], references: [id])
  children        Permission[]  @relation("PermissionHierarchy")

  // Sort order for UI
  sortOrder       Int       @default(0)

  // Relations
  groupPermissions SecurityGroupPermission[]

  @@index([category])
}

// Link between groups and permissions
model SecurityGroupPermission {
  id              Int       @id @default(autoincrement())

  groupId         Int
  group           SecurityGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  permissionId    Int
  permission      Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  // Allow/Deny like Windows
  accessType      AccessType    @default(ALLOW)

  // Scope - where does this permission apply?
  // NULL = everywhere the group has scope
  workspaceId     Int?
  workspace       Workspace?  @relation(fields: [workspaceId], references: [id])
  projectId       Int?
  project         Project?    @relation(fields: [projectId], references: [id])

  // Inheritance
  inherited       Boolean   @default(false)   // From parent group?

  @@unique([groupId, permissionId, workspaceId, projectId])
  @@index([groupId])
  @@index([permissionId])
}

enum AccessType {
  ALLOW
  DENY              // Deny ALWAYS overrides allow (like Windows)
}
```

---

## 2. Permission Categories

### 2.1 System Permissions

| Permission               | Description            |
| ------------------------ | ---------------------- |
| `system.admin`           | Full system access     |
| `system.users.view`      | View users             |
| `system.users.manage`    | Create/modify users    |
| `system.groups.view`     | View security groups   |
| `system.groups.manage`   | Manage security groups |
| `system.settings.view`   | View system settings   |
| `system.settings.manage` | Modify system settings |

### 2.2 Workspace Permissions

| Permission                  | Description               |
| --------------------------- | ------------------------- |
| `workspace.view`            | View workspace            |
| `workspace.settings.manage` | Modify workspace settings |
| `workspace.members.view`    | View members              |
| `workspace.members.manage`  | Add/remove members        |
| `workspace.projects.create` | Create new projects       |
| `workspace.projects.delete` | Delete projects           |

### 2.3 Project Permissions

| Permission                | Description             |
| ------------------------- | ----------------------- |
| `project.view`            | View project            |
| `project.settings.manage` | Modify project settings |
| `project.members.view`    | View project members    |
| `project.members.manage`  | Manage project members  |
| `project.delete`          | Delete project          |

### 2.4 Board/Tasks Permissions

| Permission               | Description              |
| ------------------------ | ------------------------ |
| `tasks.view`             | View tasks               |
| `tasks.create`           | Create tasks             |
| `tasks.edit`             | Edit tasks               |
| `tasks.delete`           | Delete tasks             |
| `tasks.move`             | Move tasks (drag & drop) |
| `tasks.assign`           | Assign tasks to users    |
| `tasks.comment`          | Post comments            |
| `board.columns.manage`   | Manage columns           |
| `board.swimlanes.manage` | Manage swimlanes         |

### 2.5 Planning Permissions

| Permission          | Description                     |
| ------------------- | ------------------------------- |
| `sprints.view`      | View sprints                    |
| `sprints.manage`    | Create/modify/delete sprints    |
| `milestones.view`   | View milestones                 |
| `milestones.manage` | Create/modify/delete milestones |
| `analytics.view`    | View analytics dashboard        |

### 2.6 Integration Permissions

| Permission        | Description                   |
| ----------------- | ----------------------------- |
| `webhooks.view`   | View webhooks                 |
| `webhooks.manage` | Create/modify/delete webhooks |
| `import.execute`  | Import data                   |
| `export.execute`  | Export data                   |
| `api.access`      | API access                    |

---

## 3. Standard Security Groups

### 3.1 System-level Groups (automatic)

| Group             | Permissions                   |
| ----------------- | ----------------------------- |
| **Domain Admins** | `system.admin` (full control) |
| **Domain Users**  | Basic authentication          |

### 3.2 Workspace-level Groups (per workspace)

| Group Template          | Permissions                                |
| ----------------------- | ------------------------------------------ |
| **{Workspace} Admins**  | Everything within workspace                |
| **{Workspace} Members** | `workspace.view`, `workspace.members.view` |

### 3.3 Project-level Groups (per project)

| Group Template         | Permissions                                      |
| ---------------------- | ------------------------------------------------ |
| **{Project} Admins**   | Full control on project                          |
| **{Project} Managers** | Everything except delete project, members manage |
| **{Project} Editors**  | Tasks CRUD, sprints/milestones view              |
| **{Project} Viewers**  | Read-only                                        |

---

## 4. Permission Inheritance & Resolution

### 4.1 Inheritance Rules

```
1. DENY ALWAYS overrides ALLOW (just like Windows)
2. Explicit permission > inherited permission
3. Specific scope > general scope
4. Nested group permissions are merged
```

### 4.2 Resolution Algorithm

```typescript
function resolvePermission(
  userId: number,
  permission: string,
  scope: { workspaceId?: number; projectId?: number }
): boolean {
  // 1. Get all groups where user is a member (direct or nested)
  const groups = getUserGroups(userId, { includeNested: true });

  // 2. Get all permission entries for this permission + scope
  const entries = getPermissionEntries(groups, permission, scope);

  // 3. Check for DENY (highest priority)
  if (entries.some((e) => e.accessType === 'DENY')) {
    return false;
  }

  // 4. Check for ALLOW
  if (entries.some((e) => e.accessType === 'ALLOW')) {
    return true;
  }

  // 5. No explicit permission = no access
  return false;
}
```

---

## 5. UI Design

### 5.1 Permission Editor (Windows-style)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Security Settings                                                    [X]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Object: Project "Kanbu"                                                │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Group or user names:                                             │   │
│  │ ┌─────────────────────────────────────────────────────────────┐ │   │
│  │ │ 👥 Domain Admins                                            │ │   │
│  │ │ 👥 Kanbu Admins                                             │ │   │
│  │ │ 👥 Kanbu Editors                                     [sel]  │ │   │
│  │ │ 👥 Kanbu Viewers                                            │ │   │
│  │ │ 👤 robin                                                    │ │   │
│  │ └─────────────────────────────────────────────────────────────┘ │   │
│  │                                        [Add...] [Remove]         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Permissions for "Kanbu Editors":                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                          Allow    Deny          │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │ Full Control                              ☐        ☐            │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │ Tasks                                                           │   │
│  │   View                                    ☑        ☐            │   │
│  │   Create                                  ☑        ☐            │   │
│  │   Edit                                    ☑        ☐            │   │
│  │   Delete                                  ☑        ☐            │   │
│  │   Move                                    ☑        ☐            │   │
│  │   Assign                                  ☑        ☐            │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │ Sprints                                                         │   │
│  │   View                                    ☑        ☐            │   │
│  │   Manage                                  ☐        ☐            │   │
│  │ ─────────────────────────────────────────────────────────────── │   │
│  │ Milestones                                                      │   │
│  │   View                                    ☑        ☐            │   │
│  │   Manage                                  ☐        ☐            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Advanced...]                                    [OK] [Cancel] [Apply] │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Object Tree (left column)

```
┌──────────────────────────────────┐
│ 🔍 Search...                     │
├──────────────────────────────────┤
│ 📁 Kanbu Domain                  │
│ ├── 🏢 Workspaces                │
│ │   ├── 📂 Mblock BV             │
│ │   │   └── 📁 Projects          │
│ │   │       ├── 📋 Kanbu         │ ← selected
│ │   │       └── 📋 Boekhouding   │
│ │   ├── 📂 Test Workspace        │
│ │   │   └── 📁 Projects          │
│ │   │       └── 📋 Test Project  │
│ │   └── 📂 Develop               │
│ │       └── 📁 Projects          │
│ │           └── 📋 Kanbu Dev     │
│ └── 👥 Security Groups           │
│     ├── 🔐 Domain Admins         │
│     └── 🔐 Domain Users          │
└──────────────────────────────────┘
```

---

## 6. API Endpoints

### 6.1 Security Groups

```typescript
// List groups
group.list({ search?, type?, scope?, limit?, offset? })

// Get group details
group.get({ groupId })

// Create group
group.create({ name, displayName, type, workspaceId?, projectId? })

// Update group
group.update({ groupId, displayName?, description? })

// Delete group
group.delete({ groupId })

// Add member to group
group.addMember({ groupId, userId })

// Remove member from group
group.removeMember({ groupId, userId })

// Get group members
group.getMembers({ groupId })

// Get user's groups
group.getUserGroups({ userId })
```

### 6.2 Permissions

```typescript
// List all permissions
permission.list({ category? })

// Get effective permissions for user on object
permission.getEffective({ userId, workspaceId?, projectId? })

// Set group permission
permission.setGroupPermission({ groupId, permissionId, accessType, workspaceId?, projectId? })

// Remove group permission
permission.removeGroupPermission({ groupId, permissionId, workspaceId?, projectId? })

// Check if user has permission
permission.check({ userId, permission, workspaceId?, projectId? })
```

---

## 7. Implementation Order

### Phase 1: Database & Core (Week 1)

1. ✅ Migrate database schema
2. Permission seed data
3. PermissionService core logic
4. Migrate existing roles to groups

### Phase 2: API Layer (Week 1-2)

1. tRPC procedures for groups
2. tRPC procedures for permissions
3. Permission middleware/guards

### Phase 3: UI Components (Week 2)

1. Object tree component
2. Permission grid component
3. Group selector/picker
4. User group membership editor

### Phase 4: Integration (Week 2-3)

1. Refactor existing code to new permission checks
2. Show/hide UI elements based on permissions
3. Testing & debugging

### Phase 5: Advanced Features (Later)

1. LDAP sync
2. Audit logging
3. Permission templates
4. Bulk operations

---

## 8. Migration from Existing System

### Current structure:

- `WorkspaceUser` with `role`: OWNER, ADMIN, MEMBER, VIEWER
- `ProjectMember` with `role`: OWNER, MANAGER, MEMBER, VIEWER

### Migration:

1. Create security groups per workspace/project
2. Map old roles to new groups
3. Copy memberships
4. Update permission checks in code
5. Remove old role fields (later, after validation)

---

## Questions for Clarification

1. **Nested groups**: Do you want full nested group support (group in group)?
2. **Permission inheritance**: Should a Project group automatically inherit workspace permissions?
3. **Temporary access**: Do you want memberships to be able to expire?
4. **Audit trail**: How extensive should the logging be?
5. **Custom groups**: Can users create groups themselves or only admins?
