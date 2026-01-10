# Dashboard Documentatie

Deze map bevat de visie en implementatie documentatie voor het Kanbu Dashboard.

## Documenten

| Document | Beschrijving |
|----------|--------------|
| [VISIE.md](./VISIE.md) | De overkoepelende visie voor het dashboard - **LEES DIT EERST** |
| [CONCURRENTIE-ANALYSE.md](./CONCURRENTIE-ANALYSE.md) | Analyse van 9 PM tools (Jira, Linear, Notion, etc.) |
| [HUIDIGE-STAAT.md](./HUIDIGE-STAAT.md) | Analyse van de huidige implementatie |
| [ROADMAP.md](./ROADMAP.md) | Fasering en deliverables per fase |

## Kernboodschap

> **Het Dashboard is de cockpit van de gebruiker.**

- Eén plek voor al je workspaces, projecten en taken
- Hiërarchische navigatie zoals een file systeem
- Duidelijk onderscheid tussen Kanbu projecten en GitHub projecten
- Project Groepen voor gecombineerde overzichten

---

## Gewenste Structuur

```
Dashboard
├── 📊 Overview (persoonlijke stats)
│
├── 📁 Workspaces (collapsible tree)
│   │
│   ├── 🏢 Workspace A ▼
│   │   ├── 📋 Kanbu Projects
│   │   │   └── 📋 Internal Planning
│   │   ├── 🐙 GitHub Projects
│   │   │   └── 🐙 webapp-frontend
│   │   └── 📂 Project Groups
│   │       └── 📂 Frontend Team
│   │
│   └── 🏢 Workspace B ▶ (collapsed)
│
├── ✅ My Tasks
├── ✅ My Subtasks
│
└── 📝 Sticky Notes
```

## Belangrijke Concepten

### Collapsible Hiërarchie
Net zoals folders in een file systeem kunnen workspaces, project categorieën en projecten open/dicht geklapt worden.

### Visueel Onderscheid
- 📋 Kanbu projecten - blauw/standaard icoon
- 🐙 GitHub projecten - GitHub icoon, aparte kleur
- 📂 Project Groepen - folder icoon

### Project Groepen
Verzamelingen van projecten (zowel Kanbu als GitHub) voor gecombineerde statistieken en overzichten.

---

## Context

Kanbu is 1 week oud en in actieve ontwikkeling. Het huidige dashboard is functioneel maar basis. Deze documentatie beschrijft waar we naartoe werken.

## Contact

Bij vragen over de visie of implementatie, overleg met Robin Waslander.
