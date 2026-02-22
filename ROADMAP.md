# Kanbu Roadmap

**Last updated:** February 22, 2026
**Current version:** 0.1.0-beta.5 (in development on `develop`)
**Latest stable:** 0.1.0-beta.4 (released January 18, 2026)
**License:** MIT

Kanbu is a self-hosted, open-source project management system with enterprise-grade permissions (NTFS-style ACL), AI agent dispatch (OpenClaw), MCP integration (154+ tools), GitHub sync, knowledge graph (Graphiti), and real-time collaboration. Built as a monorepo with React, Fastify/tRPC, PostgreSQL, and Docker.

---

## Current Status

| Category                    | Status                                         |
| --------------------------- | ---------------------------------------------- |
| **Core PM (board/tasks)**   | ✅ 95% complete                                |
| **ACL & Permissions**       | ✅ 90% (edge cases open)                       |
| **AI/MCP Integration**      | ✅ 95% (154 tools, OAuth 2.1 on develop)       |
| **OpenClaw Agent Dispatch** | ✅ Complete (on develop, merging to main soon) |
| **GitHub Integration**      | ✅ 90% (bi-directional sync)                   |
| **Backup System**           | ✅ 95% (encrypted, scheduled, verified)        |
| **Wiki & Knowledge Graph**  | ✅ 85% (versions, graph, contradictions)       |
| **Real-time Collaboration** | ✅ 90% (cursors, presence, heartbeat)          |
| **Docker Deployment**       | ✅ 90% (Coolify support)                       |
| **OAuth 2.1 MCP**           | 🔄 80% (on develop)                            |
| **Custom Fields**           | ❌ Not started                                 |
| **Email Notifications**     | ❌ Not started                                 |
| **Multi-instance Redis**    | ❌ Not started                                 |
| **Budget Module**           | ❌ Not started                                 |

---

## Release Overview

| Version    | Title                        | Status         | Target  |
| ---------- | ---------------------------- | -------------- | ------- |
| **v0.1.x** | Beta Stabilization           | 🔄 In Progress | Q1 2026 |
| **v0.2.0** | Multi-instance & Performance | ⬜ Planned     | Q2 2026 |
| **v0.3.0** | Integrations & Custom Fields | ⬜ Planned     | Q3 2026 |
| **v1.0.0** | Stable Release               | 💭 Future      | Q4 2026 |

---

## 🔄 v0.1.x — Beta Stabilization (current)

### In development on `develop`

- ✅ OpenClaw agent dispatch — dispatch tasks to AI agents from the task view
- ✅ Agent run history with response log
- ✅ `@kanbu/openclaw-bridge` package
- ✅ `Agent` and `AgentRun` Prisma models
- 🔄 OAuth 2.1 for MCP Server (Phase 19)
- 🔄 MCP Services admin page
- 🔄 OAuth client management for users

### Open Issues

- ⬜ Permission edge cases (ACL inheritance depth)
- ⬜ Performance with 100+ tasks per board
- ⬜ Cross-project search (currently intra-project only)
- ⬜ Email notifications (missing entirely)
- ⬜ Mobile responsive testing

### Completed (beta.3 → beta.4, released 2026-01-18)

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

- ⬜ Redis adapter for Socket.io (multiple API instances)
- ⬜ Shared session store (Redis)
- ⬜ Load balancer configuration documentation
- ⬜ Improved health check endpoints

### 2.2 Performance

- ⬜ Optimization for 100+ tasks per board
- ⬜ Database query optimization (N+1 checks)
- ⬜ Lazy loading for large projects
- ⬜ Virtual scrolling for long lists
- ⬜ Bundle size analysis and reduction

### 2.3 Email Notifications

- ⬜ Email service integration (Resend/SendGrid)
- ⬜ Notification templates (task assigned, comment, mention)
- ⬜ Per-user notification preferences
- ⬜ Digest emails (daily/weekly)

### 2.4 Permission Fixes

- ⬜ ACL inheritance edge cases
- ⬜ Bulk permission changes
- ⬜ Permission audit report
- ⬜ Permission templates per role

---

## ⬜ v0.3.0 — Integrations & Custom Fields (Q3 2026)

### 3.1 Custom Fields

- ⬜ Custom field types (text, number, date, dropdown, checkbox)
- ⬜ Custom fields per project
- ⬜ Custom field values on tasks
- ⬜ Filter and sort by custom fields
- ⬜ Custom field templates

### 3.2 Discord Integration

- ⬜ Webhook notifications to Discord
- ⬜ Bot commands (create task, update status)
- ⬜ Channel-per-project mapping

### 3.3 Slack Integration

- ⬜ Slack app installation flow
- ⬜ Task notifications in channels
- ⬜ Slash commands (/kanbu create, /kanbu status)

### 3.4 Advanced Reporting

- ⬜ Dashboard with team metrics
- ⬜ Velocity charts
- ⬜ Lead time / cycle time tracking
- ⬜ Custom report builder
- ⬜ Export to PDF/CSV

### 3.5 Budget Module

- ⬜ Budget per project
- ⬜ Budget lines (income/expense)
- ⬜ Budget vs actual tracking
- ⬜ Financial reports

---

## 💭 v1.0.0 — Stable Release (Q4 2026)

### 4.1 API v2

- 💭 GraphQL endpoint alongside tRPC
- 💭 Public API documentation (OpenAPI/Swagger)
- 💭 API versioning

### 4.2 Enterprise

- 💭 SSO/SAML integration
- 💭 Custom domain support
- 💭 On-premise deployment guide
- 💭 Team workload analytics
- 💭 Advanced audit (compliance)

### 4.3 Template System

- 💭 Project templates (Agile, Kanban, Scrum)
- 💭 Task templates
- 💭 Workflow automations (trigger → action)

---

## Feature Inventory

### ✅ Production-Ready (on `main`)

- Kanban board with drag-and-drop, swimlanes, WIP limits
- Board, List, Calendar, Timeline views
- Sprints & milestones with burndown charts
- NTFS-style ACL (bitmask: R=1, W=2, X=4, D=8, P=16)
- 154+ MCP tools for Claude Code
- GitHub bi-directional sync (issues, PRs, commits, milestones)
- Knowledge wiki with versioning (up to 20 versions)
- Graphiti knowledge graph (Python/FastAPI + FalkorDB)
- Real-time collaboration (cursors, presence, typing, heartbeat)
- Enterprise backup (AES-256-GCM, SHA-256, scheduling, restore wizard)
- Comments, attachments, subtasks, task links
- Tags, categories, time tracking
- API keys, webhooks, audit logs
- Docker deployment (self-hosted, Coolify)
- Bootstrap admin, registration control
- Pre-commit hooks (Husky + lint-staged)
- CI/CD pipeline (GitHub Actions)

### 🔄 In Development (`develop` branch)

- OpenClaw agent dispatch (Agent tab on tasks, run history, response log)
- OAuth 2.1 for MCP Server (Phase 19)
- MCP Services admin page
- User OAuth management

### ❌ Not Started

- Custom fields
- Email notifications
- Multi-instance Redis support
- Budget module
- Discord/Slack integrations
- Advanced reporting dashboard
- GraphQL API
- Mobile optimization

---

## Tech Stack

| Layer      | Technology                                                         |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | React 19, TypeScript, Vite 6, Tailwind 3, Shadcn/ui, Redux Toolkit |
| Backend    | Node.js 22, Fastify 5, tRPC 11, Socket.io                          |
| Database   | PostgreSQL 15, Prisma 6 (50+ models, 1800+ line schema)            |
| AI/Graph   | Kanbu Graphiti (Python/FastAPI), FalkorDB                          |
| Agent      | OpenClaw gateway (optional), `@kanbu/openclaw-bridge`              |
| Monorepo   | pnpm workspaces, Turborepo                                         |
| Deployment | Docker, nginx, Coolify PaaS                                        |

---

## Links

- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- **GitHub:** https://github.com/hydro13/kanbu
