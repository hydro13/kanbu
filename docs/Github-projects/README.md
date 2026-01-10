# GitHub Projects Documentatie

Deze map bevat de visie en implementatie documentatie voor de GitHub integratie in Kanbu.

## Documenten

| Document | Beschrijving |
|----------|--------------|
| [VISIE.md](./VISIE.md) | De overkoepelende visie voor GitHub integratie - **LEES DIT EERST** |
| [ROADMAP.md](./ROADMAP.md) | Fasering en deliverables per fase |
| [IMPLEMENTATIE-PLAN.md](./IMPLEMENTATIE-PLAN.md) | Technisch implementatie plan met stappen en code voorbeelden |

## Kernboodschap

> **Kanbu is de orchestratielaag bovenop GitHub.**

- GitHub blijft de "source of truth" voor code-gerelateerde items
- Kanbu voegt waarde toe: workspaces, project groepen, cross-project features
- Bi-directionele sync zorgt dat gebruikers kunnen werken waar ze willen
- Geen vendor lock-in - data leeft in beide systemen

---

## 🎯 EERSTE GROTE MILESTONE

### 100% Feature Parity met GitHub Projects

**Doel:** Bouw binnen Kanbu een complete 1-op-1 replica van GitHub Projects.

Alles wat GitHub Projects kan, moet Kanbu ook kunnen:
- ✅ Board views (Kanban)
- ✅ List views
- ✅ Table views
- ✅ Issues beheren
- ✅ Milestones beheren
- ✅ Labels en filters
- ✅ Keyboard shortcuts
- ✅ Drag & drop
- ✅ Bulk acties
- ✅ Alle layouts

**Waarom eerst 1-op-1?**

1. **Feature Parity** - Gebruikers stappen naadloos over
2. **Leren** - GitHub is bewezen door miljoenen gebruikers
3. **Referentie** - Beste features overnemen naar Kanbu's interne module

---

## Architectuur

### Twee Project Modules in een Workspace

```
Workspace
├── 📁 Interne Projecten (Kanbu Module)
│   └── Bestaande Kanbu structuur
│
└── 🐙 GitHub Projecten (GitHub Module)
    └── 1-op-1 met GitHub Projects
```

### Twee Soorten Projecten

1. **Interne Kanbu Projecten** - eigen structuur, geen externe sync
2. **GitHub Projecten** - volgt GitHub's structuur, bi-directionele sync

### GitHub Module Entiteiten

| GitHub | Kanbu Tabel | Sync |
|--------|-------------|------|
| Repository | GitHubRepository | ↔️ |
| Issue | GitHubIssue | ↔️ |
| Milestone | GitHubMilestone | ↔️ |
| Pull Request | GitHubPullRequest | ← (read-only) |
| Commit | GitHubCommit | ← (read-only) |
| Comment | GitHubComment | ↔️ |

### Wat NIET Synchroniseert (Kanbu-only)

- Workspaces
- Project Groepen
- Interne Kanbu projecten
- Cross-project dependencies

## Voor Ontwikkelaars

Als je aan de GitHub integratie werkt:

1. Lees eerst [VISIE.md](./VISIE.md) voor het waarom
2. Check [IMPLEMENTATIE-PLAN.md](./IMPLEMENTATIE-PLAN.md) voor de huidige status
3. Volg de sync patronen die al bestaan
4. Log altijd in `GitHubSyncLog`

## Contact

Bij vragen over de visie of implementatie, overleg met Robin Waslander.
