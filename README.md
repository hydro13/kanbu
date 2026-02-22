# Kanbu

**Self-hosted project management for people who work with AI agents.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/hydro13/kanbu?label=version&color=brightgreen)](https://github.com/hydro13/kanbu/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/hydro13/kanbu)](https://github.com/hydro13/kanbu/commits)
[![GitHub issues](https://img.shields.io/github/issues/hydro13/kanbu)](https://github.com/hydro13/kanbu/issues)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status: Beta](https://img.shields.io/badge/Status-Beta-yellow)](https://github.com/hydro13/kanbu/releases)

<img width="2428" height="1846" alt="Kanbu Board" src="https://github.com/user-attachments/assets/6cd89fcd-2afa-44c1-a200-8cef163e8c31" />

---

## Built for OpenClaw users

I built Kanbu because I use [OpenClaw](https://github.com/OpenClaw-AI/openclaw) every day. My projects regularly cross 300,000 lines of code — and at that scale, you need somewhere to track what your agents are doing, what's been decided, and what comes next. No tool did that. So I built one.

Kanbu connects directly to your local OpenClaw gateway. Dispatch any task to an agent from the task view, read its response, steer it with follow-up instructions, and let it update the board as it works. Your task list becomes the shared memory between you and your agents.

It's MIT. It's self-hosted. It's here because I needed it, and maybe you do too.

---

## Why Kanbu?

Most project management tools are either **too simple** (Trello) or **too complex** (Jira). And none of them understand AI-native workflows.

Kanbu is different:

| Problem                                                      | Kanbu Solution                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| "I need enterprise permissions but Trello doesn't have them" | **NTFS-style ACL** with inheritance, deny rules, and security groups |
| "I want AI to help but it can't access my tasks"             | **154 MCP tools** - Claude Code works directly in your board         |
| "I want to dispatch tasks to AI agents and see what they do" | **OpenClaw agent dispatch** — one click, agent runs, response logged |
| "GitHub issues and my PM tool are never in sync"             | **Bi-directional GitHub sync** with webhook integration              |
| "I want to self-host but lose features"                      | Community edition has MORE features than most paid tools             |
| "My backups are not secure or automated"                     | **Enterprise backup system** with AES-256 encryption & scheduling    |
| "My team speaks different languages"                         | Each user talks to their own AI assistant in their own language      |

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

| Bit | Permission  | Value | Description                |
| --- | ----------- | ----- | -------------------------- |
| R   | Read        | 1     | View resource              |
| W   | Write       | 2     | Modify resource            |
| X   | Execute     | 4     | Perform actions (reserved) |
| D   | Delete      | 8     | Remove resource            |
| P   | Permissions | 16    | Manage ACL entries         |

**Role Mapping:**

| Role    | Workspace ACL     | Project ACL       |
| ------- | ----------------- | ----------------- |
| OWNER   | FULL_CONTROL (31) | FULL_CONTROL (31) |
| ADMIN   | FULL_CONTROL (31) | -                 |
| MANAGER | -                 | EDITOR (15)       |
| MEMBER  | CONTRIBUTOR (7)   | CONTRIBUTOR (7)   |
| VIEWER  | READ_ONLY (1)     | READ_ONLY (1)     |

### 🧠 Built-in Knowledge Graph Engine

Kanbu includes a complete wiki intelligence system, built in **TypeScript** (33,000+ lines), using [Graphiti](https://github.com/getzep/graphiti) as the underlying graph database layer (Python/FalkorDB).

- **No external dependencies**: Runs entirely on your own hardware. No third-party graph service required.
- **Semantic search**: Find knowledge across your entire wiki using vector embeddings.
- **Temporal queries**: Ask "What did we know about this feature last month?"
- **Contradiction detection**: Automatically flags conflicting information across your documentation.
- **Duplicate deduplication**: Detects and merges overlapping knowledge nodes across pages.
- **Community clustering**: Groups related knowledge using label propagation (own algorithm).
- **RAG**: Retrieval-Augmented Generation — AI answers grounded in your actual wiki content.
- **D3.js graph visualization**: Interactive visual map of your knowledge graph, live in the browser.

<img width="3046" height="1760" alt="Kanbu Knowledge Graph" src="https://github.com/user-attachments/assets/71ba30d0-ed18-436f-95b8-e0e8a6b90bed" />

_Inspired by [Graphiti](https://github.com/getzep/graphiti) — thanks for the foundation._

### 🤖 AI Agent Dispatch (OpenClaw)

If you run [OpenClaw](https://github.com/OpenClaw-AI/openclaw), Kanbu connects directly to your local agent gateway. Assign any task to an AI agent with one click — no copy-pasting, no context switching.

- **One-click dispatch**: Open any task → Agent tab → select agent → Dispatch
- **Task context included automatically**: Title, description, project and workspace name are sent as a structured prompt
- **Custom instructions per run**: Add extra steering without editing the task
- **Run history with response**: Every run is logged with status, duration, and the agent's full response
- **Iterative control loop**: Dispatch → read response → dispatch again with new instructions
- **Fire-and-forget**: Returns immediately, status updates async as the agent works

**Setup** (2 env vars):

```env
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your-token-here
```

When not configured, the Agent tab shows a friendly "not configured" state instead of an error.

<img width="2852" height="1722" alt="Kanbu Agent Dispatch" src="https://github.com/user-attachments/assets/ea98dd79-2d19-46b8-b686-1040a9cdc5b4" />

**[Setup guide →](docs/OPENCLAW.md)**

---

### 🔌 AI Agent Integration (MCP)

Connect any MCP-compatible AI agent to manage your Kanbu projects with **154 available tools**.
**Status: Production Ready (Hardened)**

**Tool Categories:**

| Phase     | Category            | Tools | Examples                                                            |
| --------- | ------------------- | ----- | ------------------------------------------------------------------- |
| **1**     | Pairing             | 3     | `kanbu_connect`, `kanbu_whoami`, `kanbu_disconnect`                 |
| **2**     | Core                | 11    | `kanbu_list_workspaces`, `kanbu_create_task`                        |
| **3**     | Subtasks & Comments | 9     | `kanbu_create_subtask`, `kanbu_add_comment`                         |
| **4**     | Search & Activity   | 5     | `kanbu_search_tasks`, `kanbu_recent_activity`                       |
| **5**     | Analytics           | 4     | `kanbu_project_stats`, `kanbu_velocity`                             |
| **6-12**  | Admin & Settings    | 90    | User management, ACL, Audit logs, Backups, Profile                  |
| **9+**    | GitHub Connector    | 10    | `kanbu_list_github_prs`, `kanbu_create_github_branch`               |
| **17**    | Wiki Management     | 18    | `kanbu_list_project_wiki_pages`, `kanbu_create_workspace_wiki_page` |
| **13-16** | Hardening & Audit   | 4     | Rate limiting, Security hardening                                   |

### 🐙 GitHub Integration

- **Bi-directional sync**: Issues, PRs, commits, milestones
- **Auto-link commits**: Reference tasks in commit messages
- **Sync logs**: Complete visibility into what synced and when

Requires a GitHub App installed on your account or organization. **[Setup guide →](docs/GITHUB-INTEGRATION.md)**

<img width="2300" height="1407" alt="GitHub Integration" src="https://github.com/user-attachments/assets/154b6f4f-d23f-4dcf-88db-6b374b168b4c" />

### 💾 Enterprise Backup System

Complete backup solution with enterprise-grade security:

- **AES-256-GCM encryption** at rest (optional, via `BACKUP_ENCRYPTION_KEY`)
- **SHA-256 checksum verification** to detect tampering or corruption
- **Dual-mode PostgreSQL backup**: Direct mode (network) or Docker mode (container exec)
- **Scheduled backups** with cron-style scheduling (internal or external triggers)
- **Smart retention policies**: Keep last N daily/weekly/monthly backups
- **Database restore wizard** with pre-restore backup and verification
- **Webhook notifications** with HMAC-SHA256 signed payloads
- **Multi-instance support**: Environment-based subdirectories for shared storage

---

## Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui   |
| State      | Redux Toolkit, TanStack Query                         |
| Backend    | Node.js 22, Fastify, tRPC v10, Socket.io              |
| Database   | PostgreSQL 15, Prisma ORM                             |
| AI / Graph | Kanbu Graphiti (Python/FastAPI), FalkorDB (Graph DB)  |
| Agent      | OpenClaw gateway (optional), `@kanbu/openclaw-bridge` |
| Monorepo   | pnpm workspaces, Turborepo                            |

---

## Quick Start

> **Which branch?** Clone `main` for the latest stable version. The `develop` branch contains unreleased features and may be unstable.

### Docker (recommended)

```bash
git clone https://github.com/hydro13/kanbu.git
cd kanbu/docker
cp .env.example .env
# Edit .env — CHANGE THE PASSWORDS AND JWT_SECRET!
docker compose -f docker-compose.selfhosted.yml up -d
# Open http://localhost:80
```

### Full stack with Knowledge Graph (optional)

Adds the Graphiti knowledge graph engine for semantic wiki search, contradiction detection, and D3 graph visualization. Requires an OpenAI or Anthropic API key.

```bash
cd kanbu/docker
cp .env.example .env
# Edit .env — add OPENAI_API_KEY or ANTHROPIC_API_KEY
docker compose -f docker-compose.openclaw.yml up -d
# Open http://localhost:80
```

### Manual setup

```bash
# Prerequisites: Node.js 22+, PostgreSQL 15+, pnpm 9+

git clone https://github.com/hydro13/kanbu.git
cd kanbu
pnpm install

# Setup database
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set DATABASE_URL and JWT_SECRET
cd packages/shared && pnpm db:generate && pnpm db:push && cd ../..

# Start everything
pnpm dev
# Open http://localhost:5173
```

### With OpenClaw

Add two lines to `apps/api/.env` (or `docker/.env` for Docker):

```env
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your-token-here
```

Then restart the API. The Agent tab will appear on every task.

**[Full OpenClaw setup guide →](docs/OPENCLAW.md)**

---

## Get involved

If you use OpenClaw, you're exactly who this is built for. Your feedback, bug reports, and ideas are the most valuable thing this project can get right now.

**Ways to contribute:**

- **Try it and tell me what broke** — open an [issue](https://github.com/hydro13/kanbu/issues)
- **Share your OpenClaw workflow** — what context does your agent need that Kanbu doesn't send yet?
- **Pick up a feature** — check the [roadmap](ROADMAP.md) for what's next
- **Improve the Docker setup** — make self-hosting easier for others
- **Fix something that annoys you** — PRs welcome, no permission needed

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions.

---

## Community

- 💬 [Discord](https://discord.com/channels/1461655382492446927/1461655383708799153) — ask questions, share what you're building
- 🐛 [Issues](https://github.com/hydro13/kanbu/issues) — bug reports and feature requests
- 📋 [Roadmap](ROADMAP.md) — what's planned and what's done

---

## License

MIT — use it, fork it, build on it. No strings attached.

See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/hydro13">Robin Waslander</a> — an OpenClaw user who needed this to exist.
</p>
