
# Kanbu

**Self-hosted project management with enterprise permissions and AI superpowers.**

> Tell Claude what you want. It plans the work, estimates hours, creates subtasks, builds the features, and tracks its own progress. You review.
>
> [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
> [![GitHub release (latest by date)](https://img.shields.io/github/v/release/hydro13/kanbu?label=version&color=brightgreen)](https://github.com/hydro13/kanbu/releases)
> [![GitHub last commit](https://img.shields.io/github/last-commit/hydro13/kanbu)](https://github.com/hydro13/kanbu/commits)
> [![GitHub issues](https://img.shields.io/github/issues/hydro13/kanbu)](https://github.com/hydro13/kanbu/issues)
> [![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
> [![Status: Beta](https://img.shields.io/badge/Status-Beta-yellow)](https://github.com/hydro13/kanbu/releases)

<img width="2428" height="1846" alt="image" src="https://github.com/user-attachments/assets/6cd89fcd-2afa-44c1-a200-8cef163e8c31" />


---

## Why Kanbu?

Most project management tools are either **too simple** (Trello) or **too complex** (Jira). And none of them understand AI-native workflows.

Kanbu is different:

| Problem | Kanbu Solution |
|---------|----------------|
| "I need enterprise permissions but Trello doesn't have them" | NTFS-style ACL with inheritance, deny rules, and security groups |
| "I want AI to help but it can't access my tasks" | 131 MCP tools - Claude Code works directly in your board |
| "GitHub issues and my PM tool are never in sync" | Bi-directional GitHub sync with webhook integration |
| "I want to self-host but lose features" | Community edition has MORE features than most paid tools |
| "My team speaks different languages" | Each user talks to their own AI assistant in their own language |

---

## Features

### 🎯 Project Management
- **Kanban boards** with drag-and-drop, swimlanes, and WIP limits
- **Multiple views**: Board, List, Calendar, Timeline
- **Sprints & Milestones** with burndown charts
- **Time tracking** with estimates vs. actuals
- **Real-time collaboration** - see cursors, typing indicators, live sync

  <img width="2300" height="1407" alt="image" src="https://github.com/user-attachments/assets/c301f168-2e77-4b44-9c3a-45c4a38f2167" />


### 🔐 Enterprise Security (NTFS-Style ACL)
- **Granular permissions**: Read, Write, Execute, Delete, Permissions (RWXDP)
- **Inheritance**: Workspace → Project → Task permissions flow down
- **Deny-first logic**: Explicit deny overrides any grant (like NTFS)
- **Security groups**: Domain Admins, Workspace Admins, custom groups
- **Permission Matrix**: Visual grid of who can access what
- **Audit logs**: Complete trail with export to CSV/JSON

### 🤖 AI Integration (Bring Your Own AI)
- **131 MCP tools** for Claude Code integration
- **One-time pairing**: Generate code, tell Claude, done
- **Permission inheritance**: Claude gets YOUR permissions, nothing more
- **Natural language**: "Create a task for the login bug" → It happens
- **Multi-language**: Each user talks to Claude in their own language
- **Full audit trail**: Every AI action logged as "via Claude Code"

### 🐙 GitHub Integration
- **Bi-directional sync**: Issues, PRs, commits, milestones
- **GitHub App**: Full webhook support for real-time updates
- **User mapping**: Link GitHub users to Kanbu users
- **Auto-link commits**: Reference tasks in commit messages
- **Sync logs**: Complete visibility into what synced and when

<img width="2300" height="1407" alt="image" src="https://github.com/user-attachments/assets/154b6f4f-d23f-4dcf-88db-6b374b168b4c" />


### 📚 Knowledge Wiki
- **Workspace & Project wikis** with rich editor
- **Knowledge Graph**: Entities, relationships, auto-linking
- **Temporal queries**: "What did we know about X in January?"
- **Hybrid search**: Keyword + semantic + graph traversal
- **Ask the Wiki**: Natural language Q&A over your documentation
- **Contradiction detection**: Flags conflicting information

### 🔌 AI Provider Flexibility
- **Multiple providers**: OpenAI, Ollama, LM Studio
- **Capability routing**: Different models for embedding/reasoning/vision
- **Priority fallback**: If one fails, next one takes over
- **Local-first option**: Run everything on Ollama, no cloud required

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

## Claude Code Setup

Connect your Claude Code to manage projects with natural language:

### 1. Build the MCP Server

```bash
cd packages/mcp-server
pnpm install && pnpm build
```

### 2. Add to Claude Code

```bash
claude mcp add kanbu -- node /path/to/kanbu/packages/mcp-server/dist/index.js
```

### 3. Connect

1. Go to Profile → AI Assistant
2. Click "Generate Setup Code"
3. Tell Claude: *"Connect to Kanbu with code KNB-XXXX-XXXX"*

### 4. Start Working

```
You: "Create a project for the new website redesign"
Claude: [creates project, sets up columns, adds milestones]

You: "Add tasks for responsive design, about 8 hours total"
Claude: [creates tasks with estimates, breaks into subtasks]

You: "What's blocking the homepage task?"
Claude: [queries dependencies, shows blockers]
```

**131 tools available** - workspaces, projects, tasks, subtasks, comments, search, analytics, user management, groups, ACL, invites, audit logs, and more.

---
<img width="2526" height="1409" alt="image" src="https://github.com/user-attachments/assets/bd4dda90-b975-42e0-90fd-d5c18e8d609c" />


---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui |
| State | Redux Toolkit, TanStack Query |
| Backend | Node.js 22, Fastify, tRPC v10, Socket.io |
| Database | PostgreSQL 15, Prisma ORM |
| AI | MCP Protocol, OpenAI/Ollama/LM Studio |
| Monorepo | pnpm workspaces, Turborepo |

---

## Project Structure

```
kanbu/
├── apps/
│   ├── api/              # Backend (Fastify + tRPC + Socket.io)
│   └── web/              # Frontend (React + Vite)
├── packages/
│   ├── shared/           # Database schema, shared types
│   └── mcp-server/       # Claude Code integration (131 tools)
├── docker/               # Self-hosted deployment
└── docs/                 # Documentation
```

---

## Roadmap

- [x] Kanban boards with real-time sync
- [x] NTFS-style permission system
- [x] Claude Code MCP integration (131 tools)
- [x] GitHub bi-directional sync
- [x] Knowledge graph wiki
- [x] Multi-AI provider support
- [ ] Slack/Discord integration
- [ ] Email notifications
- [ ] Custom fields
- [ ] Advanced reporting
- [ ] API v2 with GraphQL

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

```bash
# Development
pnpm dev          # Start all apps
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript checks
pnpm test         # Run tests
```

---

## License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

- ✅ Use, modify, and distribute freely
- ✅ Commercial use allowed
- ⚠️ Modified versions must be open-sourced
- ⚠️ Network use = distribution (must share source)

See [LICENSE](LICENSE) for details.

---

## Support


- 💬 Discord Community - Soon
- 🐛 [Issue Tracker](https://github.com/hydro13/kanbu/issues)
- 📧 [Email](mailto:r.waslander@gmail.com)

---

<p align="center">
  <b>Kanbu</b> - Project management for the AI era<br>
  Built with ❤️ by <a href="https://github.com/hydro13">Robin Waslander</a>
</p>







# Kanbu

**Open-source Project Management Platform**

A modern, self-hostable project management tool with Kanban boards, real-time collaboration, and Active Directory-style permission management.

## Features

### Core Functionality
- **Kanban Boards** - Drag-and-drop task management with columns and swimlanes
- **Projects & Workspaces** - Organize work in hierarchical structures
- **Sprints & Milestones** - Agile planning with burndown charts
- **Time Tracking** - Track time spent on tasks with estimates
- **Tags & Categories** - Flexible task organization
- **Comments & Attachments** - Collaborate with rich discussions
- **Activity Feed** - Full audit trail of all changes

### Real-Time Collaboration
- **Live task sync** - Changes appear instantly for all users
- **Presence indicators** - See who's online on the board
- **Live cursors** - See where other users are pointing
- **Typing indicators** - "X is typing..." in comments
- **Edit locking** - Prevents conflicts when multiple users edit

### Permission System (NTFS/AD-Style ACL)
- **ACL-based Authorization** - NTFS-style Access Control Lists with bitmask permissions
- **RWXDP Permissions** - Read, Write, Execute, Delete, Permissions (manage ACL)
- **Permission Inheritance** - Workspace permissions inherit to projects
- **Deny-first Logic** - Explicit deny entries override grants (like NTFS)
- **Domain Admins** - Full system access via ACL or group membership
- **Security Groups** - Reusable permission sets with ACL entries
- **Workspace & Project Roles** - OWNER, ADMIN/MANAGER, MEMBER, VIEWER

### Admin Panel
- **User Management** - Create, edit, disable users
- **Group Management** - Create security groups, manage memberships
- **ACL Manager** - Grant/revoke permissions with presets (Read-Only, Contributor, Editor, Full Control)
- **Bulk ACL Operations** - Bulk grant/revoke, copy permissions, apply templates
- **Permission Matrix** - Grid view of principals × resources with effective permissions
- **Effective Permissions Calculator** - Debug tool showing why a user has specific permissions
- **What-If Simulator** - Preview ACL changes before applying them
- **ACL Import/Export** - Backup and restore ACL configuration (JSON/CSV)
- **Permission Tree** - Visual permission browser with effective permissions
- **Audit Logs** - Security audit trail with filtering, export (CSV/JSON), scoped access
- **Workspace Management** - Create and configure workspaces
- **Backup Management** - Database and source code backups to Google Drive
- **System Settings** - Global configuration

### API & Integrations
- **Scoped API Keys** - Create tokens with USER, WORKSPACE, or PROJECT scope
- **Service Accounts** - Standalone identities for CI/CD and integrations
- **Dual Authentication** - Both JWT sessions and API keys supported
- **Audit Logging** - All API key events logged (create, use, revoke)

### AI Assistant (Claude Code Integration)
- **MCP Server** - Model Context Protocol server with **131 tools** for Claude Code
- **One-time Setup Code** - Secure pairing flow (KNB-XXXX-XXXX format, 5-min TTL)
- **Permission Inheritance** - Claude inherits your ACL permissions
- **Multi-machine Support** - Connect from multiple workstations
- **Machine Binding** - Tokens bound to specific machines for security
- **Audit Trail** - All Claude actions logged with "via Claude Code" marker
- **Full CRUD Operations** - Manage workspaces, projects, tasks, subtasks, comments
- **Search & Activity** - Full-text search, activity timeline, statistics
- **Analytics** - Project stats, velocity, cycle time, team workload
- **User Management** - List, create, update, delete users; reset passwords; manage 2FA
- **Group Management** - Security groups, memberships, workspace admin groups
- **ACL Management** - Grant/deny/revoke permissions, bulk operations, templates, what-if simulation
- **Invite Management** - Send, cancel, resend invitations
- **Audit Logs** - Query, export, statistics for audit trail
- **System Admin** - Settings management, database/source backups, workspace admin

## Quick Start

```bash
# Ensure Node.js v22+
nvm use

# Install dependencies
pnpm install

# Setup database
cd packages/shared
pnpm db:generate
pnpm db:push

# Start development
cd ../..
pnpm dev
```

## Project Structure

```
kanbu/
├── apps/
│   ├── api/                    # Backend (Fastify + tRPC + Socket.io)
│   │   └── src/
│   │       ├── lib/            # Business logic
│   │       ├── permissions/    # Permission definitions & middleware
│   │       ├── services/       # Core services (permissions, groups)
│   │       ├── socket/         # WebSocket handlers
│   │       ├── routes/         # REST endpoints (avatars, etc.)
│   │       └── trpc/
│   │           └── procedures/ # tRPC API endpoints
│   │
│   └── web/                    # Frontend (React + Vite)
│       └── src/
│           ├── components/     # UI components
│           │   ├── admin/      # Admin panel components
│           │   ├── board/      # Kanban board
│           │   ├── task/       # Task detail views
│           │   └── ui/         # Shadcn/ui components
│           ├── hooks/          # React hooks
│           ├── pages/
│           │   ├── admin/      # Admin panel pages
│           │   ├── dashboard/  # User dashboard
│           │   └── profile/    # User profile pages
│           └── store/          # Redux slices
│
├── packages/
│   ├── shared/                 # Shared code
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed-permissions.ts
│   │   └── src/                # Shared types
│   │
│   └── mcp-server/             # Claude Code MCP integration (131 tools)
│       └── src/
│           ├── index.ts        # MCP server entry point (v2.0.0)
│           ├── tools.ts        # Shared helpers and types
│           ├── tools/          # Tool handlers by phase
│           │   ├── workspaces.ts  # Fase 2: Workspace tools
│           │   ├── projects.ts    # Fase 2: Project tools
│           │   ├── tasks.ts       # Fase 2: Task tools
│           │   ├── subtasks.ts    # Fase 3: Subtask tools
│           │   ├── comments.ts    # Fase 3: Comment tools
│           │   ├── search.ts      # Fase 4: Search tools
│           │   ├── activity.ts    # Fase 4: Activity tools
│           │   ├── analytics.ts   # Fase 5: Analytics tools
│           │   ├── admin.ts       # Fase 6: User Management tools
│           │   ├── groups.ts      # Fase 7: Group Management tools
│           │   ├── acl.ts         # Fase 8: ACL Management tools
│           │   ├── invites.ts     # Fase 9: Invite tools
│           │   ├── audit.ts       # Fase 10: Audit Log tools
│           │   └── system.ts      # Fase 11: System/Backup tools
│           ├── storage.ts      # Token storage
│           ├── client.ts       # Kanbu API client
│           └── machine.ts      # Machine ID generation
│
├── docker/                     # Docker deployment
│   ├── docker-compose.yml      # Development
│   └── docker-compose.selfhosted.yml
│
└── docs/                       # Documentation
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui |
| State | Redux Toolkit, TanStack Query (React Query) |
| Backend | Node.js 22, Fastify, tRPC v10 |
| Real-time | Socket.io |
| Database | PostgreSQL 15, Prisma ORM |
| Monorepo | pnpm workspaces, Turborepo |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run tests |

### Database Commands (in `packages/shared`)

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Environment Variables

### API (`apps/api/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | Yes |
| `PORT` | API port (default: 3001) | No |
| `REDIS_URL` | Redis for multi-instance scaling | No |

### Web (`apps/web/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_WS_URL` | WebSocket URL | Yes |

## Self-Hosted Deployment

### Docker Compose

```bash
cd docker
cp .env.example .env
# Edit .env - change passwords and JWT_SECRET!
docker compose -f docker-compose.selfhosted.yml up -d
```

### Manual Deployment

1. Setup PostgreSQL database
2. Configure environment variables
3. Build: `pnpm build`
4. Run API: `node apps/api/dist/index.js`
5. Serve web: Static files from `apps/web/dist/`

## Permission System

Kanbu uses an NTFS/Active Directory-inspired ACL (Access Control List) model:

### ACL Permissions (Bitmask)

| Bit | Permission | Value | Description |
|-----|------------|-------|-------------|
| R | Read | 1 | View resource |
| W | Write | 2 | Modify resource |
| X | Execute | 4 | Perform actions (reserved) |
| D | Delete | 8 | Remove resource |
| P | Permissions | 16 | Manage ACL entries |

### Permission Presets

| Preset | Permissions | Bitmask | Use Case |
|--------|-------------|---------|----------|
| READ_ONLY | R | 1 | Viewers |
| CONTRIBUTOR | RWX | 7 | Team members |
| EDITOR | RWXD | 15 | Managers |
| FULL_CONTROL | RWXDP | 31 | Owners/Admins |

### ACL Features

- **Deny-first logic** - Explicit deny entries override any grants (like NTFS)
- **Inheritance** - Workspace permissions inherit to child projects
- **Principal types** - Users and Groups can have ACL entries
- **Resource types** - workspace, project, admin, profile

### Group Types

| Type | Description |
|------|-------------|
| `SYSTEM` | Built-in groups (Domain Admins, Domain Users) |
| `WORKSPACE` | Auto-created workspace member group |
| `WORKSPACE_ADMIN` | Auto-created workspace admin group |
| `PROJECT` | Auto-created project member group |
| `CUSTOM` | User-created security groups |

### Built-in Groups

- **Domain Admins** - Full system access, can manage everything
- **Domain Users** - All registered users, basic access

### Role Hierarchy

**Workspace roles:**
```
OWNER > ADMIN > MEMBER > VIEWER
```

**Project roles:**
```
OWNER > MANAGER > MEMBER > VIEWER
```

### Role to ACL Mapping

| Role | Workspace ACL | Project ACL |
|------|---------------|-------------|
| OWNER | FULL_CONTROL (31) | FULL_CONTROL (31) |
| ADMIN | FULL_CONTROL (31) | - |
| MANAGER | - | EDITOR (15) |
| MEMBER | CONTRIBUTOR (7) | CONTRIBUTOR (7) |
| VIEWER | READ_ONLY (1) | READ_ONLY (1) |

## Real-Time Scaling

| Mode | Concurrent Users | Redis Required |
|------|------------------|----------------|
| Single instance | ~50 | No |
| Multi-instance | Hundreds | Yes |

## API Documentation

The API uses tRPC for type-safe client-server communication. Main routers:

| Router | Description |
|--------|-------------|
| `auth` | Login, register, session management |
| `workspace` | Workspace CRUD and members |
| `project` | Project management |
| `task` | Task CRUD, assignments, status |
| `column` | Board columns |
| `comment` | Task comments |
| `group` | Group management |
| `acl` | ACL management (grant, revoke, list permissions) |
| `auditLog` | Audit log queries (list, stats, export) |
| `apiKey` | API key management (create, revoke, list with scopes) |
| `assistant` | AI Assistant pairing and management |
| `admin` | Admin-only operations (backups, system settings) |
| `user` | User profile and settings |

## Development

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 15+
- (Optional) Redis for scaling

### First Time Setup

```bash
# Clone and install
git clone <repo>
cd kanbu
pnpm install

# Setup database
createdb kanbu
cd packages/shared
cp ../../apps/api/.env.example ../../apps/api/.env
# Edit .env with your DATABASE_URL
pnpm db:push
pnpm db:seed  # Optional: seed permissions

# Start development
cd ../..
pnpm dev
```

### Creating an Admin User

After first registration, grant admin access via ACL:

```sql
-- Option 1: Grant ACL admin access (recommended)
INSERT INTO "AclEntry" (
  "resourceType", "resourceId", "principalType", "principalId",
  "permissions", "deny", "inheritToChildren", "createdById"
)
VALUES (
  'admin', NULL, 'user', <user_id>,
  31, false, true, <user_id>
);

-- Option 2: Add to Domain Admins group (legacy)
INSERT INTO "GroupMember" ("groupId", "userId", "role")
SELECT id, <user_id>, 'MEMBER'
FROM "Group" WHERE name = 'Domain Admins';
```

The ACL entry grants Full Control (31 = RWXDP) on admin resources.

## AI Assistant Setup (Claude Code)

Connect Claude Code to manage your Kanbu projects with **131 available tools** across 12 phases:

### Available Tools (131 total)

| Phase | Category | Tools | Examples |
|-------|----------|-------|----------|
| **1** | Pairing | 3 | `kanbu_connect`, `kanbu_whoami`, `kanbu_disconnect` |
| **2** | Core | 11 | `kanbu_list_workspaces`, `kanbu_create_task`, `kanbu_my_tasks` |
| **3** | Subtasks & Comments | 9 | `kanbu_create_subtask`, `kanbu_toggle_subtask`, `kanbu_add_comment` |
| **4** | Search & Activity | 5 | `kanbu_search_tasks`, `kanbu_search_global`, `kanbu_recent_activity` |
| **5** | Analytics | 4 | `kanbu_project_stats`, `kanbu_velocity`, `kanbu_team_workload` |
| **6** | User Management | 11 | `kanbu_list_users`, `kanbu_create_user`, `kanbu_reset_password` |
| **7** | Groups | 10 | `kanbu_list_groups`, `kanbu_create_group`, `kanbu_add_group_member` |
| **8** | ACL | 20 | `kanbu_grant_permission`, `kanbu_bulk_grant`, `kanbu_simulate_change` |
| **9** | Invites | 5 | `kanbu_list_invites`, `kanbu_send_invite`, `kanbu_cancel_invite` |
| **10** | Audit Logs | 5 | `kanbu_list_audit_logs`, `kanbu_audit_stats`, `kanbu_export_audit_logs` |
| **11** | System | 12 | `kanbu_get_settings`, `kanbu_create_db_backup`, `kanbu_admin_list_workspaces` |
| **12** | Profile | 36 | `kanbu_get_profile`, `kanbu_setup_2fa`, `kanbu_create_api_token` |

### 1. Build the MCP Server

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

### 2. Add to Claude Code

```bash
claude mcp add kanbu -- node /path/to/kanbu/packages/mcp-server/dist/index.js
```

### 3. Connect

1. Go to your Kanbu profile page → AI Assistant section
2. Click "Generate Setup Code"
3. Tell Claude: "Connect to Kanbu with code KNB-XXXX-XXXX"

### Example Usage

```
User: What are my tasks?
Claude: [kanbu_my_tasks] → Shows all your assigned tasks

User: Create a task "Fix login bug" in project Kanbu Dev
Claude: [kanbu_create_task] → Creates the task and returns reference

User: Show me project statistics
Claude: [kanbu_project_stats] → Shows completion rate, trends, workload

User: List all users in the system
Claude: [kanbu_list_users] → Shows users with status and roles

User: Grant read access to user john on workspace Product
Claude: [kanbu_grant_permission] → Creates ACL entry with READ permissions

User: Create a database backup
Claude: [kanbu_create_db_backup] → Saves backup to Google Drive
```

For detailed documentation, see [docs/MCP/ROADMAP.md](docs/MCP/ROADMAP.md).

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See the [LICENSE](LICENSE) file for the full license text.

### What this means:

- You can use, modify, and distribute this software
- If you modify and distribute it, you must release your changes under AGPL-3.0
- **Network use is distribution**: If you run a modified version as a web service, you must provide the source code to users
- Commercial use is allowed, but copyleft obligations apply

For commercial licensing options without copyleft requirements, contact the author.

---

## Author

**Robin Waslander**
Mblock BV
Email: R.Waslander@gmail.com

---

*Kanbu - Modern Project Management*




