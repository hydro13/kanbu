# Kanbu - Claude Code Sessie Handleiding

## Overzicht

Kanbu is een project management tool (Kanban-style) met een focus op eenvoud en self-hosting.

**Repository:** `git@github.com:hydro13/kanbu.git`

## Let Op: Dit is een Git Submodule!

Deze directory (`v6/dev/kanbu/`) is een **Git Submodule** binnen GenX. Zie de [GenX CLAUDE.md](../../CLAUDE.md) voor submodule instructies.

**Kort gezegd:**
1. Commit eerst IN deze repo (kanbu)
2. Push naar origin/main
3. Dan in GenX de submodule referentie updaten

## Architectuur

```
kanbu/
├── apps/
│   ├── api/          # Fastify + tRPC + Prisma backend
│   └── web/          # React + Vite + TailwindCSS frontend
├── packages/         # Shared packages (types, utils)
├── prisma/           # Database schema en migrations
└── docker/           # Docker deployment files
```

## Tech Stack

| Component | Technologie |
|-----------|-------------|
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui |
| State | Redux Toolkit, React Query (tRPC) |
| Backend | Fastify, tRPC, Prisma ORM |
| Database | PostgreSQL 16 |
| Auth | JWT tokens, bcrypt |
| Realtime | Socket.io (gepland) |

## Development Starten

### Vereisten

- Node.js 22+ (via pnpm)
- pnpm package manager
- Docker (voor PostgreSQL)

### 1. Database starten

```bash
# Start PostgreSQL container
cd ~/genx/v6/dev/kanbu
sudo docker compose -f docker/docker-compose.yml up -d

# Credentials:
# Host: localhost:5432
# Database: kanbu
# User: kanbu
# Password: kanbu_2025
```

### 2. pnpm PATH instellen

VSCode snap versie heeft pnpm op een aparte locatie:

```bash
export PATH="/home/robin/snap/code/217/.local/share/pnpm/nodejs/22.21.1/bin:/home/robin/snap/code/217/.local/share/pnpm:$PATH"
```

### 3. API Server starten

```bash
cd apps/api
pnpm dev

# Draait op http://localhost:3001
# Health check: http://localhost:3001/health
```

### 4. Web Frontend starten

```bash
cd apps/web
pnpm dev

# Draait op http://localhost:5173
# Netwerk: http://max:5173 (Tailscale)
```

## Database Schema

Het Prisma schema staat in `prisma/schema.prisma`. Belangrijke commando's:

```bash
cd apps/api

# Schema naar database pushen (dev)
pnpm db:push

# Prisma client genereren
pnpm db:generate

# Database seeden
pnpm db:seed
```

## Belangrijke Directories

| Pad | Beschrijving |
|-----|--------------|
| `apps/api/src/trpc/` | tRPC routers en procedures |
| `apps/api/src/services/` | Business logic (permissionService, etc) |
| `apps/web/src/pages/` | React pagina's |
| `apps/web/src/components/` | Herbruikbare UI componenten |
| `apps/web/src/store/` | Redux slices |
| `prisma/schema.prisma` | Database schema |

## Permission Systeem

Kanbu heeft een gecentraliseerd permission systeem in `apps/api/src/services/permissionService.ts`:

```typescript
// Check workspace toegang
await permissionService.requireWorkspaceAccess(userId, workspaceId, 'ADMIN')

// Check project toegang
await permissionService.requireProjectAccess(userId, projectId, 'MEMBER')

// Rollen: OWNER > ADMIN > MEMBER > VIEWER
```

## Git Commit Regels

Zie [GenX CLAUDE.md](../../CLAUDE.md) voor volledige regels.

**Kort:**
- Auteur: Robin Waslander <R.Waslander@gmail.com>
- GEEN Claude Code footer of Co-Authored-By
- Format: `<type>: <beschrijving>`
- Types: feat, fix, refactor, docs, style, test, chore

## Veelvoorkomende Problemen

| Probleem | Oplossing |
|----------|-----------|
| "Cannot find module" | Run `pnpm install` in root |
| Database connection error | Check of Docker container draait |
| "Blocked request" in browser | Vite allowedHosts is al geconfigureerd op `true` |
| Type errors na schema change | Run `pnpm db:generate` |

## Tests

```bash
# Alle tests
pnpm test

# Specifieke test file
pnpm test -- --grep "permissionService"

# Met coverage
pnpm test:coverage
```

## Productie Deployment

Zie `docker/docker-compose.selfhosted.yml` voor self-hosted deployment (max 15 users).

```bash
cd docker
cp .env.example .env  # Pas secrets aan!
docker compose -f docker-compose.selfhosted.yml up -d
```
