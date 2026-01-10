# Dashboard Roadmap

## Versie: 2.0.0
## Datum: 2026-01-10
## Status: Active

---

## Leeswijzer

Dit document is de **primaire implementatie gids** voor Claude Code sessies. Elke fase en sub-fase bevat:

- **Doel** - Wat we bereiken
- **Dependencies** - Wat moet eerst af zijn
- **Deliverables** - Concrete output
- **Technische Details** - Code voorbeelden en patterns
- **Acceptatiecriteria** - Wanneer is het klaar
- **Testing** - Wat en hoe te testen
- **DO's** - Wat je MOET doen
- **DON'Ts** - Wat je NIET mag doen

---

## Overzicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  FASE 1         FASE 2         FASE 3         FASE 4         FASE 5        │
│  Foundation     Core Tree      GitHub         Groups         Personal      │
│  ██████████     ████████░░     ████░░░░░░     ░░░░░░░░░░     ░░░░░░░░░░    │
│  COMPLETE       IN PROGRESS    PARTIAL        PLANNED        PLANNED       │
│                                                                             │
│  FASE 6         FASE 7                                                      │
│  Favorites      Polish                                                      │
│  ░░░░░░░░░░     ░░░░░░░░░░                                                  │
│  PLANNED        PLANNED                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dependency Graph

```
Fase 1 (Foundation)
    │
    ├──► Fase 2 (Core Tree) ──► Fase 3 (GitHub) ──► Fase 4 (Groups)
    │                                                      │
    │                                                      ▼
    └──► Fase 5 (Personal) ◄────────────────────────── Fase 6 (Favorites)
                │
                ▼
           Fase 7 (Polish)
```

---

# FASE 1: Foundation

**Status:** ✅ Complete (2026-01-10)
**Geschatte Effort:** Medium
**Dependencies:** Geen (start fase)

## Doel

Creëer de technische fundatie voor de collapsible tree sidebar:
- Backend API voor hiërarchische data
- Zustand store voor UI state
- Basis tree rendering component

---

## 1.1 Tree Data API

**Status:** ✅ Complete

### Doel

Eén API call die alle data voor de sidebar tree retourneert, geoptimaliseerd voor snelle loads.

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| tRPC procedure | `apps/api/src/trpc/procedures/dashboard.ts` | `dashboard.getHierarchy` |
| Zod schema | `apps/api/src/trpc/procedures/dashboard.ts` | Input/output types |
| ACL integratie | Ingebouwd | Alleen zichtbare resources |

### Technische Details

**Nieuwe procedure:**

```typescript
// apps/api/src/trpc/procedures/dashboard.ts
import { z } from 'zod'
import { protectedProcedure, router } from '../router'

export const dashboardRouter = router({
  getHierarchy: protectedProcedure
    .output(z.object({
      workspaces: z.array(z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
        logoUrl: z.string().nullable(),
        kanbuProjects: z.array(z.object({
          id: z.number(),
          name: z.string(),
          identifier: z.string(),
          prefix: z.string(),
          hasGitHub: z.boolean(),
          taskCount: z.number(),
        })),
        githubRepos: z.array(z.object({
          id: z.number(),
          name: z.string(),
          fullName: z.string(),
          syncStatus: z.enum(['synced', 'pending', 'error', 'never']),
          projectId: z.number().nullable(), // Linked Kanbu project
        })),
        projectGroups: z.array(z.object({
          id: z.number(),
          name: z.string(),
          color: z.string(),
          projectCount: z.number(),
        })),
      })),
    }))
    .query(async ({ ctx }) => {
      // ACL filtering happens in workspace.list and project.list
      const workspaces = await ctx.prisma.workspace.findMany({
        where: {
          isActive: true,
          // ACL check via permissionService
        },
        include: {
          projects: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              identifier: true,
              prefix: true,
              githubRepository: { select: { id: true } },
              _count: { select: { tasks: true } },
            },
          },
          githubInstallations: {
            include: {
              repositories: true,
            },
          },
          projectGroups: {
            where: { status: { not: 'CLOSED' } },
            include: {
              _count: { select: { projects: true } },
            },
          },
        },
      })

      // Transform en filter op ACL
      return {
        workspaces: workspaces.map(ws => ({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          logoUrl: ws.logoUrl,
          kanbuProjects: ws.projects
            .filter(p => !p.githubRepository) // Alleen pure Kanbu
            .map(p => ({
              id: p.id,
              name: p.name,
              identifier: p.identifier,
              prefix: p.prefix,
              hasGitHub: false,
              taskCount: p._count.tasks,
            })),
          githubRepos: ws.githubInstallations.flatMap(inst =>
            inst.repositories.map(repo => ({
              id: repo.id,
              name: repo.name,
              fullName: repo.fullName,
              syncStatus: repo.lastSyncStatus ?? 'never',
              projectId: repo.projectId,
            }))
          ),
          projectGroups: ws.projectGroups.map(g => ({
            id: g.id,
            name: g.name,
            color: g.color,
            projectCount: g._count.projects,
          })),
        })),
      }
    }),
})
```

**Router registratie:**

```typescript
// apps/api/src/trpc/index.ts
import { dashboardRouter } from './procedures/dashboard'

export const appRouter = router({
  // ... existing routers
  dashboard: dashboardRouter,
})
```

### Acceptatiecriteria

- [x] `trpc.dashboard.getHierarchy` retourneert alle data in één call
- [x] Alleen workspaces/projecten waar user R permission heeft
- [x] Response tijd < 200ms voor 10 workspaces, 50 projecten
- [x] Zod validatie op output
- [x] Geen N+1 queries (check met Prisma logging)

### Testing

| Type | Wat | Door |
|------|-----|------|
| Unit | Procedure retourneert correcte structuur | Automated |
| ACL | User ziet alleen eigen workspaces | Robin (2 users testen) |
| Performance | Response tijd meten | Robin (dev tools) |

### DO's

- ✅ Gebruik bestaande `permissionService` voor ACL checks
- ✅ Include `_count` voor efficiënte telling
- ✅ Filter op `isActive: true` voor soft-deleted items
- ✅ Log slow queries met Prisma

### DON'Ts

- ❌ Geen aparte calls per workspace (N+1 probleem)
- ❌ Geen hardcoded user IDs
- ❌ Geen ACL bypass
- ❌ Niet alle project details includen (alleen wat nodig is voor tree)

---

## 1.2 Zustand Store

**Status:** ✅ Complete

### Doel

State management voor tree expand/collapse met localStorage persistence.

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| Zustand store | `apps/web/src/stores/dashboardTreeStore.ts` | Tree state |
| localStorage sync | Ingebouwd | Persist across sessions |

### Technische Details

```typescript
// apps/web/src/stores/dashboardTreeStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DashboardTreeState {
  // Welke workspaces zijn open
  expandedWorkspaces: Set<number>

  // Welke sections per workspace zijn open (kanbu/github/groups)
  expandedSections: Map<number, Set<string>>

  // Selected item voor keyboard nav (later)
  selectedItem: { type: 'workspace' | 'project' | 'group'; id: number } | null

  // Actions
  toggleWorkspace: (workspaceId: number) => void
  toggleSection: (workspaceId: number, section: string) => void
  setSelectedItem: (item: DashboardTreeState['selectedItem']) => void
  expandAll: () => void
  collapseAll: () => void

  // Bulk operations voor initial state
  setExpandedWorkspaces: (ids: number[]) => void
}

export const useDashboardTreeStore = create<DashboardTreeState>()(
  persist(
    (set, get) => ({
      expandedWorkspaces: new Set<number>(),
      expandedSections: new Map<number, Set<string>>(),
      selectedItem: null,

      toggleWorkspace: (workspaceId) => {
        set((state) => {
          const next = new Set(state.expandedWorkspaces)
          if (next.has(workspaceId)) {
            next.delete(workspaceId)
          } else {
            next.add(workspaceId)
          }
          return { expandedWorkspaces: next }
        })
      },

      toggleSection: (workspaceId, section) => {
        set((state) => {
          const nextMap = new Map(state.expandedSections)
          const sections = nextMap.get(workspaceId) ?? new Set<string>()
          const nextSections = new Set(sections)

          if (nextSections.has(section)) {
            nextSections.delete(section)
          } else {
            nextSections.add(section)
          }

          nextMap.set(workspaceId, nextSections)
          return { expandedSections: nextMap }
        })
      },

      setSelectedItem: (item) => set({ selectedItem: item }),

      expandAll: () => {
        // Implementatie na data fetch
      },

      collapseAll: () => {
        set({
          expandedWorkspaces: new Set(),
          expandedSections: new Map(),
        })
      },

      setExpandedWorkspaces: (ids) => {
        set({ expandedWorkspaces: new Set(ids) })
      },
    }),
    {
      name: 'kanbu-dashboard-tree',
      // Custom serialization voor Set en Map
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const { state } = JSON.parse(str)
          return {
            state: {
              ...state,
              expandedWorkspaces: new Set(state.expandedWorkspaces ?? []),
              expandedSections: new Map(
                Object.entries(state.expandedSections ?? {}).map(
                  ([k, v]) => [Number(k), new Set(v as string[])]
                )
              ),
            },
          }
        },
        setItem: (name, value) => {
          const serialized = {
            state: {
              ...value.state,
              expandedWorkspaces: Array.from(value.state.expandedWorkspaces),
              expandedSections: Object.fromEntries(
                Array.from(value.state.expandedSections.entries()).map(
                  ([k, v]) => [k, Array.from(v)]
                )
              ),
            },
          }
          localStorage.setItem(name, JSON.stringify(serialized))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
```

### Acceptatiecriteria

- [x] Store werkt met `useDashboardTreeStore()` hook
- [x] Expand/collapse state blijft behouden na page refresh
- [x] State wordt opgeslagen in localStorage
- [x] Geen errors bij lege initial state
- [x] TypeScript types correct

### Testing

| Type | Wat | Door |
|------|-----|------|
| Manual | Expand workspace, refresh, check still expanded | Robin |
| Manual | Collapse all, refresh, check still collapsed | Robin |
| Console | Check localStorage key `kanbu-dashboard-tree` | Robin |

### DO's

- ✅ Gebruik Zustand persist middleware
- ✅ Handle Set/Map serialization correct
- ✅ Provide TypeScript types voor alle state

### DON'Ts

- ❌ Geen Redux gebruiken (Zustand is lichter voor UI state)
- ❌ Geen server state in deze store (dat is tRPC/React Query)
- ❌ Geen project data opslaan (alleen expand/collapse IDs)

---

## 1.3 Basic Tree Rendering

**Status:** ✅ Complete

### Doel

Minimale tree component die data toont met expand/collapse.

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| WorkspaceTree | `apps/web/src/components/dashboard/WorkspaceTree.tsx` | Workspace node |
| ProjectNode | `apps/web/src/components/dashboard/ProjectNode.tsx` | Project item |
| TreeSection | `apps/web/src/components/dashboard/TreeSection.tsx` | Section header |

### Technische Details

**WorkspaceTree component:**

```typescript
// apps/web/src/components/dashboard/WorkspaceTree.tsx
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react'
import { useDashboardTreeStore } from '@/stores/dashboardTreeStore'
import { TreeSection } from './TreeSection'
import { ProjectNode } from './ProjectNode'
import { cn } from '@/lib/utils'

interface WorkspaceTreeProps {
  workspace: {
    id: number
    name: string
    slug: string
    kanbuProjects: Array<{
      id: number
      name: string
      identifier: string
      taskCount: number
    }>
    githubRepos: Array<{ id: number; name: string }>
    projectGroups: Array<{ id: number; name: string }>
  }
  collapsed?: boolean // Sidebar collapsed state
}

export function WorkspaceTree({ workspace, collapsed }: WorkspaceTreeProps) {
  const { expandedWorkspaces, toggleWorkspace } = useDashboardTreeStore()
  const isExpanded = expandedWorkspaces.has(workspace.id)

  return (
    <div className="select-none">
      {/* Workspace Header */}
      <button
        onClick={() => toggleWorkspace(workspace.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5',
          'hover:bg-accent text-sm font-medium',
          'focus:outline-none focus:ring-2 focus:ring-ring'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <Building2 className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <span className="truncate">{workspace.name}</span>
        )}
      </button>

      {/* Children - alleen tonen als expanded */}
      {isExpanded && !collapsed && (
        <div className="ml-4 border-l border-border pl-2">
          {/* Kanbu Projects Section */}
          {workspace.kanbuProjects.length > 0 && (
            <TreeSection
              workspaceId={workspace.id}
              section="kanbu"
              label="KANBU"
              count={workspace.kanbuProjects.length}
            >
              {workspace.kanbuProjects.map((project) => (
                <ProjectNode
                  key={project.id}
                  project={project}
                  workspaceSlug={workspace.slug}
                  type="kanbu"
                />
              ))}
            </TreeSection>
          )}

          {/* GitHub Section - Fase 3 */}
          {workspace.githubRepos.length > 0 && (
            <TreeSection
              workspaceId={workspace.id}
              section="github"
              label="GITHUB"
              count={workspace.githubRepos.length}
            >
              {/* GitHub nodes komen in Fase 3 */}
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {workspace.githubRepos.length} repos
              </div>
            </TreeSection>
          )}

          {/* Groups Section - Fase 4 */}
          {workspace.projectGroups.length > 0 && (
            <TreeSection
              workspaceId={workspace.id}
              section="groups"
              label="GROUPS"
              count={workspace.projectGroups.length}
            >
              {/* Group nodes komen in Fase 4 */}
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {workspace.projectGroups.length} groups
              </div>
            </TreeSection>
          )}
        </div>
      )}
    </div>
  )
}
```

**ProjectNode component:**

```typescript
// apps/web/src/components/dashboard/ProjectNode.tsx
import { Link } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectNodeProps {
  project: {
    id: number
    name: string
    identifier: string
    taskCount: number
  }
  workspaceSlug: string
  type: 'kanbu' | 'github'
}

export function ProjectNode({ project, workspaceSlug, type }: ProjectNodeProps) {
  const path = type === 'kanbu'
    ? `/workspace/${workspaceSlug}/project/${project.id}/board`
    : `/workspace/${workspaceSlug}/github/${project.id}/board`

  return (
    <Link
      to={path}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1',
        'text-sm hover:bg-accent',
        'focus:outline-none focus:ring-2 focus:ring-ring'
      )}
    >
      <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-blue-500" />
      <span className="truncate">{project.name}</span>
      {project.taskCount > 0 && (
        <span className="ml-auto text-xs text-muted-foreground">
          {project.taskCount}
        </span>
      )}
    </Link>
  )
}
```

**TreeSection component:**

```typescript
// apps/web/src/components/dashboard/TreeSection.tsx
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useDashboardTreeStore } from '@/stores/dashboardTreeStore'
import { cn } from '@/lib/utils'

interface TreeSectionProps {
  workspaceId: number
  section: 'kanbu' | 'github' | 'groups'
  label: string
  count: number
  children: React.ReactNode
}

export function TreeSection({
  workspaceId,
  section,
  label,
  count,
  children,
}: TreeSectionProps) {
  const { expandedSections, toggleSection } = useDashboardTreeStore()
  const sections = expandedSections.get(workspaceId)
  const isExpanded = sections?.has(section) ?? true // Default: expanded

  return (
    <div className="mt-1">
      <button
        onClick={() => toggleSection(workspaceId, section)}
        className={cn(
          'flex w-full items-center gap-1 py-0.5',
          'text-xs font-medium text-muted-foreground uppercase tracking-wider',
          'hover:text-foreground'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span>{label}</span>
        <span className="ml-auto text-muted-foreground">({count})</span>
      </button>

      {isExpanded && <div className="mt-0.5">{children}</div>}
    </div>
  )
}
```

### Acceptatiecriteria

- [x] Workspace nodes tonen naam en expand/collapse chevron
- [x] Klikken op workspace togglet children visibility
- [x] Sections (KANBU/GITHUB/GROUPS) zijn collapsible
- [x] Project nodes linken naar correcte board URL
- [x] Styling consistent met bestaande sidebar

### Testing

| Type | Wat | Door |
|------|-----|------|
| Visual | Tree toont workspaces en projecten | Robin |
| Interaction | Click workspace expands/collapses | Robin |
| Navigation | Click project navigeert naar board | Robin |
| Responsive | Werkt in collapsed sidebar mode | Robin |

### DO's

- ✅ Gebruik Tailwind classes consistent met bestaande code
- ✅ Gebruik `cn()` helper voor conditional classes
- ✅ Maak keyboard accessible (focus states)
- ✅ Gebruik semantic HTML (button, link)

### DON'Ts

- ❌ Geen inline styles
- ❌ Geen nieuwe icon library
- ❌ Geen hardcoded kleuren (gebruik Tailwind theme)
- ❌ Nog geen context menus (Fase 7)

---

## Fase 1 Afronding

### Checklist voor Fase 1 Compleet

- [x] `dashboard.getHierarchy` API werkt
- [x] Zustand store persistent in localStorage
- [x] Tree components renderen correct
- [x] ACL filtering werkt (user ziet alleen eigen data)
- [x] Geen TypeScript errors
- [x] Geen console errors

### Handover naar Fase 2

Na Fase 1 is klaar:
- API endpoint beschikbaar
- Store klaar voor gebruik
- Basis components bestaan

Fase 2 integreert deze in de bestaande DashboardSidebar.

---

# FASE 2: Core Tree Integration

**Status:** 🔄 In Progress (2026-01-10)
**Geschatte Effort:** Medium
**Dependencies:** Fase 1 compleet

## Doel

Integreer de tree components in de bestaande DashboardSidebar, vervang de flat list met de collapsible hiërarchie.

---

## 2.1 DashboardSidebar Refactor

**Status:** ✅ Complete

### Doel

Refactor `DashboardSidebar.tsx` om de nieuwe tree te gebruiken terwijl bestaande navigatie items behouden blijven.

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| Refactored sidebar | `apps/web/src/components/dashboard/DashboardSidebar.tsx` | Tree-based |
| PERSONAL sectie | Ingebouwd | Overview, My Tasks, etc. |
| WORKSPACES sectie | Ingebouwd | Tree hiërarchie |

### Technische Details

```typescript
// apps/web/src/components/dashboard/DashboardSidebar.tsx
import { trpc } from '@/lib/trpc'
import { useDashboardTreeStore } from '@/stores/dashboardTreeStore'
import { WorkspaceTree } from './WorkspaceTree'
import { NavLink } from 'react-router-dom'
import {
  Home,
  CheckSquare,
  ListChecks,
  StickyNote,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardSidebarProps {
  collapsed?: boolean
}

export function DashboardSidebar({ collapsed = false }: DashboardSidebarProps) {
  // Fetch hiërarchie data
  const { data, isLoading, error } = trpc.dashboard.getHierarchy.useQuery()

  // Personal nav items (bestaand)
  const personalItems = [
    { label: 'Overview', path: '/dashboard', icon: Home, exact: true },
    { label: 'My Tasks', path: '/dashboard/tasks', icon: CheckSquare },
    { label: 'My Subtasks', path: '/dashboard/subtasks', icon: ListChecks },
  ]

  return (
    <nav className="flex h-full flex-col gap-1 p-2">
      {/* PERSONAL Section */}
      <div className="mb-2">
        {!collapsed && (
          <div className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Personal
          </div>
        )}
        {personalItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                'hover:bg-accent',
                isActive && 'bg-accent font-medium'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Divider */}
      <div className="my-2 border-t border-border" />

      {/* WORKSPACES Section */}
      <div className="flex-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Workspaces
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="px-2 py-2 text-sm text-destructive">
            Failed to load workspaces
          </div>
        )}

        {data?.workspaces.map((workspace) => (
          <WorkspaceTree
            key={workspace.id}
            workspace={workspace}
            collapsed={collapsed}
          />
        ))}

        {data?.workspaces.length === 0 && !isLoading && (
          <div className="px-2 py-2 text-sm text-muted-foreground">
            No workspaces yet
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="my-2 border-t border-border" />

      {/* Notes (bestaand) */}
      <NavLink
        to="/dashboard/notes"
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
            'hover:bg-accent',
            isActive && 'bg-accent font-medium'
          )
        }
      >
        <StickyNote className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Notes</span>}
      </NavLink>
    </nav>
  )
}
```

### Acceptatiecriteria

- [x] Personal items (Overview, My Tasks, My Subtasks) werken nog
- [x] Workspaces tonen als collapsible tree
- [x] Loading state tijdens fetch
- [x] Error state bij API failure
- [x] Empty state als geen workspaces
- [ ] Collapsed mode toont alleen icons

### Testing

| Type | Wat | Door |
|------|-----|------|
| Visual | Sidebar toont tree structuur | Robin |
| Navigation | Alle links werken nog | Robin |
| Loading | Spinner tijdens load | Robin |
| Collapsed | Icons-only mode werkt | Robin (Ctrl+/) |

### DO's

- ✅ Behoud bestaande navigatie items
- ✅ Gebruik React Query loading/error states
- ✅ Scroll alleen workspaces sectie (overflow-y-auto)

### DON'Ts

- ❌ Verwijder geen bestaande functionaliteit
- ❌ Geen nieuwe routing
- ❌ Geen breaking changes voor andere componenten

---

## 2.2 Real-Time Updates

**Status:** 🔲 Todo

### Doel

Tree update live wanneer projecten worden toegevoegd/verwijderd.

### Technische Details

```typescript
// In DashboardSidebar.tsx
import { useSocket } from '@/hooks/useSocket'
import { useQueryClient } from '@tanstack/react-query'

function DashboardSidebar({ collapsed }: DashboardSidebarProps) {
  const queryClient = useQueryClient()

  // Real-time updates voor tree
  useSocket({
    onProjectCreated: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'getHierarchy'] })
    },
    onProjectUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'getHierarchy'] })
    },
    onProjectDeleted: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'getHierarchy'] })
    },
  })

  // ... rest of component
}
```

### Acceptatiecriteria

- [ ] Nieuw project verschijnt direct in tree
- [ ] Verwijderd project verdwijnt direct uit tree
- [ ] Geen full page refresh nodig
- [ ] Expand/collapse state blijft behouden na update

### Testing

| Type | Wat | Door |
|------|-----|------|
| Real-time | Maak project in ander tab, check tree update | Robin |
| State | Expand state blijft na real-time update | Robin |

---

## 2.3 Visual Polish

**Status:** 🔲 Todo

### Doel

Visuele verfijning: indentation, hover states, selected state.

### Deliverables

- [ ] Correcte indentation levels
- [ ] Hover states op alle items
- [ ] Active/selected state voor huidige pagina
- [ ] Smooth expand/collapse animatie

### Technische Details

```typescript
// Animatie voor expand/collapse
import { motion, AnimatePresence } from 'framer-motion'

// In WorkspaceTree.tsx
<AnimatePresence initial={false}>
  {isExpanded && !collapsed && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="ml-4 overflow-hidden border-l border-border pl-2"
    >
      {/* Children */}
    </motion.div>
  )}
</AnimatePresence>
```

### DO's

- ✅ Gebruik framer-motion (al geïnstalleerd)
- ✅ Keep animaties subtiel (< 200ms)

### DON'Ts

- ❌ Geen zware animaties
- ❌ Geen layout shifts

---

## Fase 2 Afronding

### Checklist voor Fase 2 Compleet

- [ ] DashboardSidebar toont tree hiërarchie
- [ ] Bestaande navigatie werkt nog
- [ ] Real-time updates werken
- [ ] Animaties smooth
- [ ] Geen regressies

### Handover naar Fase 3

Na Fase 2 is klaar:
- Werkende collapsible tree
- Kanbu projecten zichtbaar

Fase 3 voegt GitHub integratie toe.

---

# FASE 3: GitHub Integration

**Status:** 🔄 Partial (2026-01-10)
**Geschatte Effort:** Medium
**Dependencies:** Fase 2 compleet

## Doel

GitHub repositories als aparte sectie per workspace met sync status indicators.

---

## 3.1 GitHub Section

**Status:** ✅ Complete

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| GitHubRepoNode | `apps/web/src/components/dashboard/GitHubRepoNode.tsx` | Repo item |
| Sync status indicator | Ingebouwd | synced/pending/error/never |
| Git branch icon | Ingebouwd | GitBranch icon + sync status |

### Technische Details

```typescript
// apps/web/src/components/dashboard/GitHubProjectNode.tsx
import { Link } from 'react-router-dom'
import { Github, Check, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GitHubProjectNodeProps {
  repo: {
    id: number
    name: string
    fullName: string
    syncStatus: 'synced' | 'pending' | 'error' | 'never'
    projectId: number | null
  }
  workspaceSlug: string
}

const syncStatusConfig = {
  synced: { icon: Check, color: 'text-green-500', label: 'Synced' },
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Syncing...' },
  error: { icon: AlertCircle, color: 'text-red-500', label: 'Sync error' },
  never: { icon: null, color: 'text-muted-foreground', label: 'Not synced' },
}

export function GitHubProjectNode({ repo, workspaceSlug }: GitHubProjectNodeProps) {
  const status = syncStatusConfig[repo.syncStatus]
  const StatusIcon = status.icon

  // Link naar GitHub project page OF linked Kanbu project
  const path = repo.projectId
    ? `/workspace/${workspaceSlug}/project/${repo.projectId}/board`
    : `/workspace/${workspaceSlug}/github/${repo.id}`

  return (
    <Link
      to={path}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1',
        'text-sm hover:bg-accent group'
      )}
      title={`${repo.fullName} - ${status.label}`}
    >
      <Github className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{repo.name}</span>
      {StatusIcon && (
        <StatusIcon className={cn('ml-auto h-3 w-3 shrink-0', status.color)} />
      )}
    </Link>
  )
}
```

### Acceptatiecriteria

- [x] GitHub repos tonen onder "GITHUB" section
- [x] Sync status indicator zichtbaar
- [x] Link naar linked Kanbu project board (via projectIdentifier)
- [x] Visueel onderscheid van Kanbu projects (orange GitBranch icon)

### Testing

| Type | Wat | Door |
|------|-----|------|
| Visual | GitHub section toont repos | Robin |
| Status | Sync status icons correct | Robin |
| Navigation | Link werkt naar GitHub board | Robin |

---

## 3.2 API Uitbreiding

**Status:** 🔲 Todo

### Doel

`dashboard.getHierarchy` uitbreiden met meer GitHub details.

### Technische Details

API response al voorbereid in Fase 1. Hier alleen verfijning:

```typescript
// Extra velden voor GitHub repos
githubRepos: z.array(z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  owner: z.string(),
  syncStatus: z.enum(['synced', 'pending', 'error', 'never']),
  lastSyncAt: z.string().nullable(),
  projectId: z.number().nullable(),
  openIssueCount: z.number(),
  openPRCount: z.number(),
})),
```

---

## Fase 3 Afronding

### Checklist voor Fase 3 Compleet

- [ ] GitHub section per workspace
- [ ] Sync status indicators
- [ ] Links naar GitHub project pages
- [ ] Geen regressies op Kanbu projects

---

# FASE 4: Project Groups

**Status:** 📋 Planned
**Geschatte Effort:** Medium-High
**Dependencies:** Fase 3 compleet

## Doel

Project Groups als derde sectie per workspace. Database model bestaat al - alleen UI en API nodig.

---

## 4.1 Groups API

**Status:** 🔲 Todo

### Doel

tRPC procedures voor Project Groups (deels al in `group.ts`).

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| `projectGroup.list` | `apps/api/src/trpc/procedures/projectGroup.ts` | List groups |
| `projectGroup.create` | Zelfde | Create group |
| `projectGroup.addProject` | Zelfde | Add project to group |
| `projectGroup.getStats` | Zelfde | Gecombineerde stats |

### Technische Details

Onderzoek eerst wat al bestaat in `group.ts` - mogelijk overlap/hernoemen nodig.

---

## 4.2 Groups Section UI

**Status:** 🔲 Todo

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| ProjectGroupNode | `apps/web/src/components/dashboard/ProjectGroupNode.tsx` | Group item |
| Group color indicator | Ingebouwd | Colored dot |
| Project count badge | Ingebouwd | Aantal projecten |

---

## Fase 4 Afronding

### Checklist voor Fase 4 Compleet

- [ ] Groups section per workspace
- [ ] Groups tonen met kleuren
- [ ] Links naar group detail page
- [ ] Group CRUD werkt

---

# FASE 5: Personal Section

**Status:** 📋 Planned
**Geschatte Effort:** High
**Dependencies:** Fase 2 compleet (kan parallel met 3/4)

## Doel

Uitgebreide personal section met Home (widgets), Inbox, Today, Upcoming.

---

## 5.1 Home Page (Widgets)

**Status:** 🔲 Todo

### Doel

Widget-based dashboard homepage, personaliseerbaar per user.

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| WidgetGrid | `apps/web/src/components/dashboard/widgets/WidgetGrid.tsx` | Grid container |
| StatWidget | `apps/web/src/components/dashboard/widgets/StatWidget.tsx` | Stats card |
| TaskListWidget | `apps/web/src/components/dashboard/widgets/TaskListWidget.tsx` | Task preview |
| RecentActivityWidget | `apps/web/src/components/dashboard/widgets/RecentActivityWidget.tsx` | Activity feed |

### Technische Details

```typescript
// Widget system
interface Widget {
  id: string
  type: 'stats' | 'tasks' | 'activity' | 'calendar'
  position: { x: number; y: number }
  size: { w: number; h: number }
  config?: Record<string, unknown>
}

// User widget preferences stored in user metadata
interface WidgetPreferences {
  widgets: Widget[]
  layout: 'grid' | 'masonry'
}
```

---

## 5.2 Inbox (Notifications)

**Status:** 🔲 Todo

### Doel

Gecentraliseerde inbox voor alle notifications en mentions.

---

## 5.3 Smart Task Grouping

**Status:** 🔲 Todo

### Doel

My Tasks pagina met automatische grouping: Today, Upcoming, Overdue, No Due Date.

---

## 5.4 Today / Upcoming Views

**Status:** 🔲 Todo

### Doel

Focus views voor taken van vandaag en komende week.

---

# FASE 6: Favorites

**Status:** 📋 Planned
**Geschatte Effort:** Low-Medium
**Dependencies:** Fase 2 compleet

## Doel

Star/favorite systeem voor snel toegang tot veelgebruikte projecten.

---

## 6.1 Favorites API

**Status:** 🔲 Todo

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| favorites table | Prisma schema | User favorites |
| `favorites.list` | tRPC procedure | Get user favorites |
| `favorites.add` | tRPC procedure | Add favorite |
| `favorites.remove` | tRPC procedure | Remove favorite |

### Technische Details

```prisma
// schema.prisma
model UserFavorite {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  projectId Int      @map("project_id")
  order     Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")

  user    User    @relation(fields: [userId], references: [id])
  project Project @relation(fields: [projectId], references: [id])

  @@unique([userId, projectId])
  @@map("user_favorites")
}
```

---

## 6.2 Star/Unstar UI

**Status:** 🔲 Todo

### Doel

Star button op project nodes en in context menu.

---

## 6.3 Favorites Section

**Status:** 🔲 Todo

### Doel

Favorites sectie bovenaan sidebar, altijd zichtbaar.

---

# FASE 7: Polish & UX

**Status:** 📋 Planned
**Geschatte Effort:** High
**Dependencies:** Alle vorige fases

## Doel

Keyboard navigation, context menus, search, drag & drop.

---

## 7.1 Keyboard Navigation

**Status:** 🔲 Todo

### Deliverables

| Shortcut | Actie |
|----------|-------|
| `↑` / `↓` | Navigeer items |
| `←` / `→` | Collapse / Expand |
| `Enter` | Open geselecteerd item |
| `Space` | Toggle expand |
| `/` | Focus search |
| `g h` | Go to Home |
| `g t` | Go to My Tasks |

### Technische Details

```typescript
// useTreeKeyboardNav hook
function useTreeKeyboardNav() {
  const { selectedItem, setSelectedItem } = useDashboardTreeStore()
  const items = useTreeItems() // Flatten tree to array

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alleen als sidebar focus heeft
      if (!document.activeElement?.closest('[data-dashboard-tree]')) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          // Move to previous item
          break
        case 'ArrowDown':
          e.preventDefault()
          // Move to next item
          break
        case 'ArrowLeft':
          e.preventDefault()
          // Collapse current
          break
        case 'ArrowRight':
          e.preventDefault()
          // Expand current
          break
        case 'Enter':
          e.preventDefault()
          // Navigate to selected
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem, items])
}
```

---

## 7.2 Context Menus

**Status:** 🔲 Todo

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| TreeContextMenu | `apps/web/src/components/dashboard/TreeContextMenu.tsx` | Radix context menu |
| Workspace actions | Ingebouwd | New project, settings, etc. |
| Project actions | Ingebouwd | Open, favorite, archive, etc. |

### Technische Details

```typescript
// Gebruik @radix-ui/react-context-menu
import * as ContextMenu from '@radix-ui/react-context-menu'

function ProjectNode({ project, workspaceSlug }: Props) {
  const { canWrite, canDelete, canManagePermissions } = useProjectAcl(project.id)

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <Link to={...}>...</Link>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content>
          <ContextMenu.Item>Open Board</ContextMenu.Item>
          <ContextMenu.Item>Open in New Tab</ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item>Add to Favorites</ContextMenu.Item>
          {canWrite && <ContextMenu.Item>Add to Group</ContextMenu.Item>}
          <ContextMenu.Separator />
          {canManagePermissions && <ContextMenu.Item>Settings</ContextMenu.Item>}
          {canDelete && (
            <ContextMenu.Item className="text-destructive">
              Archive
            </ContextMenu.Item>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
```

### DO's

- ✅ ACL check op elke actie
- ✅ Gebruik Radix UI (al in project)

### DON'Ts

- ❌ Geen acties zonder permission check
- ❌ Geen custom context menu implementation

---

## 7.3 Search/Filter

**Status:** 🔲 Todo

### Doel

Quick filter in sidebar om projecten te vinden.

### Technische Details

```typescript
// Local filter - geen API call nodig
const [filter, setFilter] = useState('')

const filteredWorkspaces = useMemo(() => {
  if (!filter) return workspaces

  return workspaces.map(ws => ({
    ...ws,
    kanbuProjects: ws.kanbuProjects.filter(p =>
      p.name.toLowerCase().includes(filter.toLowerCase())
    ),
    githubRepos: ws.githubRepos.filter(r =>
      r.name.toLowerCase().includes(filter.toLowerCase())
    ),
    projectGroups: ws.projectGroups.filter(g =>
      g.name.toLowerCase().includes(filter.toLowerCase())
    ),
  })).filter(ws =>
    ws.kanbuProjects.length > 0 ||
    ws.githubRepos.length > 0 ||
    ws.projectGroups.length > 0
  )
}, [workspaces, filter])
```

---

## 7.4 Drag & Drop

**Status:** 🔲 Todo

### Doel

Herordenen van favorites en projecten binnen groups.

### Technische Details

```typescript
// Gebruik @dnd-kit
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
```

### DON'Ts

- ❌ Geen drag & drop voor workspace ordering (te complex, low value)
- ❌ Geen cross-workspace drag (niet logisch)

---

# Algemene Regels

## Alle Fases

### DO's

- ✅ Gebruik bestaande hooks (`useAclPermission`, `useSocket`, etc.)
- ✅ Volg bestaande code patterns
- ✅ TypeScript strict mode
- ✅ Test met Robin na elke sub-fase
- ✅ Update deze roadmap bij afronding
- ✅ Commit kleine, atomische changes

### DON'Ts

- ❌ GEEN nieuwe dependencies zonder overleg
- ❌ GEEN breaking changes aan bestaande APIs
- ❌ GEEN hardcoded IDs of strings
- ❌ GEEN offline-first patterns
- ❌ GEEN ACL bypass
- ❌ GEEN console.log in productie code
- ❌ GEEN any types

## Testing Protocol

Na elke sub-fase:

1. **Automated tests** (indien van toepassing)
2. **Robin test visueel** - Ziet het er goed uit?
3. **Robin test functioneel** - Werkt het correct?
4. **Robin test ACL** - Ziet user alleen eigen data?
5. **Check console** - Geen errors?
6. **Check network** - Geen onnodige requests?

---

## Referenties

- [VISIE.md](./VISIE.md) - Design principes
- [IDEAAL-DASHBOARD-ONTWERP.md](./IDEAAL-DASHBOARD-ONTWERP.md) - Volledig ontwerp
- [HUIDIGE-STAAT.md](./HUIDIGE-STAAT.md) - Bestaande code analyse
- [../Github-projects/VISIE.md](../Github-projects/VISIE.md) - GitHub integratie
