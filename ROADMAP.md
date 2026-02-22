# Kanbu Roadmap

**Last updated:** February 22, 2026
**Latest stable:** v0.1.0 (released February 22, 2026)
**License:** MIT

Kanbu is a self-hosted, open-source project management system with scoped permissions (filesystem-style ACL), AI agent dispatch (OpenClaw), MCP integration (154+ tools), GitHub sync, knowledge graph (Graphiti), wiki with semantic search, real-time collaboration, and analytics. Built as a monorepo with React, Fastify/tRPC, PostgreSQL, and Docker.

---

## Current Status

| Category                    | Status                                                         |
| --------------------------- | -------------------------------------------------------------- |
| **Core PM (board/tasks)**   | ✅ Complete                                                    |
| **ACL & Permissions**       | ✅ 90% (edge cases open)                                       |
| **AI/MCP Integration**      | ✅ Complete (154 tools, OAuth 2.1 on develop)                  |
| **OpenClaw Agent Dispatch** | ✅ Complete                                                    |
| **GitHub Integration**      | ✅ 90% (bi-directional sync)                                   |
| **Backup System**           | ✅ Complete (encrypted, scheduled, verified)                   |
| **Wiki & Knowledge Graph**  | ✅ Complete (versions, graph, semantic search, RAG, community) |
| **Analytics & Reporting**   | ✅ Complete (velocity, cycle time, workload, export CSV/JSON)  |
| **Real-time Collaboration** | ✅ Complete (cursors, presence, heartbeat)                     |
| **Docker Deployment**       | ✅ 90% (Coolify support)                                       |
| **OAuth 2.1 MCP**           | 🔄 80% (on develop)                                            |
| **Custom Fields**           | ⚠️ Schema ready, no API/UI yet                                 |
| **Budget Module**           | ⚠️ Schema ready, no API/UI yet                                 |
| **Email Notifications**     | ❌ Not started                                                 |
| **Multi-instance Redis**    | ❌ Not started                                                 |

---

## Release Overview

| Version    | Title                   | Status      |
| ---------- | ----------------------- | ----------- |
| **v0.1.0** | Initial Stable Release  | ✅ Released |
| **v0.2.0** | Multi-instance & Polish | ⬜ Planned  |
| **v0.3.0** | Custom Fields & Budget  | ⬜ Planned  |
| **v1.0.0** | Stable Release          | 💭 Future   |

---

## ✅ v0.1.0 — Initial Stable Release (released 2026-02-22)

### In development on `develop`

- 🔄 OAuth 2.1 for MCP Server (Phase 19)
- 🔄 MCP Services admin page
- 🔄 OAuth client management for users

### Open Issues

- ⬜ Permission edge cases (ACL inheritance depth)
- ⬜ Email notifications (missing entirely)
- ⬜ Mobile layout optimization (basic responsive done, no dedicated mobile UX)

### Completed in v0.1.0

- ✅ OpenClaw agent dispatch — dispatch tasks to AI agents from the task view
- ✅ Agent run history with full response log
- ✅ `@kanbu/openclaw-bridge` package
- ✅ `Agent` and `AgentRun` Prisma models
- ✅ MIT license
- ✅ GitHub integration setup guide ([docs/GITHUB-INTEGRATION.md](docs/GITHUB-INTEGRATION.md))
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

## ⬜ v0.2.0 — Multi-instance & Polish

### 2.1 Multi-instance

- ⬜ Redis adapter for Socket.io (multiple API instances)
- ⬜ Shared session store (Redis)
- ⬜ Load balancer configuration documentation
- ⬜ Improved health check endpoints

### 2.2 Frontend Polish

- ⬜ Virtual scrolling for very long task lists (1000+ tasks)
- ⬜ Bundle size analysis and reduction
- ⬜ Mobile layout improvements (sidebar, task detail)

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

## ⬜ v0.3.0 — Custom Fields & Budget

### 3.1 Custom Fields (schema ready, needs API + UI)

The database schema (`CustomField`, `TaskCustomValue`) is already in place. Needs:

- ⬜ tRPC CRUD procedures for custom field definitions
- ⬜ Custom field values on tasks (set/get per-task)
- ⬜ Filter and sort tasks by custom field values
- ⬜ Custom field UI in task detail and project settings
- ⬜ Custom field types: text, number, date, dropdown, checkbox

### 3.2 Budget Module (schema ready, needs API + UI)

The database schema (`Budget`, `BudgetLine`) is already in place. Needs:

- ⬜ tRPC CRUD procedures for budgets and budget lines
- ⬜ Budget UI in project settings
- ⬜ Link budget lines to tasks
- ⬜ Budget vs actual tracking
- ⬜ Financial summary view

### 3.3 Reporting Additions

- ⬜ PDF export (CSV/JSON/Trello already done)
- ⬜ Custom report builder
- ⬜ Cross-project analytics (current analytics are per-project)

### 3.4 Discord / Slack

- ⬜ Webhook notifications to Discord channels
- ⬜ Slack app installation flow
- ⬜ Task notifications (create, complete, assign)

---

## 💭 v1.0.0 — Stable Release

### 4.1 API v2

- 💭 GraphQL endpoint alongside tRPC
- 💭 Public API documentation (OpenAPI/Swagger)
- 💭 API versioning

### 4.2 Advanced Features

- 💭 SSO/SAML integration
- 💭 Custom domain support
- 💭 On-premise deployment guide
- 💭 Advanced audit (compliance)

### 4.3 Template System

- 💭 Project templates (Agile, Kanban, Scrum)
- 💭 Task templates
- 💭 Workflow automations (trigger → action)

---

## Feature Inventory

### ✅ Production-Ready (on `main`)

**Core project management**

- Kanban board with drag-and-drop, swimlanes, WIP limits
- Board, List, Calendar, Timeline, Sprint, Milestone views
- Sprints with burndown charts and planning board
- Milestones
- Modules (group tasks within a project)
- Subtasks with time tracking
- Comments, attachments, task links
- Tags, categories, priority, due dates, time estimates
- Progress tracking, scoring
- Full activity log per task and project

**Analytics & Export**

- Analytics dashboard: velocity charts, cycle time, team workload, task counts
- Export tasks to CSV, JSON, Trello-compatible CSV (with column/tag/assignee filters)
- Full project export to JSON (structure + all tasks)

**Search**

- Full-text search within a project (tasks, comments, wiki pages)
- Workspace-wide task search across all projects
- Member search with @mention autocomplete

**Permissions & Access**

- Filesystem-style ACL (bitmask: R=1, W=2, X=4, D=8, P=16)
- Groups and role assignments
- Project groups
- Bootstrap admin, registration control
- API keys with scopes and service accounts
- Audit logs

**AI & Integrations**

- 154+ MCP tools for Claude Code
- OpenClaw agent dispatch (Agent tab on tasks, run history, response log)
- Graphiti knowledge graph (Python/FastAPI + FalkorDB) with temporal queries, entity deduplication, community detection
- Wiki AI: semantic search, RAG chat ("Ask the Wiki"), BM25 + hybrid search, entity extraction, contradiction detection and audit
- AI provider configuration (OpenAI, Ollama, LM Studio — global, workspace, or project scope)
- GitHub bi-directional sync (issues, PRs, commits, milestones, workflow runs, deployments)
- YouTube metadata in wiki editor

**Wiki**

- Project wiki and workspace wiki with rich-text editor
- Version history (up to 20 versions per page)
- Wiki community detection (Label Propagation clustering)
- Contradiction audit with revert support

**Collaboration & Infrastructure**

- Real-time collaboration (cursors, presence, typing indicators, heartbeat)
- In-app notifications
- Sticky notes (6 colors, linkable to tasks, wikis, sprints, project groups)
- Webhooks with delivery history and test endpoint
- Automated backup (AES-256-GCM, SHA-256, scheduling, restore wizard)
- Docker deployment (self-hosted, Coolify)
- Pre-commit hooks (Husky + lint-staged)
- CI/CD pipeline (GitHub Actions: lint, typecheck, build)

### 🔄 In Development (`develop` branch)

- OAuth 2.1 for MCP Server (Phase 19)
- MCP Services admin page
- User OAuth management

### ⚠️ Schema Ready, No API/UI Yet

- Custom fields (per-project field definitions + per-task values)
- Budget module (budget + budget lines, linkable to tasks)

### ❌ Not Started

- Email notifications
- Multi-instance Redis support
- Discord/Slack integrations
- GraphQL API
- SSO/SAML
- PDF export

---

## Tech Stack

| Layer      | Technology                                                         |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | React 19, TypeScript, Vite 6, Tailwind 3, Shadcn/ui, Redux Toolkit |
| Backend    | Node.js 22, Fastify 5, tRPC 11, Socket.io                          |
| Database   | PostgreSQL 15, Prisma 6 (50+ models, 1800+ line schema)            |
| AI/Graph   | Kanbu Graphiti (Python/FastAPI), FalkorDB, OpenAI/Ollama/LM Studio |
| Agent      | OpenClaw gateway (optional), `@kanbu/openclaw-bridge`              |
| Monorepo   | pnpm workspaces, Turborepo                                         |
| Deployment | Docker, nginx, Coolify PaaS                                        |

---

## Links

- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- **GitHub:** https://github.com/hydro13/kanbu
