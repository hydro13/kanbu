# Kanbu GitHub Connector Documentation

## Documenten

| Document | Beschrijving |
|----------|--------------|
| [ROADMAP.md](ROADMAP.md) | Implementatie roadmap met 16 fases |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technische architectuur en design |

## Fase Completion Protocol

> **BELANGRIJK:** Bij elke voltooide fase MOET het [Fase Completion Protocol](ROADMAP.md#fase-completion-protocol) worden doorlopen.

Dit protocol zorgt ervoor dat:
- Alle documentatie up-to-date blijft (ROADMAP, ARCHITECTURE, README)
- ACL features correct worden geregistreerd
- MCP tools worden toegevoegd en gedocumenteerd
- CLAUDE.md bijgewerkt wordt voor cold-start sessies
- Een git commit wordt gemaakt met consistente format

Elke fase in de ROADMAP heeft een eigen **Completion Checklist** die alle stappen bevat.

## Twee-Tier Architectuur

De GitHub connector gebruikt een **twee-tier structuur**:

| Niveau | Waar | Wie | Functies |
|--------|------|-----|----------|
| **Admin (Workspace)** | Admin → GitHub | Workspace Admins | Installations, User Mapping, Repos Overview |
| **Project** | Project Settings → GitHub | Project Managers | Repo Linking, Sync Settings, Sync Status |

Dit zorgt voor:
- Eenmalige GitHub App installatie per org/user (hergebruik over projecten)
- Centrale user mapping (GitHub login ↔ Kanbu user)
- Project-specifieke sync instellingen

## Quick Links

### Roadmap Fases

**Core (Fase 1-9):**
1. **Fase 1: Database & Infrastructure** - Prisma models (7 models incl. UserMapping)
2. **Fase 2: GitHub App & OAuth** - App installatie en user mapping (Admin niveau)
3. **Fase 3: Repository Linking** - Projects koppelen aan repos (Project niveau)
4. **Fase 4: Webhook Handler** - GitHub events verwerken
5. **Fase 5: Issue Sync (Inbound)** - GitHub issues → Kanbu tasks
6. **Fase 6: Issue Sync (Outbound)** - Kanbu tasks → GitHub issues
7. **Fase 7: PR & Commit Tracking** - Pull requests en commits linken
8. **Fase 8: Automation** - Automatische acties op GitHub events
9. **Fase 9: MCP Tools** - Claude Code integratie

**Extended (Fase 10-16):**
10. **Fase 10: CI/CD Integratie** - GitHub Actions, Build Status, Deploy Tracking
11. **Fase 11: Geavanceerde Sync** - Milestones, Releases, Wiki, GitHub Projects
12. **Fase 12: Code Review Integratie** - Reviews, Comments, Approvals, CODEOWNERS
13. **Fase 13: Analytics & Insights** - Cycle Time, Contributor Stats, Burndown
14. **Fase 14: Developer Experience** - VS Code Extension, CLI Tool, Git Hooks, GitHub Bot
15. **Fase 15: Multi-Repo Support** - Monorepo, Multi-Repo Projects, Cross-Repo PRs
16. **Fase 16: AI/Claude Integratie** - PR Summary, Code Review AI, Release Notes, Bug Triage

### Key Features

**Core:**
- Bidirectionele issue synchronisatie
- Pull request tracking met task linking
- Commit tracking via task references
- Feature branch creation vanuit tasks
- Automatische task status updates
- ACL-gebaseerde toegangscontrole
- Volledig audit logging

**Extended:**
- CI/CD pipeline integratie (GitHub Actions)
- Code review workflow (reviews, approvals)
- Analytics dashboard (cycle time, velocity)
- Developer tools (VS Code, CLI, Git hooks)
- AI-powered features (PR summaries, code review)
- Multi-repo en monorepo ondersteuning

### ACL Permissions

**Admin Niveau (Workspace):**

| Actie | Vereiste Permission |
|-------|---------------------|
| Installations bekijken | Workspace R |
| Installations beheren | Workspace P |
| User mappings bekijken | Workspace R |
| User mappings beheren | Workspace P |

**Project Niveau:**

| Actie | Vereiste Permission |
|-------|---------------------|
| GitHub panel bekijken | Project R |
| Issues/PRs bekijken | Project R |
| Manual sync triggeren | Project W |
| Repository koppelen | Project P |
| Settings configureren | Project P |

### Sidebar Menu

Na implementatie verschijnt "GitHub" op twee locaties:

**Admin Sidebar** (Workspace Admins):
```
INTEGRATIONS
└── GitHub        ← NIEUW (installations, user mapping, overview)
```

**Project Sidebar** (Project Settings):
```
MANAGE
├── Members
├── Board Settings
├── Import/Export
├── Webhooks
└── GitHub        ← NIEUW (repo linking, sync settings)
```
