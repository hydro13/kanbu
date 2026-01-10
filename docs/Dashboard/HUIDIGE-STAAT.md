# Dashboard - Huidige Staat

## Versie: 2.0.0
## Datum: 2026-01-10
## Status: Analyse

---

## Overzicht

Dit document beschrijft de **huidige** implementatie van het Kanbu Dashboard en sidebar systeem. Deze analyse dient als basis voor de Claude's Planner implementatie.

---

## 1. Architectuur Overzicht

### Frontend Stack

| Component | Technologie | Locatie |
|-----------|-------------|---------|
| Framework | React 18 + TypeScript | `apps/web/` |
| Routing | React Router DOM | `App.tsx` |
| State | Redux Toolkit + Zustand | `store/`, diverse stores |
| Data Fetching | tRPC + React Query | `lib/trpc.ts` |
| Styling | Tailwind CSS | Component files |
| UI Components | Radix UI + custom | `components/ui/` |
| Real-time | Socket.io | `hooks/useSocket.ts` |
| Icons | Lucide React | Throughout |

### Backend Stack

| Component | Technologie | Locatie |
|-----------|-------------|---------|
| Framework | Fastify | `apps/api/` |
| API | tRPC | `trpc/procedures/` |
| Database | PostgreSQL + Prisma | `prisma/schema.prisma` |
| Real-time | Socket.io | `socket/index.ts` |
| Auth | JWT | `services/auth.ts` |
| ACL | Custom RWXDP | `services/aclService.ts` |

---

## 2. Sidebar Systeem

### Drie Sidebar Types

Kanbu heeft drie verschillende sidebar implementaties:

#### 2.1 DashboardSidebar

**Bestand:** `components/dashboard/DashboardSidebar.tsx`

```typescript
// Huidige structuur - flat list
const navItems: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: HomeIcon, exact: true },
  { label: 'My Tasks', path: '/dashboard/tasks', icon: TaskIcon },
  { label: 'My Subtasks', path: '/dashboard/subtasks', icon: SubtaskIcon },
  { label: 'My Workspaces', path: '/workspaces', icon: BuildingIcon },
]
```

**Status:** 🔶 Basis - geen tree, geen workspaces inline

#### 2.2 ProjectSidebar

**Bestand:** `components/layout/ProjectSidebar.tsx`

ACL-aware sidebar met 4 secties:
- **Views:** Board, List, Calendar, Timeline (R features)
- **Planning:** Sprints, Milestones, Analytics (X features)
- **Manage:** Members, Settings, Import/Export, Webhooks (P features)
- **Integrations:** GitHub (P features)

```typescript
// ACL filtering pattern
const filteredSections = navSections
  .map(section => ({
    ...section,
    items: section.items.filter(item =>
      isLoading || canSeeFeature(item.slug)
    ),
  }))
  .filter(section => section.items.length > 0)
```

**Status:** ✅ Goed - ACL filtering werkt

#### 2.3 AdminSidebar

**Bestand:** `components/admin/AdminSidebar.tsx`

Dual-permission systeem:
1. **Scope check:** domainAdmin / workspaceAdmin / any
2. **ACL feature check:** slug-based visibility

```typescript
const hasRequiredScope = (required?: RequiredScope): boolean => {
  if (!required || required === 'any') return true
  if (required === 'domainAdmin') return isDomainAdmin
  if (required === 'workspaceAdmin') return isDomainAdmin || isWorkspaceAdmin
  return false
}

const canSeeItem = (item: NavItem): boolean => {
  if (!hasRequiredScope(item.requiredScope)) return false
  if (item.slug && !canSeeFeature(item.slug)) return false
  return true
}
```

**Status:** ✅ Goed - dual permission werkt

---

## 3. BaseLayout

**Bestand:** `components/layout/BaseLayout.tsx`

Core layout component met:

### Features

| Feature | Status | Beschrijving |
|---------|--------|--------------|
| Collapsible sidebar | ✅ Werkt | `Ctrl+/` toggle, localStorage persist |
| Resizable sidebar | ✅ Werkt | Drag border, 160-400px range |
| Mobile responsive | ✅ Werkt | Overlay drawer op mobile |
| Breadcrumbs | ✅ Werkt | SEO-optimized met schema.org |
| User menu | ✅ Werkt | Profile, Admin (if access), Logout |
| Help button | ✅ Werkt | `?` shortcut voor help modal |
| Width toggle | ✅ Werkt | Full-width of max-1600px |

### Collapse Mechanism

```typescript
const COLLAPSED_STORAGE_PREFIX = 'kanbu_sidebar_collapsed_'
const COLLAPSED_WIDTH = 56 // 56px for icon-only mode

const [isCollapsed, setIsCollapsed] = useState(() => {
  const stored = localStorage.getItem(COLLAPSED_STORAGE_PREFIX + sidebarKey)
  return stored === 'true'
})

const toggleCollapsed = useCallback(() => {
  setIsCollapsed((prev) => {
    const newValue = !prev
    localStorage.setItem(COLLAPSED_STORAGE_PREFIX + sidebarKey, String(newValue))
    return newValue
  })
}, [sidebarKey])
```

---

## 4. State Management

### Redux Store

**Bestand:** `store/index.ts`

```typescript
export const store = configureStore({
  reducer: {
    auth: authReducer,      // User, token, role
    workspace: workspaceReducer,
    project: projectReducer,
    board: boardReducer,    // Board column order for drag-drop
    undo: undoReducer,      // Undo/redo functionality
  },
})
```

### Auth Slice

**Bestand:** `store/authSlice.ts`

```typescript
interface AuthState {
  user: AuthUser | null
  token: string | null
  expiresAt: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// localStorage persistence
// Keys: kanbu_token, kanbu_user, kanbu_expires
```

### Overige State

- **Zustand stores** - Gebruikt voor UI-specifieke state (niet server data)
- **React Query** - Alle server state via tRPC hooks

---

## 5. ACL Systeem

### Permission Bitmask

```
R (READ) = 1       - Bekijken
W (WRITE) = 2      - Aanmaken/wijzigen
X (EXECUTE) = 4    - Uitvoeren (planning features)
D (DELETE) = 8     - Verwijderen
P (PERMISSIONS) = 16 - Beheren
```

### Presets

| Preset | Waarde | Permissions |
|--------|--------|-------------|
| NONE | 0 | Geen |
| READ_ONLY | 1 | R |
| CONTRIBUTOR | 7 | R+W+X |
| EDITOR | 15 | R+W+X+D |
| FULL_CONTROL | 31 | R+W+X+D+P |

### Resource Types

```typescript
type ResourceType =
  | 'root'      // System root (domain admin level)
  | 'system'    // System-wide settings
  | 'dashboard' // Dashboard features
  | 'workspace' // Workspace level
  | 'project'   // Project level
  | 'feature'   // Feature flags
  | 'admin'     // Admin panel access
  | 'profile'   // User profile settings
```

### Frontend Hooks

| Hook | Bestand | Gebruik |
|------|---------|---------|
| `useAclPermission` | `hooks/useAclPermission.ts` | Check permissions op resource |
| `useWorkspaceAcl` | Zelfde | Convenience voor workspace |
| `useProjectAcl` | Zelfde | Convenience voor project |
| `useFeatureAcl` | Zelfde | Convenience voor feature |
| `useDashboardFeatureAccess` | `hooks/useFeatureAccess.ts` | Dashboard feature visibility |
| `useAdminFeatureAccess` | Zelfde | Admin feature visibility |
| `useProjectFeatureAccess` | `hooks/useProjectFeatureAccess.ts` | Project feature visibility |

---

## 6. Real-Time Systeem

### Socket.io Architecture

**Bestand:** `apps/api/src/socket/index.ts`

| Feature | Status | Beschrijving |
|---------|--------|--------------|
| WebSocket | ✅ Werkt | Socket.io met polling fallback |
| Redis adapter | ✅ Werkt | Multi-instance ready |
| JWT auth | ✅ Werkt | Socket auth middleware |
| Room system | ✅ Werkt | project:ID, task:ID, etc. |

### Event Types

```typescript
// Task events
'task:created' | 'task:updated' | 'task:moved' | 'task:deleted'

// Comment events
'comment:created' | 'comment:updated' | 'comment:deleted'

// Subtask events
'subtask:created' | 'subtask:updated' | 'subtask:deleted'

// Collaboration
'cursor:move' | 'typing:start' | 'typing:stop'
'editing:start' | 'editing:stop' | 'editing:heartbeat'
'presence:joined' | 'presence:left'
```

### Frontend Hook

**Bestand:** `hooks/useSocket.ts`

```typescript
useSocket({
  projectId: 123,
  onTaskCreated: (payload) => handleTaskCreated(payload),
  onTaskUpdated: (payload) => handleTaskUpdated(payload),
  onPresenceJoined: (payload) => handleUserJoined(payload),
})

// Automatic room join/leave on mount/unmount
// Automatic event listener cleanup
```

---

## 7. Dashboard Pages

### Huidige Routes

| Route | Page | Sidebar |
|-------|------|---------|
| `/dashboard` | DashboardOverview | DashboardSidebar |
| `/dashboard/tasks` | MyTasks | DashboardSidebar |
| `/dashboard/subtasks` | MySubtasks | DashboardSidebar |
| `/dashboard/notes` | StickyNotes | DashboardSidebar |
| `/workspaces` | WorkspaceList | DashboardSidebar |

### DashboardOverview

**Bestand:** `pages/dashboard/DashboardOverview.tsx`

| Sectie | Status | Beschrijving |
|--------|--------|--------------|
| Quick Stats | ✅ Werkt | 4 cards: Tasks, Subtasks, Due, Completed |
| Workspaces | ✅ Werkt | Card grid met stats |
| Sticky Notes | ✅ Werkt | Colored notes grid |

```typescript
// Data fetching
const myTasksQuery = trpc.user.getMyTasks.useQuery()
const mySubtasksQuery = trpc.user.getMySubtasks.useQuery()
const workspacesQuery = trpc.workspace.list.useQuery()
```

---

## 8. tRPC Routers

### Beschikbare Routers (28 totaal)

```typescript
export const appRouter = router({
  system,
  auth,
  workspace,    // ← Workspace CRUD
  user,
  project,      // ← Project CRUD
  column,
  swimlane,
  task,
  subtask,
  comment,
  activity,
  tag,
  category,
  taskLink,
  search,
  attachment,
  notification,
  sprint,
  milestone,
  analytics,
  import,
  export,
  apiKey,
  webhook,
  admin,
  stickyNote,
  group,        // ← Security groups (NOT project groups)
  roleAssignment,
  youtube,
  acl,          // ← ACL management
  auditLog,
  assistant,
  githubAdmin,  // ← GitHub workspace-level
  github,       // ← GitHub project-level
})
```

### Relevante Procedures voor Dashboard

| Procedure | Beschrijving |
|-----------|--------------|
| `workspace.list` | Lijst workspaces (ACL filtered) |
| `workspace.get` | Workspace details |
| `project.list` | Projecten in workspace (ACL filtered) |
| `user.getMyTasks` | Taken assigned aan user |
| `user.getMySubtasks` | Subtaken assigned aan user |
| `group.myAdminScope` | Admin scope check (domain/workspace admin) |

---

## 9. Database Models

### Relevante Models voor Dashboard

#### Workspace

```prisma
model Workspace {
  id          Int       @id @default(autoincrement())
  name        String
  slug        String    @unique
  description String?
  logoUrl     String?
  isActive    Boolean   @default(true)

  projects           Project[]
  projectGroups      ProjectGroup[]
  githubInstallations GitHubInstallation[]
}
```

#### Project

```prisma
model Project {
  id          Int       @id @default(autoincrement())
  workspaceId Int
  name        String
  identifier  String    @unique
  prefix      String
  isActive    Boolean   @default(true)

  workspace        Workspace         @relation(...)
  githubRepository GitHubRepository?
  tasks            Task[]
}
```

#### ProjectGroup (bestaat, geen UI)

```prisma
model ProjectGroup {
  id          Int                @id @default(autoincrement())
  workspaceId Int
  name        String
  description String?
  color       String             @default("blue")
  status      ProjectGroupStatus @default(DRAFT)

  projects  ProjectGroupMember[]
  workspace Workspace            @relation(...)
}

enum ProjectGroupStatus {
  DRAFT
  PLANNED
  ACTIVE
  COMPLETED
  CLOSED
}
```

#### GitHubRepository

```prisma
model GitHubRepository {
  id             Int      @id @default(autoincrement())
  projectId      Int      @unique
  installationId Int
  repoId         Int
  owner          String
  name           String
  fullName       String
  defaultBranch  String
  lastSyncStatus String?
  lastSyncAt     DateTime?

  project      Project            @relation(...)
  installation GitHubInstallation @relation(...)
}
```

---

## 10. Wat Bestaat vs Wat Mist

### Bestaat en Werkt

| Feature | Status | Bestand |
|---------|--------|---------|
| Collapsible sidebar | ✅ | BaseLayout.tsx |
| Resizable sidebar | ✅ | BaseLayout.tsx |
| Command palette | 🔶 Basis | CommandPalette.tsx |
| Keyboard shortcuts modal | 🔶 Basis | KeyboardShortcuts.tsx |
| Dashboard stats | ✅ | DashboardOverview.tsx |
| Workspace cards | ✅ | WorkspaceCard.tsx |
| Sticky notes | ✅ | StickyNote.tsx |
| Project sidebar (ACL) | ✅ | ProjectSidebar.tsx |
| Admin sidebar (dual perm) | ✅ | AdminSidebar.tsx |
| Real-time updates | ✅ | useSocket.ts |
| ACL system | ✅ | useAclPermission.ts |

### Mist voor Claude's Planner

| Feature | Priority | Fase |
|---------|----------|------|
| Workspace tree in sidebar | HOOG | 1-2 |
| Project nodes in tree | HOOG | 1-2 |
| GitHub section per workspace | HOOG | 3 |
| Project Groups UI | MEDIUM | 4 |
| Favorites system | MEDIUM | 6 |
| Home widgets | MEDIUM | 5 |
| Inbox/notifications | MEDIUM | 5 |
| Today/Upcoming views | LOW | 5 |
| Tree keyboard navigation | LOW | 7 |
| Context menus | LOW | 7 |
| Search in tree | LOW | 7 |
| Drag & drop | LOW | 7 |

---

## 11. Code Patterns om te Volgen

### Sidebar Item met ACL

```typescript
interface NavItem {
  label: string
  path: string
  icon: React.ComponentType
  slug: FeatureSlug  // Voor ACL check
}

// Filter items op permission
const visibleItems = items.filter(item =>
  isLoading || canSeeFeature(item.slug)
)
```

### Real-Time Query Invalidation

```typescript
const queryClient = useQueryClient()

useSocket({
  onProjectCreated: () => {
    queryClient.invalidateQueries({ queryKey: ['workspace'] })
  },
})
```

### Collapsed Sidebar Rendering

```typescript
function SidebarItem({ item, collapsed }: Props) {
  return (
    <NavLink to={item.path}>
      <item.icon className="h-4 w-4" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}
```

### Error Boundary Pattern

```typescript
const { data, isLoading, error } = trpc.someQuery.useQuery()

if (isLoading) return <Skeleton />
if (error) return <ErrorMessage error={error} />
if (!data) return <EmptyState />

return <Content data={data} />
```

---

## 12. Bestandslocaties

### Frontend

```
apps/web/src/
├── components/
│   ├── dashboard/
│   │   ├── DashboardSidebar.tsx   # Te refactoren
│   │   ├── DashboardLayout.tsx    # Layout wrapper
│   │   └── ...
│   ├── layout/
│   │   ├── BaseLayout.tsx         # Core layout
│   │   ├── ProjectSidebar.tsx     # ACL-aware sidebar
│   │   └── ...
│   ├── admin/
│   │   ├── AdminSidebar.tsx       # Dual permission sidebar
│   │   └── ...
│   └── ui/                        # Radix-based components
├── hooks/
│   ├── useAclPermission.ts        # ACL hook
│   ├── useFeatureAccess.ts        # Feature access hooks
│   ├── useProjectFeatureAccess.ts # Project features
│   ├── useSocket.ts               # Real-time hook
│   └── ...
├── stores/                        # Zustand stores
├── store/                         # Redux store
├── pages/
│   └── dashboard/
│       ├── DashboardOverview.tsx
│       ├── MyTasks.tsx
│       ├── MySubtasks.tsx
│       └── ...
└── App.tsx                        # Routes
```

### Backend

```
apps/api/src/
├── trpc/
│   ├── procedures/
│   │   ├── workspace.ts           # Workspace CRUD
│   │   ├── project.ts             # Project CRUD
│   │   ├── acl.ts                 # ACL management
│   │   ├── group.ts               # Security groups
│   │   ├── github.ts              # GitHub project-level
│   │   ├── githubAdmin.ts         # GitHub workspace-level
│   │   └── ...
│   ├── router.ts                  # Procedure wrappers
│   └── index.ts                   # Router registration
├── services/
│   ├── aclService.ts              # ACL business logic
│   ├── permissions.ts             # Permission checks
│   └── groupPermissions.ts        # Group-based permissions
└── socket/
    ├── index.ts                   # Socket.io setup
    ├── emitter.ts                 # Event emitters
    └── rooms.ts                   # Room management
```

---

## Referenties

- [VISIE.md](./VISIE.md) - Design doelen
- [ROADMAP.md](./ROADMAP.md) - Implementatie plan
- [../Github-projects/VISIE.md](../Github-projects/VISIE.md) - GitHub integratie
