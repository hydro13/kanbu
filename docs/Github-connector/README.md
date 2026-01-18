# Kanbu GitHub Connector Documentation

## Documents

| Document                           | Description                           |
| ---------------------------------- | ------------------------------------- |
| [ROADMAP.md](ROADMAP.md)           | Implementation roadmap with 16 phases |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture and design     |

## Phase Completion Protocol

> **IMPORTANT:** For each completed phase, the [Phase Completion Protocol](ROADMAP.md#phase-completion-protocol) MUST be followed.

This protocol ensures that:

- All documentation stays up-to-date (ROADMAP, ARCHITECTURE, README)
- ACL features are properly registered
- MCP tools are added and documented
- CLAUDE.md is updated for cold-start sessions
- A git commit is made with consistent format

Each phase in the ROADMAP has its own **Completion Checklist** containing all steps.

## Two-Tier Architecture

The GitHub connector uses a **two-tier structure**:

| Level                 | Where                     | Who              | Functions                                   |
| --------------------- | ------------------------- | ---------------- | ------------------------------------------- |
| **Admin (Workspace)** | Admin → GitHub            | Workspace Admins | Installations, User Mapping, Repos Overview |
| **Project**           | Project Settings → GitHub | Project Managers | Repo Linking, Sync Settings, Sync Status    |

This ensures:

- One-time GitHub App installation per org/user (reused across projects)
- Centralized user mapping (GitHub login ↔ Kanbu user)
- Project-specific sync settings

## Quick Links

### Roadmap Phases

**Core (Phase 1-9):**

1. **Phase 1: Database & Infrastructure** - Prisma models (7 models incl. UserMapping)
2. **Phase 2: GitHub App & OAuth** - App installation and user mapping (Admin level)
3. **Phase 3: Repository Linking** - Link projects to repos (Project level)
4. **Phase 4: Webhook Handler** - Process GitHub events
5. **Phase 5: Issue Sync (Inbound)** - GitHub issues → Kanbu tasks
6. **Phase 6: Issue Sync (Outbound)** - Kanbu tasks → GitHub issues
7. **Phase 7: PR & Commit Tracking** - Link pull requests and commits
8. **Phase 8: Automation** - Automatic actions on GitHub events
9. **Phase 9: MCP Tools** - Claude Code integration

**Extended (Phase 10-16):** 10. **Phase 10: CI/CD Integration** - GitHub Actions, Build Status, Deploy Tracking 11. **Phase 11: Advanced Sync** - Milestones, Releases, Wiki, GitHub Projects 12. **Phase 12: Code Review Integration** - Reviews, Comments, Approvals, CODEOWNERS 13. **Phase 13: Analytics & Insights** - Cycle Time, Contributor Stats, Burndown 14. **Phase 14: Developer Experience** - VS Code Extension, CLI Tool, Git Hooks, GitHub Bot 15. **Phase 15: Multi-Repo Support** - Monorepo, Multi-Repo Projects, Cross-Repo PRs 16. **Phase 16: AI/Claude Integration** - PR Summary, Code Review AI, Release Notes, Bug Triage

### Key Features

**Core:**

- Bidirectional issue synchronization
- Pull request tracking with task linking
- Commit tracking via task references
- Feature branch creation from tasks
- Automatic task status updates
- ACL-based access control
- Full audit logging

**Extended:**

- CI/CD pipeline integration (GitHub Actions)
- Code review workflow (reviews, approvals)
- Analytics dashboard (cycle time, velocity)
- Developer tools (VS Code, CLI, Git hooks)
- AI-powered features (PR summaries, code review)
- Multi-repo and monorepo support

### ACL Permissions

**Admin Level (Workspace):**

| Action               | Required Permission |
| -------------------- | ------------------- |
| View installations   | Workspace R         |
| Manage installations | Workspace P         |
| View user mappings   | Workspace R         |
| Manage user mappings | Workspace P         |

**Project Level:**

| Action              | Required Permission |
| ------------------- | ------------------- |
| View GitHub panel   | Project R           |
| View issues/PRs     | Project R           |
| Trigger manual sync | Project W           |
| Link repository     | Project P           |
| Configure settings  | Project P           |

### Sidebar Menu

After implementation, "GitHub" appears in two locations:

**Admin Sidebar** (Workspace Admins):

```
INTEGRATIONS
└── GitHub        ← NEW (installations, user mapping, overview)
```

**Project Sidebar** (Project Settings):

```
MANAGE
├── Members
├── Board Settings
├── Import/Export
├── Webhooks
└── GitHub        ← NEW (repo linking, sync settings)
```
