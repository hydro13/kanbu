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
- **MCP Server** - Model Context Protocol server for Claude Code
- **One-time Setup Code** - Secure pairing flow (KNB-XXXX-XXXX format, 5-min TTL)
- **Permission Inheritance** - Claude inherits your ACL permissions
- **Multi-machine Support** - Connect from multiple workstations
- **Machine Binding** - Tokens bound to specific machines for security
- **Audit Trail** - All Claude actions logged with "via Claude Code" marker

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
│   └── mcp-server/             # Claude Code MCP integration
│       └── src/
│           ├── index.ts        # MCP server entry point
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

Connect Claude Code to manage your Kanbu projects:

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

For detailed documentation, see [docs/MCP/README.md](docs/MCP/README.md).

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
