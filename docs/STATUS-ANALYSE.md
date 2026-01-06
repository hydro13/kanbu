# Kanbu Status Analyse

**Datum:** 2026-01-03
**Laatst bijgewerkt:** 2026-01-04 - Live editing presence & auto-save toegevoegd

---

## 1. Kanbu Architectuur

### Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Fastify + tRPC
- **Real-time:** Socket.io + Redis adapter (optional)
- **Database:** PostgreSQL + Prisma (eigen database, niet genxv5)
- **Monorepo:** pnpm workspaces

### Structuur
```
kanbu/
├── apps/
│   ├── api/          # tRPC backend
│   │   └── src/
│   │       ├── trpc/
│   │       │   ├── procedures/   # 27 API modules
│   │       │   └── router.ts
│   │       └── lib/
│   └── web/          # React frontend
│       └── src/
│           ├── pages/            # 25 pagina's
│           ├── components/
│           │   ├── board/        # Board, Column, Swimlane, DnD
│           │   ├── layout/
│           │   └── ui/
│           └── hooks/
└── packages/         # Shared packages
```

---

## 2. Wat is AF in Kanbu

### Backend (API) - 27 Procedures
| Module | Status | Beschrijving |
|--------|--------|--------------|
| activity.ts | ✅ | Activity logging |
| admin.ts | ✅ | Admin functies |
| analytics.ts | ✅ | Analytics/rapportage |
| apiKey.ts | ✅ | API key management |
| attachment.ts | ✅ | Bestand uploads |
| auth.ts | ✅ | Authenticatie |
| category.ts | ✅ | Categorieën |
| column.ts | ✅ | Kolommen CRUD |
| comment.ts | ✅ | Comments |
| export.ts | ✅ | Data export |
| import.ts | ✅ | Data import |
| milestone.ts | ✅ | Milestones |
| notification.ts | ✅ | Notificaties |
| project.ts | ✅ | Project CRUD |
| search.ts | ✅ | Zoeken |
| sprint.ts | ✅ | Sprints |
| stickyNote.ts | ✅ | Sticky notes |
| subtask.ts | ✅ | Subtaken |
| swimlane.ts | ✅ | Swimlanes CRUD |
| system.ts | ✅ | Systeem info |
| tag.ts | ✅ | Tags |
| taskLink.ts | ✅ | Task links |
| task.ts | ✅ | Taken CRUD |
| user.ts | ✅ | User management |
| webhook.ts | ✅ | Webhooks |
| workspace.ts | ✅ | Workspaces |

### Frontend (Web) - 25 Pagina's
| Pagina | Status | Beschrijving |
|--------|--------|--------------|
| Home.tsx | ✅ | Dashboard home |
| Login.tsx | ✅ | Login pagina |
| Register.tsx | ✅ | Registratie |
| ProjectList.tsx | ✅ | Project overzicht |
| BoardView.tsx | ✅ | Kanban board |
| ListView.tsx | ✅ | Lijst weergave |
| CalendarView.tsx | ✅ | Kalender weergave |
| TimelineView.tsx | ✅ | Gantt/timeline |
| MilestoneView.tsx | ✅ | Milestone overzicht |
| SprintBoard.tsx | ✅ | Sprint board |
| SprintPlanning.tsx | ✅ | Sprint planning |
| SprintBurndown.tsx | ✅ | Burndown chart |
| AnalyticsDashboard.tsx | ✅ | Analytics |
| ProjectSettings.tsx | ✅ | Project instellingen |
| BoardSettings.tsx | ✅ | Board instellingen |
| TagManagement.tsx | ✅ | Tag beheer |
| ImportExport.tsx | ✅ | Import/export |
| UserProfile.tsx | ✅ | Profiel pagina |
| AcceptInvite.tsx | ✅ | Uitnodiging accepteren |
| NotificationSettings.tsx | ✅ | Notificatie settings |
| WorkspaceSettings.tsx | ✅ | Workspace settings |
| ApiSettings.tsx | ✅ | API settings |
| WebhookSettings.tsx | ✅ | Webhook settings |
| admin/* | ✅ | Admin pagina's |
| dashboard/* | ✅ | Dashboard subpagina's |
| profile/* | ✅ | Profiel subpagina's |

### Core Board Componenten
| Component | Status | Beschrijving |
|-----------|--------|--------------|
| Board.tsx | ✅ | Hoofdboard component |
| Column.tsx | ✅ | Kolom component |
| SwimlaneRow.tsx | ✅ | Swimlane rijen |
| DndContext.tsx | ✅ | Drag & drop |
| DroppableColumn.tsx | ✅ | Drop zones |
| useBoard.ts | ✅ | Board hook |

### Real-Time Collaboration (Socket.io)
| Feature | Status | Beschrijving |
|---------|--------|--------------|
| Live Task Sync | ✅ | Wijzigingen direct zichtbaar bij alle users |
| Presence Indicators | ✅ | Zie wie online is op het board |
| Live Cursors | ✅ | Zie waar anderen hun muis bewegen |
| Typing Indicators | ✅ | "X is typing..." in comments |
| Conflict Resolution | ✅ | Alert bij gelijktijdige wijzigingen |
| Live Editing Presence | ✅ | Rood kader + disabled Edit knop wanneer iemand anders bezig is |
| Tag Sync | ✅ | Tags worden live gesynchroniseerd |
| Subtask Sync | ✅ | Subtaak wijzigingen worden live gesynchroniseerd |

### Editing Safety Features
| Feature | Status | Beschrijving |
|---------|--------|--------------|
| Heartbeat System | ✅ | Editors sturen elke 30s heartbeat om lock actief te houden |
| Stale Lock Cleanup | ✅ | Locks worden na 2 minuten zonder heartbeat automatisch vrijgegeven |
| Auto-Save | ✅ | Wijzigingen worden elke 30s automatisch opgeslagen |
| Optimistic Locking | ✅ | Conflict detectie via expectedUpdatedAt timestamp |

**Scaling:**
- Single instance: ~15 concurrent users (geen Redis nodig)
- Multi-instance: Honderden users (met Redis adapter)

---

## 3. Vergelijking met GENX-Planner

### GENX-Planner Features (45 MCP Tools)

| Feature Groep | Tools | Kanbu Status |
|---------------|-------|--------------|
| **Core (17)** | projects, tasks, columns, swimlanes, comments, subtasks, board | ✅ Aanwezig |
| **Relationgraph (4)** | task links, link types | ✅ Aanwezig (taskLink.ts) |
| **Gantt (2)** | timeline, task dates | ✅ Aanwezig (TimelineView) |
| **Milestone (4)** | milestones, task-milestone koppeling | ✅ Aanwezig |
| **Wiki (5)** | wiki pages CRUD | ❌ **ONTBREEKT** |
| **Global Search (3)** | cross-project search | ⚠️ Deels (alleen binnen project) |
| **metaMagik (5)** | custom fields | ❌ **ONTBREEKT** |
| **Budget (5)** | budget tracking | ❌ **ONTBREEKT** |

---

## 4. Wat ONTBREEKT in Kanbu

### Kritieke Gaps

| Feature | Prioriteit | Beschrijving |
|---------|------------|--------------|
| **Wiki systeem** | HOOG | GENX-Planner heeft volledige wiki met pagina's per project |
| **Custom Fields** | HOOG | metaMagik plugin: custom velden (text, number, date, dropdown) |
| **Budget Tracking** | MEDIUM | Budget module met expenses/income tracking |
| **Cross-project Search** | MEDIUM | Zoeken over alle projecten heen |

### Mogelijke Gaps (verder onderzoek nodig)

| Feature | Status | Notitie |
|---------|--------|---------|
| Project Groups | ❓ | Workspace lijkt equivalent |
| Automatic Actions | ❓ | Trigger-based automatisering |
| Time Tracking | ❓ | Op subtask niveau |
| File Attachments | ✅ | attachment.ts aanwezig |
| User Permissions | ❓ | Hoe granulair? |
| Themes | ❓ | GENX heeft gruvbox/dark themes |

---

## 5. Samenvatting

### Kanbu Status: ~80% Feature Parity

**Wat werkt goed:**
- Complete board/task/project management
- Drag & drop
- Sprints en milestones
- Gantt/timeline view
- Analytics
- Multi-user/workspace
- **Real-time collaboration** (live sync, presence, cursors)

**Wat moet gebouwd worden:**
1. **Wiki systeem** - Documentatie per project
2. **Custom Fields** - Flexibele metadata op taken
3. **Budget Module** - Financiële tracking
4. **Cross-project Search** - Globale zoekfunctie

---

## 6. Aanbevolen Volgende Stappen

1. **Wiki systeem implementeren** - Hoogste prioriteit voor documentatie
2. **Custom Fields toevoegen** - Flexibiliteit voor verschillende projecttypes
3. **Global Search uitbreiden** - Cross-project zoeken
4. **Budget module** - Als financiële tracking nodig is

---

*Rapport gegenereerd met behulp van genx-vector-source MCP tools*
