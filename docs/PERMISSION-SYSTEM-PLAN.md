# Kanbu Permission System - AD-Style Design

## Overzicht

Een Active Directory-achtig permission systeem met Security Groups, LDAP-compatibele structuur, en granulaire rechten.

---

## 1. Database Schema

### 1.1 Security Groups

```prisma
// Security Group - de kern van het systeem
model SecurityGroup {
  id              Int       @id @default(autoincrement())

  // LDAP-compatible velden
  objectGuid      String    @unique @default(uuid())  // Unieke identifier
  name            String    @unique                    // sAMAccountName: "project-kanbu-editors"
  displayName     String                               // "Project Kanbu Editors"
  description     String?
  distinguishedName String  @unique                    // "CN=Editors,OU=Kanbu,OU=Projects,DC=kanbu,DC=local"

  // Type en scope
  type            SecurityGroupType                    // SYSTEM, WORKSPACE, PROJECT, CUSTOM
  scope           SecurityGroupScope   @default(DOMAIN_LOCAL)  // DOMAIN_LOCAL, GLOBAL, UNIVERSAL

  // Hiërarchie koppeling (optioneel)
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
  externalId      String?                              // ID in externe directory

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
  DOMAIN_LOCAL      // Alleen binnen dit domein
  GLOBAL            // Kan members hebben uit andere domeinen
  UNIVERSAL         // Kan overal gebruikt worden
}

enum GroupSource {
  LOCAL             // Aangemaakt in Kanbu
  LDAP              // Gesynchroniseerd van LDAP
  AZURE_AD          // Gesynchroniseerd van Azure AD
  SCIM              // Via SCIM provisioning
}
```

### 1.2 Group Membership

```prisma
// Koppeling tussen users en groups
model SecurityGroupMember {
  id              Int       @id @default(autoincrement())

  groupId         Int
  group           SecurityGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  userId          Int
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Membership type
  memberType      MemberType @default(DIRECT)  // DIRECT of via nested group

  // Audit
  addedBy         Int?
  addedAt         DateTime  @default(now())
  expiresAt       DateTime?                    // Tijdelijk lidmaatschap

  @@unique([groupId, userId])
  @@index([userId])
  @@index([groupId])
}

enum MemberType {
  DIRECT            // Direct lid van de groep
  NESTED            // Lid via een nested group
  DYNAMIC           // Dynamisch op basis van rules
}
```

### 1.3 Permissions

```prisma
// Permission definitie
model Permission {
  id              Int       @id @default(autoincrement())

  // Identifier
  name            String    @unique   // "tasks.create", "sprints.manage", etc.
  displayName     String              // "Create Tasks"
  description     String?

  // Categorisatie
  category        String              // "tasks", "sprints", "milestones", etc.

  // Hiërarchie (voor inheritance)
  parentId        Int?
  parent          Permission?   @relation("PermissionHierarchy", fields: [parentId], references: [id])
  children        Permission[]  @relation("PermissionHierarchy")

  // Volgorde voor UI
  sortOrder       Int       @default(0)

  // Relations
  groupPermissions SecurityGroupPermission[]

  @@index([category])
}

// Koppeling tussen groups en permissions
model SecurityGroupPermission {
  id              Int       @id @default(autoincrement())

  groupId         Int
  group           SecurityGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  permissionId    Int
  permission      Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  // Allow/Deny zoals Windows
  accessType      AccessType    @default(ALLOW)

  // Scope - waar geldt deze permission?
  // NULL = overal waar de groep scope heeft
  workspaceId     Int?
  workspace       Workspace?  @relation(fields: [workspaceId], references: [id])
  projectId       Int?
  project         Project?    @relation(fields: [projectId], references: [id])

  // Inheritance
  inherited       Boolean   @default(false)   // Van parent group?

  @@unique([groupId, permissionId, workspaceId, projectId])
  @@index([groupId])
  @@index([permissionId])
}

enum AccessType {
  ALLOW
  DENY              // Deny overruled ALTIJD allow (zoals Windows)
}
```

---

## 2. Permission Categorieën

### 2.1 Systeem Permissions

| Permission | Beschrijving |
|------------|--------------|
| `system.admin` | Volledige systeemtoegang |
| `system.users.view` | Gebruikers bekijken |
| `system.users.manage` | Gebruikers aanmaken/wijzigen |
| `system.groups.view` | Security groups bekijken |
| `system.groups.manage` | Security groups beheren |
| `system.settings.view` | Systeeminstellingen bekijken |
| `system.settings.manage` | Systeeminstellingen wijzigen |

### 2.2 Workspace Permissions

| Permission | Beschrijving |
|------------|--------------|
| `workspace.view` | Workspace bekijken |
| `workspace.settings.manage` | Workspace instellingen wijzigen |
| `workspace.members.view` | Members bekijken |
| `workspace.members.manage` | Members toevoegen/verwijderen |
| `workspace.projects.create` | Nieuwe projecten aanmaken |
| `workspace.projects.delete` | Projecten verwijderen |

### 2.3 Project Permissions

| Permission | Beschrijving |
|------------|--------------|
| `project.view` | Project bekijken |
| `project.settings.manage` | Project instellingen wijzigen |
| `project.members.view` | Project members bekijken |
| `project.members.manage` | Project members beheren |
| `project.delete` | Project verwijderen |

### 2.4 Board/Tasks Permissions

| Permission | Beschrijving |
|------------|--------------|
| `tasks.view` | Tasks bekijken |
| `tasks.create` | Tasks aanmaken |
| `tasks.edit` | Tasks bewerken |
| `tasks.delete` | Tasks verwijderen |
| `tasks.move` | Tasks verplaatsen (drag & drop) |
| `tasks.assign` | Tasks toewijzen aan users |
| `tasks.comment` | Comments plaatsen |
| `board.columns.manage` | Kolommen beheren |
| `board.swimlanes.manage` | Swimlanes beheren |

### 2.5 Planning Permissions

| Permission | Beschrijving |
|------------|--------------|
| `sprints.view` | Sprints bekijken |
| `sprints.manage` | Sprints aanmaken/wijzigen/verwijderen |
| `milestones.view` | Milestones bekijken |
| `milestones.manage` | Milestones aanmaken/wijzigen/verwijderen |
| `analytics.view` | Analytics dashboard bekijken |

### 2.6 Integration Permissions

| Permission | Beschrijving |
|------------|--------------|
| `webhooks.view` | Webhooks bekijken |
| `webhooks.manage` | Webhooks aanmaken/wijzigen/verwijderen |
| `import.execute` | Data importeren |
| `export.execute` | Data exporteren |
| `api.access` | API toegang |

---

## 3. Standaard Security Groups

### 3.1 System-level Groups (automatisch)

| Group | Permissions |
|-------|-------------|
| **Domain Admins** | `system.admin` (full control) |
| **Domain Users** | Basis authenticatie |

### 3.2 Workspace-level Groups (per workspace)

| Group Template | Permissions |
|----------------|-------------|
| **{Workspace} Admins** | Alles binnen workspace |
| **{Workspace} Members** | `workspace.view`, `workspace.members.view` |

### 3.3 Project-level Groups (per project)

| Group Template | Permissions |
|----------------|-------------|
| **{Project} Admins** | Full control op project |
| **{Project} Managers** | Alles behalve delete project, members manage |
| **{Project} Editors** | Tasks CRUD, sprints/milestones view |
| **{Project} Viewers** | Alleen lezen |

---

## 4. Permission Inheritance & Resolution

### 4.1 Inheritance Regels

```
1. DENY overruled ALTIJD ALLOW (net als Windows)
2. Expliciete permission > inherited permission
3. Specifieke scope > algemene scope
4. Nested group permissions worden ge-merged
```

### 4.2 Resolution Algoritme

```typescript
function resolvePermission(
  userId: number,
  permission: string,
  scope: { workspaceId?: number, projectId?: number }
): boolean {
  // 1. Haal alle groepen op waar user (direct of nested) lid van is
  const groups = getUserGroups(userId, { includeNested: true });

  // 2. Haal alle permission entries op voor deze permission + scope
  const entries = getPermissionEntries(groups, permission, scope);

  // 3. Check voor DENY (hoogste prioriteit)
  if (entries.some(e => e.accessType === 'DENY')) {
    return false;
  }

  // 4. Check voor ALLOW
  if (entries.some(e => e.accessType === 'ALLOW')) {
    return true;
  }

  // 5. Geen expliciete permission = geen toegang
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

### 5.2 Object Tree (linkerkolom)

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

## 7. Implementatie Volgorde

### Fase 1: Database & Core (Week 1)
1. ✅ Database schema migreren
2. Permission seed data
3. PermissionService core logic
4. Migratie bestaande roles naar groups

### Fase 2: API Layer (Week 1-2)
1. tRPC procedures voor groups
2. tRPC procedures voor permissions
3. Permission middleware/guards

### Fase 3: UI Components (Week 2)
1. Object tree component
2. Permission grid component
3. Group selector/picker
4. User group membership editor

### Fase 4: Integration (Week 2-3)
1. Bestaande code refactoren naar nieuwe permission checks
2. UI elements tonen/verbergen op basis van permissions
3. Testing & debugging

### Fase 5: Advanced Features (Later)
1. LDAP sync
2. Audit logging
3. Permission templates
4. Bulk operations

---

## 8. Migratie van Bestaand Systeem

### Huidige structuur:
- `WorkspaceUser` met `role`: OWNER, ADMIN, MEMBER, VIEWER
- `ProjectMember` met `role`: OWNER, MANAGER, MEMBER, VIEWER

### Migratie:
1. Creëer security groups per workspace/project
2. Map oude roles naar nieuwe groups
3. Kopieer memberships
4. Update permission checks in code
5. Verwijder oude role velden (later, na validatie)

---

## Vragen ter Verduidelijking

1. **Nested groups**: Wil je volledige nested group support (group in group)?
2. **Permission inheritance**: Moet een Project group automatisch workspace permissions erven?
3. **Tijdelijke toegang**: Wil je dat memberships kunnen verlopen?
4. **Audit trail**: Hoe uitgebreid moet de logging zijn?
5. **Custom groups**: Mogen users zelf groups aanmaken of alleen admins?
