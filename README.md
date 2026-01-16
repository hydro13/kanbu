# Kanbu

**Self-hosted project management with enterprise permissions and AI superpowers.**
<br>_Part of the **GenX** Project_

> Tell Claude what you want. It plans the work, estimates hours, creates subtasks, builds the features, and tracks its own progress. You review.
>
> [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
> [![GitHub release (latest by date)](https://img.shields.io/github/v/release/hydro13/kanbu?label=version&color=brightgreen)](https://github.com/hydro13/kanbu/releases)
> [![GitHub last commit](https://img.shields.io/github/last-commit/hydro13/kanbu)](https://github.com/hydro13/kanbu/commits)
> [![GitHub issues](https://img.shields.io/github/issues/hydro13/kanbu)](https://github.com/hydro13/kanbu/issues)
> [![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
> [![Status: Beta](https://img.shields.io/badge/Status-Beta-yellow)](https://github.com/hydro13/kanbu/releases)

<img width="2428" height="1846" alt="Kanbu Board" src="https://github.com/user-attachments/assets/6cd89fcd-2afa-44c1-a200-8cef163e8c31" />

---

## Why Kanbu?

Most project management tools are either **too simple** (Trello) or **too complex** (Jira). And none of them understand AI-native workflows.

Kanbu is different:

| Problem | Kanbu Solution |
|---------|----------------|
| "I need enterprise permissions but Trello doesn't have them" | **NTFS-style ACL** with inheritance, deny rules, and security groups |
| "I want AI to help but it can't access my tasks" | **141 MCP tools** - Claude Code works directly in your board |
| "GitHub issues and my PM tool are never in sync" | **Bi-directional GitHub sync** with webhook integration |
| "I want to self-host but lose features" | Community edition has MORE features than most paid tools |
| "My team speaks different languages" | Each user talks to their own AI assistant in their own language |

---

## Key Features

### 🎯 Project Management
- **Kanban boards** with drag-and-drop, swimlanes, and WIP limits
- **Multiple views**: Board, List, Calendar, Timeline
- **Sprints & Milestones** with burndown charts
- **Time tracking** with estimates vs. actuals
- **Real-time collaboration**: Live cursors, typing indicators, and instant sync via Socket.io

<img width="2300" height="1407" alt="Kanbu Timeline" src="https://github.com/user-attachments/assets/c301f168-2e77-4b44-9c3a-45c4a38f2167" />

### 🔐 Enterprise Security (NTFS-Style ACL)
Kanbu implements a robust permission system inspired by Windows (NTFS) and Active Directory.

- **Granular permissions**: Bitmask-based control (Read, Write, Execute, Delete, Permissions).
- **Inheritance**: Workspace → Project → Task permissions flow down automatically.
- **Deny-first logic**: Explicit deny overrides any grant (e.g., ban a specific user from a project even if they are an admin).
- **Audit logs**: Complete security trail with export to CSV/JSON.

**Permission Bitmask:**

| Bit | Permission | Value | Description |
|-----|------------|-------|-------------|
| R | Read | 1 | View resource |
| W | Write | 2 | Modify resource |
| X | Execute | 4 | Perform actions (reserved) |
| D | Delete | 8 | Remove resource |
| P | Permissions | 16 | Manage ACL entries |

**Role Mapping:**

| Role | Workspace ACL | Project ACL |
|------|---------------|-------------|
| OWNER | FULL_CONTROL (31) | FULL_CONTROL (31) |
| ADMIN | FULL_CONTROL (31) | - |
| MANAGER | - | EDITOR (15) |
| MEMBER | CONTRIBUTOR (7) | CONTRIBUTOR (7) |
| VIEWER | READ_ONLY (1) | READ_ONLY (1) |

### 🤖 Built-in Graphiti Knowledge Engine
Kanbu includes **Kanbu Graphiti**, a self-hosted knowledge graph engine (Python/FastAPI) that runs locally alongside the app. 

- **No external dependencies**: You do not need to sign up for any third-party Graph Service. It runs on your own hardware using FalkorDB.
- **Fact Extraction**: Automatically builds a knowledge graph from your wiki pages.
- **Temporal Queries**: Ask "What did we know about this feature last month?"
- **Contradiction Detection**: Flags conflicting information across your documentation.

### 🔌 AI Integration (Claude Code)
Connect Claude Code to manage your Kanbu projects with **141 available tools**.
**Status: Production Ready (Hardened)**

**Tool Categories:**
| Phase | Category | Tools | Examples |
|-------|----------|-------|----------|
| **1** | Pairing | 3 | `kanbu_connect`, `kanbu_whoami`, `kanbu_disconnect` |
| **2** | Core | 11 | `kanbu_list_workspaces`, `kanbu_create_task`, `kanbu_my_tasks` |
| **3** | Subtasks & Comments | 9 | `kanbu_create_subtask`, `kanbu_add_comment` |
| **4** | Search & Activity | 5 | `kanbu_search_tasks`, `kanbu_recent_activity` |
| **5** | Analytics | 4 | `kanbu_project_stats`, `kanbu_velocity` |
| **6-12** | Admin & Settings | 85 | User management, ACL, Audit logs, Backups, Profile |
| **9+** | GitHub Connector | 10 | `kanbu_list_github_prs`, `kanbu_get_github_repo` |
| **13-16** | Hardening & Audit | 14 | Rate limiting, Audit logging (via metadata) |

### 🐙 GitHub Integration
- **Bi-directional sync**: Issues, PRs, commits, milestones
- **Auto-link commits**: Reference tasks in commit messages
- **Sync logs**: Complete visibility into what synced and when

<img width="2300" height="1407" alt="GitHub Integration" src="https://github.com/user-attachments/assets/154b6f4f-d23f-4dcf-88db-6b374b168b4c" />

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui |
| State | Redux Toolkit, TanStack Query |
| Backend | Node.js 22, Fastify, tRPC v10, Socket.io |
| Database | PostgreSQL 15, Prisma ORM |
| AI / Graph | Kanbu Graphiti (Python/FastAPI), FalkorDB (Graph DB) |
| Monorepo | pnpm workspaces, Turborepo |

---

## Quick Start

```bash
# Prerequisites: Node.js 22+, PostgreSQL 15+, pnpm 9+

# Clone and install
git clone https://github.com/hydro13/kanbu.git
cd kanbu
pnpm install

# Setup database
cd packages/shared
cp ../../apps/api/.env.example ../../apps/api/.env
# Edit .env with your DATABASE_URL and JWT_SECRET
pnpm db:generate
pnpm db:push

# Start development
cd ../..
pnpm dev

# Open http://localhost:5173
```

### Docker (Self-Hosted)

```bash
cd docker
cp .env.example .env
# Edit .env - CHANGE THE PASSWORDS AND JWT_SECRET!
docker compose -f docker-compose.selfhosted.yml up -d
```

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

## License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

- ✅ Use, modify, and distribute freely
- ✅ Commercial use allowed
- ⚠️ Modified versions must be open-sourced
- ⚠️ Network use = distribution (must share source)

See [LICENSE](LICENSE) for details.

## Support

- 💬 [Discord Community](https://discord.com/channels/1461655382492446927/1461655383708799153)
- 🐛 [Issue Tracker](https://github.com/hydro13/kanbu/issues)

---

<p align="center">
  <b>Kanbu</b> - Project management for the AI era<br>
  Built with ❤️ by Robin Waslander
</p>
