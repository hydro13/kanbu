# Kanbu GitHub Connector Documentation

## Documenten

| Document | Beschrijving |
|----------|--------------|
| [ROADMAP.md](ROADMAP.md) | Implementatie roadmap met 9 fases |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technische architectuur en design |

## Quick Links

### Roadmap Fases

1. **Fase 1: Database & Infrastructure** - Prisma models voor GitHub integratie
2. **Fase 2: GitHub App & OAuth** - App installatie en authenticatie flow
3. **Fase 3: Repository Linking** - Projects koppelen aan repos + settings UI
4. **Fase 4: Webhook Handler** - GitHub events verwerken
5. **Fase 5: Issue Sync (Inbound)** - GitHub issues → Kanbu tasks
6. **Fase 6: Issue Sync (Outbound)** - Kanbu tasks → GitHub issues
7. **Fase 7: PR & Commit Tracking** - Pull requests en commits linken
8. **Fase 8: Automation** - Automatische acties op GitHub events
9. **Fase 9: MCP Tools** - Claude Code integratie

### Key Features

- Bidirectionele issue synchronisatie
- Pull request tracking met task linking
- Commit tracking via task references
- Feature branch creation vanuit tasks
- Automatische task status updates
- ACL-gebaseerde toegangscontrole
- Volledig audit logging

### ACL Permissions

| Actie | Vereiste Permission |
|-------|---------------------|
| GitHub panel bekijken | Project R |
| Issues/PRs bekijken | Project R |
| Manual sync triggeren | Project W |
| Repository koppelen | Project P |
| Settings configureren | Project P |

### Sidebar Menu

Na implementatie verschijnt "GitHub" in de project sidebar onder **MANAGE**:

```
MANAGE
├── Members
├── Board Settings
├── Import/Export
├── Webhooks
└── GitHub        ← NIEUW
```
