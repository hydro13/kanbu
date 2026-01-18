# Changelog

All notable changes to Kanbu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features

- Multi-instance deployment with Redis support
- Discord integration for notifications
- Advanced reporting and analytics dashboard
- Slack integration
- Custom fields and templates
- API v2 with GraphQL support
- Email notifications
- Team workload analytics

### In Progress

- Knowledge graph wiki improvements
- Advanced permissioning edge cases
- Performance optimization for large datasets

---

## [0.1.0-beta.4] - 2026-01-18

### Highlights

- 🔐 **Backup Encryption (Phase 4.1)** - AES-256-GCM encryption at rest
- ✅ **Backup Verification (Phase 4.4)** - SHA-256 checksum integrity verification
- 🗄️ **Shared Backup Storage** - Multiple Kanbu instances can share backup storage with environment separation
- 🛠️ **Pre-commit Hooks** - Automatic linting and formatting with Husky + lint-staged

### Added

#### Backup Encryption & Verification (Phase 4.1 + 4.4)

Enterprise-grade security for backups:

**Encryption:**

- AES-256-GCM encryption at rest
- Optional: enable by setting `BACKUP_ENCRYPTION_KEY` environment variable
- PBKDF2 key derivation from passphrase
- Random IV per file, stored in file header
- File format: `[16-byte IV][encrypted data][16-byte auth tag]`

**Verification:**

- SHA-256 checksum generated before encryption
- Checksum stored in `BackupExecution` database record
- Verify integrity before restore
- Detects tampering or corruption

**New Database Fields:**

- `is_encrypted` - Whether backup is encrypted
- `encryption_alg` - Encryption algorithm used
- `checksum` - SHA-256 hash of original file
- `checksum_alg` - Checksum algorithm used
- `verified` - Whether backup has been verified
- `verified_at` - When verification was performed

#### Dual-Mode PostgreSQL Backup

Smart detection for different deployment environments:

- **Direct mode**: Uses `pg_dump` when PostgreSQL is locally accessible
- **Docker mode**: Executes via `docker exec` when running in containers
- Auto-detects Coolify environment (container pattern matching)
- Consistent backup format across both modes

#### Shared Backup Storage

Multiple Kanbu instances can share storage:

- Configurable host path via `BACKUP_HOST_PATH` environment variable
- Environment-based subdirectories via `KANBU_ENVIRONMENT` (e.g., `dev`, `prod`)
- Backups stored in `/data/backups/{environment}/`
- Prevents backup mixing on shared storage

#### Pre-commit Hooks

Automatic code quality enforcement:

- **Husky** for git hook management
- **lint-staged** for staged file processing
- TypeScript/TSX: ESLint + Prettier
- JavaScript/JSX: Prettier
- JSON/YAML/Markdown: Prettier

### Fixed

#### tRPC Batch Requests

- Increased Fastify `maxParamLength` from 100 to 5000 characters
- Fixes 404 errors on batch requests with 5+ procedures
- Root cause: URL path exceeded 100 character limit

#### Alpine Linux Compatibility

- Use `127.0.0.1` instead of `localhost` in health checks (IPv6 resolution issue)
- Use `/bin/sh` instead of `/bin/bash` (bash not available in Alpine)
- Removed `/etc/hosts` modification attempt (Docker mounts it read-only)

#### Other Fixes

- Avatar URL double `/api` prefix issue
- Missing `BACKUP_DELETED` audit action
- Checksum and encryption fields not saving to BackupExecution
- Broken markdown/yaml formatting in community files

### Changed

#### CI/CD Pipeline

- Added Prisma generate step before typecheck and build
- Build `@kanbu/shared` package before other steps
- ESLint v9 migration with flat config
- Prettier formatting for all source files

### Technical

- 20 commits since beta.3
- New crypto module: `apps/api/src/services/backup/crypto/`
- New verification service: `apps/api/src/services/backup/verification/`
- Pre-commit hooks: ~50ms overhead per commit

### Upgrade Notes

**For existing installations:**

No breaking changes. Existing backups remain readable.

**To enable encryption:**

1. Set `BACKUP_ENCRYPTION_KEY` in environment variables
2. New backups will be encrypted automatically
3. Old backups can still be restored (backward compatible)

**For shared storage (multiple instances):**

1. Set `BACKUP_HOST_PATH` to shared directory (e.g., `/opt/kanbu-backups`)
2. Set `KANBU_ENVIRONMENT` per instance (e.g., `dev`, `prod`)
3. Each instance stores backups in its own subdirectory

---

## [0.1.0-beta.3] - 2026-01-17

### Highlights

- 🚀 **Production-Ready Docker Deployment** - Fully working self-hosted deployment
- 🔐 **Bootstrap Admin** - First user automatically becomes Domain Admin
- 🛡️ **Registration Control** - Disable self-registration via system settings

### Added

#### Bootstrap Admin Setup

First-time installation now works out of the box:

- First registered user automatically gets `ADMIN` role
- `domain-admins` group created with full system access (ACL 31)
- First user added to `domain-admins` group
- No manual database setup required

#### Registration Control

- `security.registration_enabled` setting now enforced by API
- When disabled: "Self-registration is disabled. Please contact an administrator for an invite."
- First user registration always allowed (bootstrap)

#### Project Wiki Pages UI

- New UI for project-level wiki pages

### Changed

#### Docker Deployment (Complete Overhaul)

Production deployment now fully functional:

**API Container:**

- esbuild for optimized production builds
- Automatic database migrations on startup (`api-entrypoint.sh`)
- Proper pnpm workspace structure preservation
- Correct Prisma client version (6.x)

**Web Container:**

- nginx reverse proxy for `/trpc`, `/socket.io`, `/health`
- SPA routing with fallback to `index.html`
- Gzip compression and security headers

**Coolify PaaS Support:**

- Internal networking (expose vs ports)
- Named volumes for data persistence
- Health checks for all services

### Fixed

- TypeScript build errors resolved
- Removed non-existent dependencies from lockfile
- Unix line endings for shell scripts (Alpine compatibility)
- Prisma version mismatch in production containers

### Technical

- 20 commits since beta.2
- Docker deployment tested and verified working
- Self-hosted deployment: ~1GB RAM, supports ~15 concurrent users

### Upgrade Notes

No breaking changes. Existing databases will continue to work.
New installations will automatically set up the admin user on first registration.

---

## [0.1.0-beta.2] - 2026-01-16

### Added

#### Wiki MCP Tools (Phase 17)

Complete wiki management via Claude Code MCP integration - 18 new tools.

**Project Wiki Tools (9):**

- `kanbu_list_project_wiki_pages` - List wiki pages in project
- `kanbu_get_project_wiki_page` - Get page details
- `kanbu_get_project_wiki_page_by_slug` - Get page by slug/permalink
- `kanbu_create_project_wiki_page` - Create new page
- `kanbu_update_project_wiki_page` - Update existing page
- `kanbu_delete_project_wiki_page` - Delete page
- `kanbu_get_project_wiki_versions` - Get version history
- `kanbu_get_project_wiki_version` - Get specific version
- `kanbu_restore_project_wiki_version` - Restore old version

**Workspace Wiki Tools (9):**

- Same 9 tools for workspace-level wikis

**Wiki Features:**

- Version control: Up to 20 versions per page
- Hierarchical structure: Parent/child page relationships
- Status management: Draft, Published, Archived
- Slug permalinks: Human-readable URLs
- Graphiti integration: AI entity extraction for knowledge graph
- Cross-references: `[[wiki links]]`, `@mentions`, `#task-refs`, `#tags`

#### RichTextEditor Improvements

- `initialMarkdown` prop for wiki page markdown support

### Changed

#### Editor CSS Improvements

**Tables:**

- Padding: 12px/16px → 4px/8px (more compact)
- Borders: Better visibility with `foreground/0.2`
- Headers: Thicker bottom border (2px) for visual separation
- Min-width: 100-120px → 60px

**Code Blocks:**

- Padding: 16px → 8px/12px (50% reduction)
- Line-height: 1.6 → 1.5
- Border-radius: 0.5rem → 0.375rem

### Fixed

- **BacklinksPanel.tsx**: Fixed duplicate React key warning in related pages list
- **WikiPageView.tsx**: Integrated markdown initialization

### Technical

- New files: `wiki.ts`, `wiki.test.ts`
- Lines added: ~2000
- Unit tests: 71 new tests for wiki tools
- Total MCP tools: 93+

---

## [0.1.0-beta.1] - 2026-01-16

### Added

- **Kanban Board**: Drag-and-drop task management with columns and swimlanes
- **Multiple Views**: Board, List, Calendar, Timeline views for tasks
- **Sprints & Milestones**: Sprint planning with burndown charts
- **Real-time Collaboration**: Live task updates, cursor tracking, typing indicators
- **NTFS-Style ACL System**:
  - Granular permissions (Read, Write, Execute, Delete, Permissions)
  - Permission inheritance (Workspace → Project → Task)
  - Deny-first logic with security groups
  - Complete audit logging
- **AI Integration (Claude Code)**:
  - 75+ MCP tools for task management
  - Permission inheritance for Claude Code
  - One-time secure pairing flow
  - Multi-language support
- **GitHub Integration**:
  - Bi-directional issue and PR sync
  - GitHub App with webhook support
  - Auto-link commits to tasks
- **Knowledge Wiki**:
  - Rich editor with code highlighting
  - Knowledge graph with auto-linking
  - Semantic search capabilities
  - AI-powered Q&A interface
- **Multi-AI Provider Support**:
  - OpenAI integration
  - Ollama for local models
  - LM Studio support
  - Priority fallback system
- **Time Tracking**: Estimates vs actuals tracking
- **Comments & Discussions**: Rich text comments on tasks
- **Activity Feeds**: Comprehensive audit trail
- **Documentation**:
  - README with full feature overview
  - CONTRIBUTING guide for developers
  - SECURITY policy with vulnerability reporting
  - CODE_OF_CONDUCT for community standards

### Technical Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui
- **Backend**: Node.js 22, Fastify, tRPC v10, Socket.io
- **Database**: PostgreSQL 15, Prisma ORM
- **Monorepo**: pnpm workspaces, Turborepo
- **Deployment**: Docker & Docker Compose

### Known Limitations

- Single-instance deployment only (multi-instance coming in v0.2.0)
- Some edge cases in permission calculations (will be fixed)
- Discord integration not yet available
- Advanced reporting in progress

### Breaking Changes

None - Initial beta release

---

## Roadmap

### Version 0.2.0 (Q2 2026)

- [ ] Multi-instance Redis support
- [ ] Performance optimization
- [ ] Advanced permission edge cases fixed
- [ ] Knowledge graph wiki improvements
- [ ] Email notifications

### Version 0.3.0 (Q3 2026)

- [ ] Discord integration
- [ ] Slack integration
- [ ] Advanced reporting dashboard
- [ ] Custom fields system
- [ ] Template system

### Version 1.0.0 (Q4 2026)

- [ ] API v2 with GraphQL
- [ ] Enterprise features
- [ ] Advanced analytics
- [ ] Team workload optimization
- [ ] Production-ready stability

---

## Contributing

We appreciate all contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Security

For security-related concerns, see [SECURITY.md](SECURITY.md) for responsible disclosure process.

## License

Licensed under [AGPL-3.0](LICENSE) - See LICENSE file for details.
