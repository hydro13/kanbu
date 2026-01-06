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

### Permission System (AD-Style)
- **Domain Admins** - Full system access
- **Security Groups** - Reusable permission sets
- **Workspace Groups** - Auto-generated per workspace (Members, Admins)
- **Project Groups** - Fine-grained project access
- **45+ Granular Permissions** - Control every action
- **Role Assignments** - Assign groups to workspaces/projects with roles

### Admin Panel
- **User Management** - Create, edit, disable users
- **Group Management** - Create security groups, manage memberships
- **Workspace Management** - Create and configure workspaces
- **Backup Management** - Database and source code backups
- **System Settings** - Global configuration
- **Permission Tree** - Visual permission browser

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
│   └── shared/                 # Shared code
│       ├── prisma/
│       │   ├── schema.prisma   # Database schema
│       │   └── seed-permissions.ts
│       └── src/                # Shared types
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

Kanbu uses an Active Directory-inspired permission model:

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

```
OWNER > ADMIN > MEMBER > VIEWER
```

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
| `admin` | Admin-only operations |
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

After first registration, promote a user to Domain Admin:

```sql
-- Find Domain Admins group
SELECT id FROM "Group" WHERE name = 'Domain Admins';

-- Add user to Domain Admins (replace IDs)
INSERT INTO "GroupMember" ("groupId", "userId", "role")
VALUES (<group_id>, <user_id>, 'MEMBER');
```

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
