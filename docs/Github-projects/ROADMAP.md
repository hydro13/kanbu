# GitHub Module Roadmap

## Versie: 1.0.0
## Datum: 2026-01-10
## Status: Active

---

## Overzicht

Deze roadmap beschrijft de fases om 100% Feature Parity met GitHub Projects te bereiken.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  FASE 1        FASE 2        FASE 3        FASE 4        FASE 5    │
│  ──────        ──────        ──────        ──────        ──────    │
│                                                                     │
│  Workspace     Board         Complete      Bi-direc-     Advanced  │
│  Integratie    View          UI            tioneel       Features  │
│                                                                     │
│  ▓▓▓▓▓▓▓▓▓▓    ░░░░░░░░░░    ░░░░░░░░░░    ░░░░░░░░░░    ░░░░░░░░░░│
│  IN PROGRESS   PLANNED       PLANNED       PLANNED       PLANNED   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Workspace Integratie

**Status:** 🔄 In Progress

**Doel:** GitHub repositories zichtbaar maken als aparte projecten in de workspace.

### Deliverables

| Item | Status | Beschrijving |
|------|--------|--------------|
| GitHubRepository.workspaceId | 🔲 Todo | Directe koppeling aan workspace |
| Database migratie | 🔲 Todo | Schema aanpassen voor workspaceId |
| Workspace API uitbreiden | 🔲 Todo | Endpoint voor GitHub projecten |
| Workspace UI splitsen | 🔲 Todo | Twee secties: Intern + GitHub |
| GitHub project cards | 🔲 Todo | Card design voor repo's |
| Navigatie naar GitHub project | 🔲 Todo | Routes opzetten |

### Technische Details

```
Workspace "Mijn Bedrijf"
├── 📁 Interne Projecten
│   └── (bestaande project lijst)
│
└── 🐙 GitHub Projecten
    └── (repositories in deze workspace)
```

**Database wijziging:**
```prisma
model GitHubRepository {
  // Bestaande velden...
  workspaceId  Int?
  workspace    Workspace? @relation(fields: [workspaceId], references: [id])
}
```

### Acceptatiecriteria

- [ ] GitHub repos verschijnen in workspace sidebar
- [ ] Duidelijk visueel onderscheid (GitHub icoon)
- [ ] Klikken opent GitHub project pagina
- [ ] Sync status zichtbaar per repo

---

## Fase 2: Board View

**Status:** 📋 Planned

**Doel:** Een werkende Kanban board voor GitHub issues.

### Deliverables

| Item | Status | Beschrijving |
|------|--------|--------------|
| Route structuur | 🔲 Todo | `/workspace/:slug/github/:repoId` |
| GitHubProjectPage | 🔲 Todo | Container component |
| Board layout | 🔲 Todo | Kolommen met issues |
| Issue cards | 🔲 Todo | Compacte issue weergave |
| Kolom configuratie | 🔲 Todo | Via labels/status |
| Basis drag & drop | 🔲 Todo | Issues verplaatsen |

### Kolom Strategieën

**Optie A: Label-based (aanbevolen)**
```
[Backlog]     [Todo]        [In Progress]  [Done]
status:       status:       status:        status:
backlog       todo          in-progress    done
```

**Optie B: Milestone-based**
```
[No Milestone]  [v1.0]       [v1.1]        [v2.0]
```

**Optie C: Assignee-based**
```
[Unassigned]   [Robin]      [Jan]         [Piet]
```

### Acceptatiecriteria

- [ ] Board toont alle open issues
- [ ] Issues gegroepeerd in kolommen
- [ ] Issue card toont: title, labels, assignee, comments count
- [ ] Drag & drop verplaatst issue (label update)
- [ ] Real-time sync met GitHub

---

## Fase 3: Complete UI

**Status:** 📋 Planned

**Doel:** Alle views en interacties die GitHub Projects heeft.

### Deliverables

| Item | Status | Beschrijving |
|------|--------|--------------|
| List View | 🔲 Todo | Issues als lijst |
| Table View | 🔲 Todo | Spreadsheet-achtige weergave |
| Filters | 🔲 Todo | Label, assignee, milestone filters |
| Search | 🔲 Todo | Zoeken in issues |
| Keyboard shortcuts | 🔲 Todo | `j/k` navigatie, `c` create, etc. |
| Bulk acties | 🔲 Todo | Meerdere issues selecteren/wijzigen |
| Issue detail panel | 🔲 Todo | Side panel met volledige issue |
| Comment thread | 🔲 Todo | Comments lezen/schrijven |
| Milestones view | 🔲 Todo | Milestone overzicht |
| PR tab | 🔲 Todo | Pull requests overzicht |

### Keyboard Shortcuts (GitHub Parity)

| Shortcut | Actie |
|----------|-------|
| `j` / `k` | Volgende / vorige issue |
| `o` / `Enter` | Open issue detail |
| `c` | Create new issue |
| `x` | Select issue |
| `e` | Edit issue |
| `/` | Focus search |
| `?` | Show shortcuts |

### Views Vergelijking

| Feature | GitHub | Kanbu Status |
|---------|--------|--------------|
| Board view | ✅ | 🔲 Fase 2 |
| List view | ✅ | 🔲 Fase 3 |
| Table view | ✅ | 🔲 Fase 3 |
| Roadmap view | ✅ | 🔲 Future |

### Acceptatiecriteria

- [ ] Alle drie views werken (Board, List, Table)
- [ ] Filters persisteren in URL
- [ ] Keyboard navigatie volledig
- [ ] Bulk acties werken
- [ ] Comments kunnen worden gelezen en geschreven

---

## Fase 4: Bi-directionele Sync

**Status:** 📋 Planned

**Doel:** Wijzigingen in Kanbu worden gepusht naar GitHub.

### Deliverables

| Item | Status | Beschrijving |
|------|--------|--------------|
| Issue create → GitHub | 🔲 Todo | Nieuwe issues aanmaken |
| Issue update → GitHub | 🔲 Todo | Title, body, state wijzigen |
| Issue move → GitHub | 🔲 Todo | Labels updaten bij drag |
| Comment create → GitHub | 🔲 Todo | Comments posten |
| Milestone update → GitHub | 🔲 Todo | Milestone wijzigingen |
| Conflict detection | 🔲 Todo | Timestamp vergelijking |
| Retry mechanisme | 🔲 Todo | Bij tijdelijke failures |
| Sync status UI | 🔲 Todo | Pending/synced/error indicators |

### Sync Flow

```
┌─────────────┐          ┌─────────────┐
│   KANBU     │          │   GITHUB    │
│             │          │             │
│  Issue      │─────────▶│  Issue      │
│  wijzigen   │   API    │  updated    │
│             │          │             │
│  Webhook    │◀─────────│  Confirm    │
│  ontvangen  │          │             │
└─────────────┘          └─────────────┘
```

### Acceptatiecriteria

- [ ] Issue aanmaken in Kanbu → verschijnt in GitHub
- [ ] Issue wijzigen in Kanbu → wijzigt in GitHub
- [ ] Issue sluiten in Kanbu → sluit in GitHub
- [ ] Comment schrijven in Kanbu → verschijnt in GitHub
- [ ] Conflict warning bij gelijktijdige edits

---

## Fase 5: Advanced Features

**Status:** 📋 Planned

**Doel:** Kanbu-specifieke features die GitHub niet heeft.

### Deliverables

| Item | Status | Beschrijving |
|------|--------|--------------|
| Project Groepen | 🔲 Todo | Combineer intern + GitHub projecten |
| Cross-project dependencies | 🔲 Todo | Link issues tussen projecten |
| Gecombineerde statistieken | 🔲 Todo | Velocity over meerdere repos |
| Custom fields | 🔲 Todo | Extra velden (Kanbu-only) |
| Time tracking | 🔲 Todo | Uren registreren (Kanbu-only) |
| Portfolio view | 🔲 Todo | Overzicht alle projecten |

### Project Groepen

```
Groep "Frontend Team"
├── 🐙 webapp-frontend (GitHub)
├── 🐙 component-lib (GitHub)
└── 📁 design-specs (Kanbu intern)

→ Gecombineerde velocity
→ Gecombineerde burndown
→ Cross-project dependencies zichtbaar
```

### Acceptatiecriteria

- [ ] Project groepen aanmaken met beide types
- [ ] Gecombineerde statistieken per groep
- [ ] Dependencies tussen projecten visualiseren
- [ ] Custom fields toevoegen aan GitHub issues (Kanbu-only)

---

## Prioriteiten

### Must Have (Fase 1-2)
- GitHub repos in workspace
- Basis board view
- Issue cards met drag & drop

### Should Have (Fase 3)
- Alle views (Board, List, Table)
- Filters en search
- Keyboard shortcuts

### Could Have (Fase 4)
- Bi-directionele sync
- Conflict detection

### Won't Have (Now)
- GitLab/Bitbucket support
- GitHub Actions integration

---

## Risico's en Mitigaties

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| GitHub API rate limits | Medium | Caching, batch requests |
| Sync conflicts | High | Timestamp-based resolution, UI warnings |
| Webhook reliability | Medium | Periodic full sync als fallback |
| Performance bij veel issues | Medium | Pagination, virtual scrolling |

---

## Definities

- **GitHub Module:** De aparte sectie in Kanbu voor GitHub projecten
- **Feature Parity:** Exact dezelfde functionaliteit als GitHub Projects
- **Bi-directioneel:** Wijzigingen gaan beide kanten op
- **Project Groep:** Verzameling van zowel interne als GitHub projecten

---

## Referenties

- [VISIE.md](./VISIE.md) - De overkoepelende visie
- [IMPLEMENTATIE-PLAN.md](./IMPLEMENTATIE-PLAN.md) - Technische details
- [GitHub Projects Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
