# Dashboard Roadmap

## Versie: 1.0.0
## Datum: 2026-01-10
## Status: Active

---

## Overzicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  FASE 1        FASE 2        FASE 3        FASE 4                  │
│  ──────        ──────        ──────        ──────                  │
│                                                                     │
│  Tree          GitHub        Project       Polish                   │
│  Sidebar       Sectie        Groups        & UX                     │
│                                                                     │
│  ░░░░░░░░░░    ░░░░░░░░░░    ░░░░░░░░░░    ░░░░░░░░░░              │
│  PLANNED       PLANNED       PLANNED       PLANNED                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Tree Sidebar

**Status:** 📋 Planned

**Doel:** Collapsible workspace/project hiërarchie in de dashboard sidebar.

### Deliverables

| Item | Status | Beschrijving |
|------|--------|--------------|
| `WorkspaceTree` component | 🔲 Todo | Collapsible workspace node |
| `ProjectNode` component | 🔲 Todo | Project item in tree |
| `CollapsiblePanel` component | 🔲 Todo | Generieke expand/collapse |
| Tree state management | 🔲 Todo | Zustand store + localStorage |
| Dashboard sidebar refactor | 🔲 Todo | Van flat naar tree |
| API: workspace hierarchy | 🔲 Todo | Projecten per workspace |

### Technische Details

**Component Structuur:**
```tsx
<DashboardSidebar>
  <NavItem icon="home" label="Overview" />
  <NavItem icon="tasks" label="My Tasks" />
  <NavItem icon="subtasks" label="My Subtasks" />

  <Divider />

  <SectionHeader label="WORKSPACES" />
  {workspaces.map(ws => (
    <WorkspaceTree key={ws.id} workspace={ws}>
      <TreeSection label="KANBU" icon="kanban">
        {ws.projects.map(p => (
          <ProjectNode key={p.id} project={p} />
        ))}
      </TreeSection>
    </WorkspaceTree>
  ))}
</DashboardSidebar>
```

**State Management:**
```typescript
// stores/dashboardTreeStore.ts
const useDashboardTree = create<DashboardTreeState>((set) => ({
  expandedWorkspaces: new Set<number>(),
  toggleWorkspace: (id) => set(state => {
    const next = new Set(state.expandedWorkspaces)
    next.has(id) ? next.delete(id) : next.add(id)
    return { expandedWorkspaces: next }
  }),
}))
```

### Acceptatiecriteria

- [ ] Workspaces kunnen open/dicht geklapt worden
- [ ] Projecten verschijnen onder hun workspace
- [ ] Expand/collapse state blijft behouden na refresh
- [ ] Klikken op project navigeert naar project board
- [ ] Geselecteerde item is visueel highlighted

---

## Fase 2: GitHub Sectie

**Status:** 📋 Planned

**Doel:** GitHub projecten als aparte sectie per workspace.

### Deliverables

| Item | Status | Beschrijving |
|------|--------|--------------|
| GitHub sectie in tree | 🔲 Todo | Apart van Kanbu projecten |
| `ProjectTypeIcon` component | 🔲 Todo | Kanbu vs GitHub icoon |
| GitHub project route | 🔲 Todo | `/workspace/:slug/github/:repoId` |
| API: workspace repos | 🔲 Todo | GitHub repos per workspace |
| Visueel onderscheid | 🔲 Todo | Kleuren en iconen |

### Technische Details

**Tree Structuur:**
```tsx
<WorkspaceTree workspace={ws}>
  <TreeSection label="KANBU" icon="kanban" color="blue">
    {ws.projects.map(p => <ProjectNode ... />)}
  </TreeSection>

  <TreeSection label="GITHUB" icon="github" color="gray">
    {ws.githubRepos.map(r => <GitHubProjectNode ... />)}
  </TreeSection>
</WorkspaceTree>
```

**Route:**
```typescript
// App.tsx
<Route
  path="/workspace/:slug/github/:repoId/*"
  element={<GitHubProjectPage />}
/>
```

### Acceptatiecriteria

- [ ] GitHub projecten hebben eigen sectie per workspace
- [ ] Duidelijk visueel verschil met Kanbu projecten
- [ ] Klikken opent GitHub project board
- [ ] Sync status indicator per repo

---

## Fase 3: Project Groups

**Status:** 📋 Planned

**Doel:** Project Groups UI en functionaliteit.

### Deliverables

| Item | Status | Beschrijving |
|------|--------|--------------|
| Groups sectie in tree | 🔲 Todo | Folder-achtige weergave |
| `ProjectGroupNode` component | 🔲 Todo | Group item in tree |
| Group detail pagina | 🔲 Todo | Gecombineerde stats |
| Group CRUD API | 🔲 Todo | Create/update/delete |
| Add project to group | 🔲 Todo | Beide types projecten |

### Technische Details

**API Endpoints:**
```typescript
projectGroup.list(workspaceId) => ProjectGroup[]
projectGroup.create({ workspaceId, name, color }) => ProjectGroup
projectGroup.addProject(groupId, projectId) => void
projectGroup.addGitHubRepo(groupId, repoId) => void
projectGroup.getStats(groupId) => GroupStats
```

**Tree Structuur:**
```tsx
<TreeSection label="GROUPS" icon="folder" color="yellow">
  {ws.groups.map(g => (
    <ProjectGroupNode key={g.id} group={g}>
      {g.projects.map(p => <ProjectNode mini ... />)}
    </ProjectGroupNode>
  ))}
</TreeSection>
```

### Acceptatiecriteria

- [ ] Project Groups zichtbaar in tree
- [ ] Groep kan Kanbu én GitHub projecten bevatten
- [ ] Groep detail toont gecombineerde statistieken
- [ ] CRUD operaties werken

---

## Fase 4: Polish & UX

**Status:** 📋 Planned

**Doel:** Verfijning en extra features.

### Basis Aanwezig (in ontwikkeling)

Kanbu heeft deze features in verschillende stadia:
- 🔶 **Collapsible sidebar** - `Ctrl + /` (basis)
- 🔶 **Command palette** - `Ctrl + K` (basis)
- 🔶 **Keyboard shortcuts** - Niet compleet

### Deliverables (Tree-specifiek)

| Item | Status | Beschrijving |
|------|--------|--------------|
| Tree keyboard navigatie | 🔲 Todo | Pijltjes in workspace tree |
| Context menu | 🔲 Todo | Rechtermuisklik acties |
| Drag & drop ordering | 🔲 Todo | Projecten/workspaces ordenen |
| Search/filter in tree | 🔲 Todo | Snel projecten vinden in sidebar |
| Responsive design | 🔲 Todo | Mobile sidebar |
| Loading states | 🔲 Todo | Skeletons |

### Keyboard Shortcuts (Tree-specifiek)

| Shortcut | Actie |
|----------|-------|
| `↑` / `↓` | Navigeer items |
| `←` / `→` | Collapse / Expand |
| `Enter` | Open geselecteerd item |
| `Space` | Toggle expand |
| `/` | Focus search |

### Context Menu Items

**Workspace:**
- New Kanbu Project
- Link GitHub Repository
- New Project Group
- Workspace Settings

**Project:**
- Open Board
- Open in new tab
- Add to Group
- Settings
- Archive

### Acceptatiecriteria

- [ ] Volledig keyboard navigeerbaar
- [ ] Context menu op alle items
- [ ] Smooth drag & drop
- [ ] Search filtert real-time
- [ ] Geen janky animaties

---

## Dependencies

### Fase 1 heeft nodig:
- Bestaande workspace API
- Bestaande project API
- Zustand (al geïnstalleerd)

### Fase 2 heeft nodig:
- Fase 1 compleet
- GitHubRepository.workspaceId (of query via Project)
- GitHub project page component

### Fase 3 heeft nodig:
- Fase 2 compleet
- ProjectGroup tRPC procedures
- ProjectGroupMember tRPC procedures

### Fase 4 heeft nodig:
- Fase 1-3 compleet
- DnD library (react-dnd of @dnd-kit)

---

## Componenten Overzicht

### Nieuwe Componenten (Fase 1-4)

```
components/
├── dashboard/
│   ├── DashboardSidebar.tsx        # Fase 1
│   ├── WorkspaceTree.tsx           # Fase 1
│   ├── ProjectNode.tsx             # Fase 1
│   ├── TreeSection.tsx             # Fase 1
│   ├── GitHubProjectNode.tsx       # Fase 2
│   ├── ProjectGroupNode.tsx        # Fase 3
│   └── TreeContextMenu.tsx         # Fase 4
│
├── shared/
│   ├── CollapsiblePanel.tsx        # Fase 1
│   ├── ProjectTypeIcon.tsx         # Fase 2
│   └── TreeView.tsx                # Fase 1
│
└── stores/
    └── dashboardTreeStore.ts       # Fase 1
```

---

## API Overzicht

### Nieuwe/Aangepaste Endpoints

| Fase | Endpoint | Beschrijving |
|------|----------|--------------|
| 1 | `workspace.getHierarchy` | Workspace + projects |
| 2 | `github.listWorkspaceRepos` | GitHub repos per workspace |
| 3 | `projectGroup.list` | Groups per workspace |
| 3 | `projectGroup.create` | Nieuwe group |
| 3 | `projectGroup.addProject` | Project aan group |
| 3 | `projectGroup.getStats` | Gecombineerde stats |

---

## Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Performance bij veel workspaces | Medium | Lazy loading, virtualization |
| Complexe state management | Medium | Zustand + localStorage |
| Sidebar te breed | Low | Collapsible sidebar |
| Mobile UX | Medium | Drawer pattern op mobile |

---

## Success Metrics

- [ ] Navigatie naar project < 2 clicks
- [ ] Sidebar laadt < 500ms
- [ ] Expand/collapse < 100ms (perceived)
- [ ] Geen layout shifts
- [ ] Keyboard navigatie volledig

---

## Referenties

- [VISIE.md](./VISIE.md) - Dashboard visie
- [HUIDIGE-STAAT.md](./HUIDIGE-STAAT.md) - Analyse huidige implementatie
- [../Github-projects/VISIE.md](../Github-projects/VISIE.md) - GitHub integratie visie
