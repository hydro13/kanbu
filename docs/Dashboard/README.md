# Dashboard Documentatie

Deze map bevat de complete visie, architectuur en implementatie roadmap voor het Kanbu Dashboard.

**Doelstelling:** Implementatie van "Claude's Planner" - een ideaal dashboard ontwerp gebaseerd op best practices van 9 PM tools, aangepast aan Kanbu's real-time multi-user architectuur.

---

## Documenten

| Document | Beschrijving | Leesvolgorde |
|----------|--------------|--------------|
| [VISIE.md](./VISIE.md) | Overkoepelende visie en design principes | 1. Eerst lezen |
| [IDEAAL-DASHBOARD-ONTWERP.md](./IDEAAL-DASHBOARD-ONTWERP.md) | Claude's Planner - het volledige ideale ontwerp | 2. Referentie |
| [HUIDIGE-STAAT.md](./HUIDIGE-STAAT.md) | Analyse van bestaande implementatie | 3. Begrip huidige staat |
| [CONCURRENTIE-ANALYSE.md](./CONCURRENTIE-ANALYSE.md) | Analyse van 10 PM tools (incl. Claude's Planner) | 4. Achtergrond |
| [ROADMAP.md](./ROADMAP.md) | **IMPLEMENTATIE GIDS** - Gedetailleerde fases | 5. **Werk hiermee** |

---

## Kernboodschap

> **Het Dashboard is de cockpit van de gebruiker - gebouwd voor real-time multi-user samenwerking.**

### Wat We Bouwen

```
Dashboard Sidebar (Claude's Planner model)
├── 🏠 Home (widget-based, personaliseerbaar)
├── 📥 Inbox (notificaties + mentions)
├── ✅ My Tasks (smart grouping: Today/Upcoming/Overdue)
├── 📅 Today (focus view)
│
├── ⭐ FAVORITES
│   └── Gepinde projecten (cross-workspace)
│
├── 📁 WORKSPACES (collapsible tree)
│   ├── 🏢 Workspace A ▼
│   │   ├── 📋 KANBU
│   │   │   └── Project 1
│   │   ├── 🐙 GITHUB
│   │   │   └── repo-name
│   │   └── 📂 GROUPS
│   │       └── Team Alpha
│   │
│   └── 🏢 Workspace B ▶ (collapsed)
│
├── 📝 Notes
└── ⚙️ Settings
```

---

## Architectuur Constraints

### MOET Respecteren

| Constraint | Reden |
|------------|-------|
| **Real-time multi-user** | Socket.io + Redis adapter, GEEN offline-first |
| **ACL overal** | Elk menu item, elke actie via RWXDP permissions |
| **BaseLayout pattern** | Bestaande collapsible/resizable sidebar |
| **tRPC procedures** | Consistente API patterns |
| **Docker + SaaS** | Multi-server deployment met Redis |
| **LDAP sync (gepland)** | ACL is voorbereid op externe identity providers |

### MAG NIET Doen

| Verboden | Waarom |
|----------|--------|
| Offline-first implementeren | Conflicteert met real-time multi-user |
| ACL bypassen | Security en audit trail |
| Nieuwe state management library | Redux + Zustand al in gebruik |
| Hardcoded permissions | Alles via ACL service |

---

## Voor Claude Code Sessies

### Voor Je Begint

1. **Lees [ROADMAP.md](./ROADMAP.md)** - Vind je specifieke fase/taak
2. **Check dependencies** - Zijn vorige fases compleet?
3. **Begrijp de ACL** - Gebruik `useAclPermission`, `useFeatureAccess` hooks
4. **Ken de real-time patterns** - `useSocket` hook voor live updates

### Tijdens Ontwikkeling

1. **Volg bestaande patterns** - Kijk naar `ProjectSidebar.tsx`, `AdminSidebar.tsx`
2. **Test met Robin** - Visuele + functionele validatie
3. **ACL integratie** - Menu items MOETEN permissions respecteren
4. **Geen over-engineering** - Focus op de specifieke taak

### Na Afronding

1. **Mark fase als ✅ Done** in ROADMAP.md
2. **Document eventuele afwijkingen**
3. **Update dependencies** voor volgende fase

---

## Status Legenda

| Status | Betekenis |
|--------|-----------|
| 📋 Planned | Nog niet gestart |
| 🔶 In Progress | Actief in ontwikkeling |
| ✅ Done | Compleet en getest |
| 🔲 Todo | Specifiek item nog te doen |
| ⚠️ Blocked | Wacht op dependency |

---

## Quick Links

- **Frontend code:** `/apps/web/src/components/dashboard/`
- **Backend code:** `/apps/api/src/trpc/procedures/`
- **ACL hooks:** `/apps/web/src/hooks/useAclPermission.ts`
- **Socket hooks:** `/apps/web/src/hooks/useSocket.ts`
- **Base layout:** `/apps/web/src/components/layout/BaseLayout.tsx`

---

## Contact

Bij vragen over de visie of implementatie, overleg met Robin Waslander.

**Let op:** Dit is een iteratief project. Documentatie wordt bijgewerkt naarmate fases vorderen.
