# AD-Style Permission System voor Kanbu

## Overzicht

Implementeer een Active Directory-achtig permission systeem waarbij Security Groups flexibel rechten kunnen krijgen op meerdere objecten (workspaces, projects) met inheritance.

## Huidige Situatie

**Wat er al is:**
- `Group` model met types: SYSTEM, WORKSPACE, WORKSPACE_ADMIN, PROJECT, CUSTOM
- `GroupMember` voor lidmaatschappen
- `GroupPermission` voor fine-grained permissions (ALLOW/DENY)
- `Permission` tabel met 45+ permissions
- Domain Admins groep die overal toegang heeft
- Auto-groups per workspace/project

**Het Probleem:**
Groups hebben `workspaceId`/`projectId` direct op het model → 1:1 binding aan objecten.
Kan niet:
- Cross-workspace groepen maken ("Alle Developers")
- Eén groep aan meerdere workspaces toewijzen
- Echte Security Groups zoals in AD

## Oplossing: Two-Tier Group System

### Tier 1: Auto-Groups (bestaand, ongewijzigd)
- WORKSPACE, WORKSPACE_ADMIN, PROJECT types blijven 1:1 gebonden
- Automatisch aangemaakt bij workspace/project creatie

### Tier 2: Security Groups (nieuw)
- CUSTOM en SYSTEM types zonder object-binding
- Krijgen toegang via **Role Assignments**
- Kunnen op meerdere objecten rechten krijgen

---

## Database Wijzigingen

### Nieuwe Tabel: `role_assignments`

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

### Update `groups` Tabel

```sql
ALTER TABLE groups ADD COLUMN is_security_group BOOLEAN DEFAULT false;
```

---

## Bestanden te Wijzigen

### 1. Database Schema
- `packages/shared/prisma/schema.prisma`
  - Toevoegen: RoleAssignment model
  - Toevoegen: isSecurityGroup veld aan Group
  - Toevoegen: AssignmentRole enum

### 2. Services
- `apps/api/src/services/roleAssignments.ts` (NIEUW)
  - assignGroupToWorkspace()
  - assignGroupToProject()
  - removeAssignment()
  - getUserWorkspaceRole() - check role assignments
  - getUserProjectRole() - met inheritance

- `apps/api/src/services/groupPermissions.ts` (UPDATE)
  - isWorkspaceAdmin() - ook role assignments checken
  - canAccessWorkspace() - ook role assignments checken
  - canAccessProject() - met inheritance van workspace

- `apps/api/src/services/permissions.ts` (UPDATE)
  - getWorkspaceRole() - role assignments meenemen
  - getProjectRole() - inheritance van workspace
  - getUserWorkspaces() - workspaces via role assignments includen

### 3. API Procedures
- `apps/api/src/trpc/procedures/roleAssignment.ts` (NIEUW)
  - assign: Group toewijzen aan object met role
  - remove: Assignment verwijderen
  - listForWorkspace: Assignments voor workspace
  - listForProject: Assignments voor project
  - listForGroup: Waar is group toegewezen
  - getEffectiveAccess: Effectieve rechten voor user

- `apps/api/src/trpc/procedures/group.ts` (UPDATE)
  - createSecurityGroup: Security group aanmaken
  - getDirectoryTree: Boom structuur voor UI

### 4. Frontend
- `apps/web/src/pages/admin/GroupListPage.tsx` (UPDATE)
  - "Create Security Group" button
  - Security Group badge
  - Filter voor Security vs Auto groups

- `apps/web/src/pages/admin/GroupEditPage.tsx` (UPDATE)
  - "Assignments" tab voor security groups
  - Waar is deze groep toegewezen + met welke role

- `apps/web/src/components/admin/AssignGroupDialog.tsx` (NIEUW)
  - Group selector
  - Object selector (workspace/project)
  - Role selector
  - Inherit checkbox

- `apps/web/src/pages/admin/DirectoryPage.tsx` (NIEUW - optioneel)
  - Tree view van domain structuur
  - Visuele weergave van AD

---

## Inheritance Model

```
Domain (Kanbu root)
  └── Workspace
        └── Project

Regels:
1. Domain Admin → toegang tot ALLES
2. Role op Workspace + inherit=true → zelfde role op alle Projects
3. Role op Project → alleen dat project
4. Hogere role wint (ADMIN > MEMBER > VIEWER)
```

---

## Implementatie Volgorde

### Sprint 1: Database + Core Services
1. Prisma schema updaten met RoleAssignment
2. Migratie draaien
3. RoleAssignmentService maken
4. GroupPermissionService updaten voor role assignments
5. PermissionService updaten voor inheritance

### Sprint 2: API
1. roleAssignment router maken
2. group router uitbreiden met security group procedures
3. Testen

### Sprint 3: Frontend
1. GroupListPage updaten
2. GroupEditPage Assignments tab toevoegen
3. AssignGroupDialog maken
4. (Optioneel) DirectoryPage met tree view

---

## Backward Compatibility

- Auto-groups (WORKSPACE, WORKSPACE_ADMIN, PROJECT) blijven exact hetzelfde werken
- Bestaande code hoeft niet te veranderen
- Security Groups zijn opt-in functionaliteit
- Geen breaking changes in API

---

---

## Permission Registry Pattern

### Het Kernprincipe

**Elke feature/actie in Kanbu moet zich registreren als permission node.**

Dit betekent:
1. Geen code mag een actie uitvoeren zonder permission check
2. Nieuwe features worden automatisch zichtbaar in de AD permission tree
3. Centrale plek voor alle rechten - geen losse checks verspreid door de code

### Permission Tree Structuur

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

Elke module definieert zijn permissions:

```typescript
// apps/api/src/permissions/definitions/task.permissions.ts

import { definePermissions } from '../registry'

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
    }
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
    }
  },
})
```

### Automatic Registration

Bij server startup worden alle permissions geladen en gesynchroniseerd met de database:

```typescript
// apps/api/src/permissions/registry.ts

class PermissionRegistry {
  private permissions: Map<string, PermissionDefinition> = new Map()

  register(module: string, definitions: PermissionDefinitions) {
    for (const [key, def] of Object.entries(definitions)) {
      const path = `${module}.${key}`
      this.permissions.set(path, { ...def, path })

      // Register children recursively
      if (def.children) {
        this.register(path, def.children)
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

export const permissionRegistry = new PermissionRegistry()
```

### Enforcement Pattern

Elke API procedure gebruikt een guard:

```typescript
// apps/api/src/trpc/procedures/task.ts

export const taskRouter = router({
  create: protectedProcedure
    .input(createTaskSchema)
    .use(requirePermission('task.create'))  // <-- Guard
    .mutation(async ({ ctx, input }) => {
      // Only runs if user has task.create permission
    }),

  updateStatus: protectedProcedure
    .input(updateStatusSchema)
    .use(requirePermission('task.status.close'))  // <-- Specific sub-permission
    .mutation(async ({ ctx, input }) => {
      // ...
    }),
})
```

### Frontend Integration

UI componenten verbergen/tonen op basis van permissions:

```tsx
// CanDo component - shows children only if user has permission
<CanDo permission="task.create">
  <Button onClick={handleCreate}>New Task</Button>
</CanDo>

// useCanDo hook - for conditional logic
const canDelete = useCanDo('task.delete')
if (canDelete) {
  // show delete option in menu
}

// Bulk check
const permissions = usePermissions(['task.create', 'task.edit', 'task.delete'])
```

### Development Workflow

Wanneer een developer een nieuwe feature bouwt:

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

## Aangepaste Implementatie Volgorde

### Sprint 1: Permission Registry Foundation
1. PermissionRegistry class
2. Permission definitions voor core modules (task, project, workspace)
3. Database sync mechanism
4. requirePermission middleware
5. Migrate existing permission checks

### Sprint 2: Role Assignments (oorspronkelijk plan)
1. RoleAssignment model
2. Security Groups
3. Inheritance logic

### Sprint 3: Frontend
1. CanDo component
2. useCanDo / usePermissions hooks
3. Permission tree viewer in admin
4. Group permission editor met tree

### Sprint 4: Remaining Modules
1. Define permissions voor alle features
2. Add guards to all procedures
3. Add UI checks everywhere

---

## Open Vragen

1. **DirectoryPage**: Wil je een tree view UI zoals AD Users & Computers? Of is de Groups lijst voldoende?

2. **Inheritance opt-out**: Moet een admin per assignment kunnen kiezen of rechten doorerven naar projecten?

3. **Scope**: Beginnen we met alleen Workspace-level assignments, of direct ook Project-level?

4. **Granulariteit**: Hoe diep moet de permission tree gaan? Bijvoorbeeld:
   - `task.edit` = alles aan een task bewerken
   - OF `task.edit.title`, `task.edit.dueDate`, etc. = per veld

5. **Default behavior**: Als een permission niet expliciet is toegekend - DENY of ALLOW? (Suggest: DENY by default)

---

## LDAP Compatibiliteit

### Waarom LDAP?

1. **Enterprise integratie**: Grote organisaties gebruiken Active Directory / LDAP
2. **Single Sign-On**: Users hoeven niet apart in Kanbu te worden aangemaakt
3. **Centrale groepsbeheer**: IT-afdeling beheert groepen in AD, Kanbu respecteert die
4. **Compliance**: Audit trails en toegangsbeheer vanuit één plek

### LDAP-Compatible Schema

Onze permission tree volgt LDAP naming conventions:

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

### Database Velden voor LDAP

```prisma
model Group {
  // ... existing fields ...

  // LDAP-compatible velden
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

  // LDAP-compatible velden
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

### Permission Paths als LDAP Attributes

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

### Sync Architectuur

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

Als Kanbu een LDAP server zou exposen:

```ldap
# Find all groups a user belongs to
(&(objectClass=group)(member=CN=Robin,OU=Users,DC=kanbu,DC=local))

# Find all users with task.create permission
(&(objectClass=user)(kanbuPermission=task.create))

# Find all workspace admins
(&(objectClass=group)(cn=*Admins)(ou=Workspaces))
```

### Future: LDAP Server Mode

Kanbu kan zelf als LDAP server fungeren voor andere applicaties:

```typescript
// apps/api/src/ldap/server.ts

import { createLDAPServer } from 'ldapjs'

const server = createLDAPServer()

server.bind('dc=kanbu,dc=local', async (req, res, next) => {
  // Authenticate against Kanbu user database
})

server.search('dc=kanbu,dc=local', async (req, res, next) => {
  // Return users, groups, permissions as LDAP entries
})
```

### Mapping Tabel

| Kanbu Concept | LDAP Equivalent | AD Equivalent |
|---------------|-----------------|---------------|
| Domain | DC=kanbu,DC=local | Forest Root |
| Workspace | OU=Workspaces | Organizational Unit |
| Project | OU=Projects | Organizational Unit |
| Security Group | CN=GroupName,OU=Groups | Security Group |
| User | CN=UserName,OU=Users | User Account |
| Permission | kanbuPermission attribute | Custom schema extension |
| Role Assignment | group membership + scope | Group membership |

### Implementation Priority

1. **Phase 1 (Now)**: LDAP-compatible schema in database
2. **Phase 2 (Later)**: LDAP import/sync from external AD
3. **Phase 3 (Future)**: Kanbu as LDAP server for other apps
