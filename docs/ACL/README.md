# Access Control Lists (ACL) Systeem

> **Visie & Architectuur:** Zie [ARCHITECTURE.md](./ARCHITECTURE.md) voor de volledige visie van het scoped permission model.
> **Implementatie Status:** Zie [ROADMAP.md](./ROADMAP.md) voor de huidige status en planning.

## Overzicht

Kanbu gebruikt een **filesystem-style ACL systeem** geïnspireerd op NTFS/Active Directory permissies. Dit biedt een flexibel en krachtig autorisatiemodel dat zowel eenvoudige als complexe toegangsscenario's ondersteunt.

Het systeem evolueert naar een **Scoped Permission Model** met:
- **Resource hiërarchie**: System > Workspaces > Projects
- **Security Groups**: AD-compatible groepen voor role-based access
- **Workspace isolation**: Gedelegeerde administratie per workspace
- **Scoped data access**: Users zien alleen data binnen hun scope

## Waarom ACL?

Het vorige role-based systeem (WorkspaceUser, ProjectMember) had beperkingen:
- Geen ondersteuning voor expliciete deny
- Geen inheritance tussen resources
- Beperkte granulariteit (alleen voorgedefinieerde roles)
- Geen groepsgebaseerde permissies op resource niveau

Het nieuwe ACL systeem lost dit op met:
- **Bitmask permissies** - Flexibele combinatie van rechten
- **Deny-first logic** - Expliciete weigering overschrijft altijd toestemming
- **Inheritance** - Workspace permissies erven door naar projects
- **Principal types** - Zowel users als groups kunnen rechten krijgen

## Permissie Model (RWXDP)

```
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION BITS                          │
├─────────┬───────┬─────────────────────────────────────────┤
│ Letter  │ Value │ Betekenis                                │
├─────────┼───────┼─────────────────────────────────────────┤
│ R       │ 1     │ Read - Content bekijken                  │
│ W       │ 2     │ Write - Content wijzigen                 │
│ X       │ 4     │ Execute - Nieuwe items aanmaken          │
│ D       │ 8     │ Delete - Items verwijderen               │
│ P       │ 16    │ Permissions - ACLs beheren               │
└─────────┴───────┴─────────────────────────────────────────┘
```

### Presets

| Preset       | Value | Bits  | Beschrijving                    |
|--------------|-------|-------|---------------------------------|
| None         | 0     | -----  | Geen rechten                    |
| Read Only    | 1     | R----  | Alleen lezen                    |
| Contributor  | 7     | RWX--  | Lezen, schrijven, aanmaken      |
| Editor       | 15    | RWXD-  | Alles behalve ACL beheer        |
| Full Control | 31    | RWXDP  | Volledige controle              |

### Bitmask Berekening

Permissies worden opgeslagen als een integer bitmask:

```typescript
// Voorbeeld: Read + Write = 1 + 2 = 3
const permissions = ACL_PERMISSIONS.READ | ACL_PERMISSIONS.WRITE // 3

// Check of een permissie aanwezig is
const hasRead = (permissions & ACL_PERMISSIONS.READ) !== 0 // true
const hasDelete = (permissions & ACL_PERMISSIONS.DELETE) !== 0 // false
```

## Database Model

```prisma
model AclEntry {
  id              Int      @id @default(autoincrement())
  resourceType    String   // 'workspace', 'project', 'admin', 'profile'
  resourceId      Int?     // null = root/all resources of type
  principalType   String   // 'user' of 'group'
  principalId     Int      // user.id of group.id
  permissions     Int      // bitmask (0-31)
  deny            Boolean  // true = deny entry, false = allow entry
  inherited       Boolean  // true = geërfd van parent
  inheritToChildren Boolean // true = erft door naar children
  createdAt       DateTime
  createdById     Int?
  updatedAt       DateTime
}
```

## Deny-First Logic

Net als NTFS werkt het ACL systeem met **deny-first**:

1. Verzamel alle DENY entries voor de user (direct + via groups)
2. Verzamel alle ALLOW entries voor de user (direct + via groups)
3. Bereken: `effectivePermissions = allowedPermissions & ~deniedPermissions`

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

Permissies kunnen overerven van parent naar child resources:

```
┌─────────────────────────────────────────────────────────────┐
│                    RESOURCE HIERARCHY                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   workspace (null)     ← Root: alle workspaces              │
│        │                                                     │
│        ▼                                                     │
│   workspace (id: 1)    ← Specifieke workspace               │
│        │                                                     │
│        ▼ inheritToChildren=true                              │
│   project (id: 5)      ← Project erft workspace permissies  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Als een user READ heeft op `workspace:1` met `inheritToChildren=true`, dan heeft die user automatisch ook READ op alle projects binnen die workspace.

## Role Mapping

ACL permissies worden vertaald naar workspace/project roles voor compatibiliteit:

| ACL Permissies | Workspace Role | Project Role |
|----------------|----------------|--------------|
| R              | VIEWER         | VIEWER       |
| RW of RWX      | MEMBER         | MEMBER       |
| RWXD           | MEMBER         | MANAGER      |
| RWXDP          | ADMIN          | OWNER        |

## API Endpoints

### tRPC Procedures (`trpc.acl.*`)

| Procedure       | Beschrijving                              |
|-----------------|-------------------------------------------|
| `list`          | ACL entries voor een resource ophalen     |
| `grant`         | Permissies verlenen aan user/group        |
| `deny`          | Permissies expliciet weigeren             |
| `revoke`        | Alle permissies intrekken                 |
| `update`        | Bestaande ACL entry aanpassen             |
| `delete`        | ACL entry verwijderen                     |
| `checkPermission` | Effectieve permissies controleren       |
| `getPresets`    | Beschikbare presets ophalen               |
| `getPrincipals` | Users en groups ophalen voor toewijzing   |
| `getResources`  | Resources ophalen die ACLs kunnen hebben  |
| `getStats`      | ACL statistieken (admin only)             |

## Service Layer

### AclService (`services/aclService.ts`)

```typescript
// Check enkele permissie
await aclService.hasPermission(userId, 'workspace', workspaceId, ACL_PERMISSIONS.READ)

// Check alle permissies
const result = await aclService.checkPermission(userId, 'project', projectId)
// result.effectivePermissions = 7 (RWX)
// result.deniedPermissions = 0
// result.sources = [{ type: 'user', ... }, { type: 'group', ... }]

// Permissie verlenen
await aclService.grantPermission({
  resourceType: 'workspace',
  resourceId: 1,
  principalType: 'user',
  principalId: 5,
  permissions: ACL_PRESETS.CONTRIBUTOR,
  inheritToChildren: true,
})

// Permissie weigeren
await aclService.denyPermission({
  resourceType: 'project',
  resourceId: 10,
  principalType: 'group',
  principalId: 3,
  permissions: ACL_PERMISSIONS.DELETE,
})
```

## UI

De ACL Manager is beschikbaar via **Administration > ACL Manager** (`/admin/acl`).

Features:
- Resource selector (workspaces, projects, admin)
- Overzicht van alle ACL entries met ALLOW/DENY badges
- Grant/Deny dialogs met preset selectie
- Custom permission toggles
- Inheritance opties
- Statistics overzicht

## Huidige Status

### Pure ACL Modus ✓

Het systeem draait nu in **pure ACL modus** (Fase 3B voltooid):
- [x] Alle workspace/project access via ACL
- [x] Legacy fallback verwijderd
- [x] Members worden uit ACL gelezen
- [x] Procedures schrijven alleen naar ACL

### Geïmplementeerd ✓

- [x] Database model (AclEntry)
- [x] AclService met alle core functies
- [x] tRPC procedures voor CRUD
- [x] ACL Manager UI met VSCode-style tree (Fase 4)
- [x] Security Groups sectie in tree
- [x] Real-time WebSocket updates
- [x] Integration in PermissionService
- [x] Workspace listing/access via ACL
- [x] Project listing/access via ACL
- [x] 15 unit tests

### Voltooid (Fase 4B-8C)

- [x] **Fase 4B**: [+] knop voor Security Groups, GroupListPage verwijderd
- [x] **Fase 4C**: Extended Resource Hierarchy (root, system, dashboard)
- [x] **Fase 5**: ScopeService voor data filtering
- [x] **Fase 6**: Workspace-scoped admin panel
- [x] **Fase 7**: Conditionele menu's en AclGate component
- [x] **Fase 8B**: Feature ACL voor Projects (11 features)
- [x] **Fase 8C**: Systeem-breed Feature ACL (40 features totaal)

### Feature ACL Overzicht

**40 features over 4 scopes:**
- `dashboard` (4): overview, my-tasks, my-subtasks, my-workspaces
- `profile` (16): summary, time-tracking, last-logins, sessions, password-history, metadata, edit-profile, avatar, change-password, two-factor-auth, public-access, notifications, external-accounts, integrations, api-tokens, hourly-rate
- `admin` (9): users, create-user, acl, permission-tree, invites, workspaces, settings-general, settings-security, backup
- `project` (11): board, list, calendar, timeline, sprints, milestones, analytics, members, settings, import-export, webhooks

### Voltooid (Fase 9.1)

- [x] **Fase 9.1**: Audit Logging - Security audit trail voor alle kritieke events

### Gepland (Fase 9.2-9.6)

- [ ] **Fase 9.2**: LDAP/AD Sync
- [ ] **Fase 9.3**: Task-level ACL
- [ ] **Fase 9.4**: Bulk Operations
- [ ] **Fase 9.5**: Advanced UI (Permission matrix, What-if simulator)
- [ ] **Fase 9.6**: API Keys & Service Accounts

Zie [ROADMAP.md](./ROADMAP.md) voor de volledige planning.

## Te Verwijderen in Fase 4B

> ⚠️ **Radicale Simplificatie:** De volgende systemen worden VOLLEDIG verwijderd.

### Tabellen (Database)

| Tabel | Reden voor verwijdering |
|-------|------------------------|
| `GroupPermission` | Named permissions niet nodig, ACL bitmask is beter |
| `Permission` | Alleen gebruikt door GroupPermission |
| `RoleAssignment` | Niet nodig, ACL presets zijn genoeg |
| `WorkspaceUser` | ❌ AL VERWIJDERD - vervangen door AclEntry |
| `ProjectMember` | ❌ AL VERWIJDERD - vervangen door AclEntry |

### Frontend Pages

| Page | Reden voor verwijdering |
|------|------------------------|
| `GroupListPage.tsx` | Niet nodig, groups zichtbaar in AclPage ResourceTree |
| `GroupEditPage.tsx` | Niet nodig, members via GroupMembersPanel in AclPage |

### Backend Services

| Service | Reden voor verwijdering |
|---------|------------------------|
| `groupPermissions.ts` | Named permissions niet meer nodig |
| `roleAssignmentService.ts` | RoleAssignment niet meer nodig |
| `roleAssignment.ts` (procedures) | RoleAssignment niet meer nodig |

### Wat Blijft

**AclPage is de single source of truth voor:**
- Security Groups aanmaken ([+] knop)
- Group members beheren (GroupMembersPanel)
- ACL permissions toekennen (Grant/Deny dialogs)
- Resources beheren (ResourceTree)

## Bestanden

| Bestand | Beschrijving |
|---------|--------------|
| `apps/api/src/services/aclService.ts` | Core ACL service |
| `apps/api/src/services/permissions.ts` | PermissionService met ACL integratie |
| `apps/api/src/trpc/procedures/acl.ts` | tRPC endpoints |
| `apps/web/src/pages/admin/AclPage.tsx` | ACL Manager UI |
| `apps/web/src/components/admin/ResourceTree.tsx` | VSCode-style resource tree component |
| `packages/shared/prisma/schema.prisma` | AclEntry model |

## Zie Ook

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Volledige visie en technische specificaties
- [ROADMAP.md](./ROADMAP.md) - Implementatie roadmap met status
- [MIGRATION.md](./MIGRATION.md) - Migratie handleiding
