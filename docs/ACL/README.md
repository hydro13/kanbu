# Access Control Lists (ACL) Systeem

## Overzicht

Kanbu gebruikt een **filesystem-style ACL systeem** geïnspireerd op NTFS/Active Directory permissies. Dit biedt een flexibel en krachtig autorisatiemodel dat zowel eenvoudige als complexe toegangsscenario's ondersteunt.

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

### Geïmplementeerd ✓

- [x] Database model (AclEntry)
- [x] AclService met alle core functies
- [x] tRPC procedures voor CRUD
- [x] ACL Manager UI
- [x] Integration in PermissionService
- [x] Workspace listing via ACL
- [x] Workspace access via ACL
- [x] 15 unit tests

### Hybride Modus (Huidige Situatie)

Het systeem draait nu in **hybride modus**:
- ACL wordt gecheckt voor workspace/project toegang
- Legacy tabellen (WorkspaceUser, ProjectMember) worden nog steeds gebruikt als fallback
- Nieuwe permissies kunnen via ACL Manager worden toegevoegd

## Bestanden

| Bestand | Beschrijving |
|---------|--------------|
| `apps/api/src/services/aclService.ts` | Core ACL service |
| `apps/api/src/services/permissions.ts` | PermissionService met ACL integratie |
| `apps/api/src/trpc/procedures/acl.ts` | tRPC endpoints |
| `apps/web/src/pages/admin/AclPage.tsx` | ACL Manager UI |
| `packages/shared/prisma/schema.prisma` | AclEntry model |
| `packages/shared/prisma/migrations/acl-migration-helper.ts` | Migratie script |

## Zie Ook

- [ROADMAP.md](./ROADMAP.md) - Implementatie roadmap
- [MIGRATION.md](./MIGRATION.md) - Migratie handleiding (TODO)
