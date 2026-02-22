# Kanbu Roadmap

**Laatste update:** 6 februari 2026
**Versie:** 0.1.0-beta.4 (latest release: 18 jan 2026)
**Licentie:** MIT

Kanbu is een self-hosted, open-source project management systeem met enterprise-grade permissies (NTFS-style ACL), AI integratie (154+ MCP tools), GitHub sync, knowledge graph (Graphiti), en real-time samenwerking. Gebouwd als monorepo met React, Fastify/tRPC, PostgreSQL en Docker.

---

## Huidige Status

| Categorie                         | Status                                        |
| --------------------------------- | --------------------------------------------- |
| **Core PM (board/tasks/sprints)** | ✅ 95% compleet                               |
| **ACL & Permissies**              | ✅ 90% (edge cases open)                      |
| **AI/MCP Integratie**             | ✅ 95% (154 tools, Phase 19 OAuth op develop) |
| **GitHub Integration**            | ✅ 90% (bi-directional sync)                  |
| **Backup Systeem**                | ✅ 95% (encrypted, scheduled, verified)       |
| **Wiki & Knowledge**              | ✅ 85% (versions, graph, contradictions)      |
| **Real-time Collab**              | ✅ 90% (cursors, presence, heartbeat)         |
| **Docker Deployment**             | ✅ 90% (Coolify support)                      |
| **OAuth 2.1 MCP**                 | 🔄 80% (op develop, 8 commits)                |
| **Custom Fields**                 | ❌ 0%                                         |
| **Email Notifications**           | ❌ 0%                                         |
| **Multi-instance Redis**          | ❌ 0%                                         |
| **Budget Module**                 | ❌ 0%                                         |

---

## Phase Overview

| Phase      | Titel                        | Status         | Target   |
| ---------- | ---------------------------- | -------------- | -------- |
| **v0.1.x** | Beta Stabilization           | 🔄 In Progress | Feb 2026 |
| **v0.2.0** | Multi-instance & Performance | ⬜ Planned     | Q2 2026  |
| **v0.3.0** | Integrations & Custom Fields | ⬜ Planned     | Q3 2026  |
| **v1.0.0** | Stable Release               | 💭 Future      | Q4 2026  |

---

## 🔄 v0.1.x — Beta Stabilization (NU)

### Ongemerged op develop (8 commits)

- 🔄 OAuth 2.1 voor MCP Server (Phase 19)
- 🔄 MCP Services admin page
- 🔄 OAuth client management voor users
- 🔄 ESLint no-explicit-any warnings opgelost
- 🔄 Coolify multi-env deployment fixes

### Open Issues

- ⬜ Permission edge cases (ACL inheritance diepte)
- ⬜ Performance bij 100+ taken per board
- ⬜ Cross-project search (alleen intra-project nu)
- ⬜ Email notificaties (ontbreken volledig)
- ⬜ Mobile responsive testing
- ⬜ Storybook coverage uitbreiden

### Recent Afgerond (beta.3 → beta.4)

- ✅ Backup encryption (AES-256-GCM)
- ✅ Backup verification (SHA-256 checksums)
- ✅ Backup self-service (UI: list, download, delete)
- ✅ Backup automation (scheduling, retention, restore wizard)
- ✅ Shared backup storage (multi-environment)
- ✅ Pre-commit hooks (Husky + lint-staged)
- ✅ Production Docker deployment
- ✅ Bootstrap admin (first user = admin)
- ✅ Wiki MCP tools (Phase 17, 18 tools)
- ✅ Registration control

---

## ⬜ v0.2.0 — Multi-instance & Performance (Q2 2026)

### 2.1 Multi-instance

- ⬜ Redis adapter voor Socket.io (meerdere API instances)
- ⬜ Shared session store (Redis)
- ⬜ Load balancer config documentatie
- ⬜ Health check endpoints verbeteren

### 2.2 Performance

- ⬜ Optimalisatie voor 100+ taken per board
- ⬜ Database query optimalisatie (N+1 checks)
- ⬜ Lazy loading voor grote projecten
- ⬜ Virtual scrolling voor lange lijsten
- ⬜ Bundle size analyse en reductie

### 2.3 Email Notificaties

- ⬜ Email service integratie (Resend/SendGrid)
- ⬜ Notificatie templates (task assigned, comment, mention)
- ⬜ Per-user notificatie voorkeuren
- ⬜ Digest emails (dagelijks/wekelijks)

### 2.4 Permission Fixes

- ⬜ ACL inheritance edge cases oplossen
- ⬜ Bulk permission changes
- ⬜ Permission audit report
- ⬜ Permission templates per role

---

## ⬜ v0.3.0 — Integrations & Custom Fields (Q3 2026)

### 3.1 Custom Fields

- ⬜ Custom field types (text, number, date, dropdown, checkbox)
- ⬜ Custom fields per project
- ⬜ Custom field waarden op tasks
- ⬜ Filteren en sorteren op custom fields
- ⬜ Custom field templates

### 3.2 Discord Integration

- ⬜ Webhook notificaties naar Discord
- ⬜ Bot commands (create task, update status)
- ⬜ Channel-per-project mapping

### 3.3 Slack Integration

- ⬜ Slack app installatie flow
- ⬜ Task notificaties in channels
- ⬜ Slash commands (/kanbu create, /kanbu status)

### 3.4 Advanced Reporting

- ⬜ Dashboard met team metrics
- ⬜ Velocity charts
- ⬜ Lead time / cycle time tracking
- ⬜ Custom report builder
- ⬜ Export naar PDF/CSV

### 3.5 Budget Module

- ⬜ Budget per project
- ⬜ Budget lines (income/expense)
- ⬜ Budget vs actual tracking
- ⬜ Financial reports

---

## 💭 v1.0.0 — Stable Release (Q4 2026)

### 4.1 API v2

- 💭 GraphQL endpoint naast tRPC
- 💭 Public API documentatie (OpenAPI/Swagger)
- 💭 API versioning

### 4.2 Enterprise

- 💭 SSO/SAML integratie
- 💭 Custom domain support
- 💭 On-premise deployment guide
- 💭 Team workload analytics
- 💭 Advanced audit (compliance)

### 4.3 Template System

- 💭 Project templates (Agile, Kanban, Scrum)
- 💭 Task templates
- 💭 Workflow automations (trigger → action)

---

## Feature Inventaris

### ✅ Production-Ready

- Kanban board met drag-and-drop, swimlanes, WIP limits
- Board, List, Calendar, Timeline views
- Sprints & milestones met burndown charts
- NTFS-style ACL (bitmask: R=1, W=2, X=4, D=8, P=16)
- 154+ MCP tools voor Claude Code
- GitHub bi-directional sync (issues, PRs, commits, milestones)
- Knowledge wiki met versioning (max 20 versions)
- Graphiti knowledge graph (Python/FastAPI + FalkorDB)
- Real-time samenwerking (cursors, presence, typing, heartbeat)
- Enterprise backup (AES-256-GCM, SHA-256, scheduling, restore wizard)
- Comments, attachments, subtasks, task links
- Tags, categories, time tracking
- API keys, webhooks, audit logs
- Docker deployment (self-hosted, Coolify)
- Bootstrap admin, registration control
- Pre-commit hooks (Husky + lint-staged)
- CI/CD pipeline (GitHub Actions)

### 🔄 In Development (develop branch)

- OAuth 2.1 voor MCP Server (Phase 19)
- MCP Services admin page
- User OAuth management

### ❌ Niet Gestart

- Custom fields
- Email notificaties
- Multi-instance Redis support
- Budget module
- Discord/Slack integraties
- Advanced reporting dashboard
- GraphQL API
- Mobile optimization

---

## Tech Stack

| Layer      | Technologie                                                        |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | React 19, TypeScript, Vite 6, Tailwind 3, Shadcn/ui, Redux Toolkit |
| Backend    | Node.js 22, Fastify 5, tRPC 11, Socket.io                          |
| Database   | PostgreSQL 15, Prisma 6 (50+ modellen, 1803 regels schema)         |
| AI/Graph   | Kanbu Graphiti (Python/FastAPI), FalkorDB                          |
| Monorepo   | pnpm workspaces, Turborepo                                         |
| Deployment | Docker, nginx, Coolify PaaS                                        |

---

## Links

- **Task Tracking:** [TASKS.md](./TASKS.md)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- **GitHub:** https://github.com/hydro13/kanbu

---

## Versioning

| Versie | Datum      | Wijzigingen                                             |
| ------ | ---------- | ------------------------------------------------------- |
| 1.0    | 6 feb 2026 | Initiële roadmap (v0.1.x-beta.4, develop branch status) |
