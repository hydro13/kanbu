# Kanbu MCP Server - Claude Code Integration

> **Status: Fase 3 COMPLEET** (2026-01-09)
>
> De MCP server is volledig werkend met 23 tools: pairing (3), core (11), en subtasks/comments (9).

## Overzicht

De Kanbu MCP Server is specifiek ontworpen voor **Claude Code** integratie. Via een eenvoudige pairing flow koppel je Claude Code aan je Kanbu account. Claude erft automatisch al jouw ACL rechten.

## Pairing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PAIRING FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STAP 1: Genereer Setup Code (Kanbu Profile Page)                   │
│  ─────────────────────────────────────────────────                  │
│     ┌─────────────────────────────────┐                             │
│     │ 🔗 Connect Claude Code          │                             │
│     │                                  │                             │
│     │ Your setup code:                │                             │
│     │ ┌─────────────────────────────┐ │                             │
│     │ │   KNB-A3X9-7MK2             │ │  ← One-time, 5 min TTL     │
│     │ └─────────────────────────────┘ │                             │
│     │ ⏱️ Expires in: 4:32             │                             │
│     │                                  │                             │
│     │ Tell Claude Code:               │                             │
│     │ "Connect to Kanbu with code     │                             │
│     │  KNB-A3X9-7MK2"                 │                             │
│     └─────────────────────────────────┘                             │
│                                                                      │
│  STAP 2: Vertel Claude de Code                                      │
│  ─────────────────────────────────────                              │
│     User: "Connect met Kanbu, code KNB-A3X9-7MK2"                   │
│                                                                      │
│     Claude: Ik verbind met Kanbu...                                 │
│             [exchangeSetupCode] ──────────► Kanbu API               │
│                                             ├─ Validate code        │
│             ✓ Verbonden als Robin!          ├─ Mark consumed        │
│               Je hebt Domain Admin rechten. └─ Return token         │
│                                                                      │
│  STAP 3: Permanent Verbonden                                        │
│  ─────────────────────────────────────                              │
│     • Token opgeslagen op deze machine                              │
│     • Setup code is geconsumeerd (kan niet hergebruikt worden)      │
│     • Claude kan nu namens jou werken                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Hoe Het Werkt

### Architectuur

```
                    Setup Code (eenmalig)
                           │
┌─────────────────┐        │        ┌─────────────────┐
│  Kanbu Web UI   │────────┼───────▶│  User tells     │
│  Profile Page   │        │        │  Claude Code    │
└─────────────────┘        │        └────────┬────────┘
                           │                 │
                           │                 ▼
                           │        ┌─────────────────┐
                           │        │  Claude Code    │
                           │        │  MCP Server     │
                           │        └────────┬────────┘
                           │                 │
                           │  exchangeSetupCode(code)
                           │                 │
                           ▼                 ▼
                    ┌─────────────────────────────────┐
                    │         Kanbu API               │
                    ├─────────────────────────────────┤
                    │  1. Validate setup code         │
                    │  2. Check not expired (<5 min)  │
                    │  3. Check not consumed          │
                    │  4. Mark as consumed            │
                    │  5. Generate permanent token    │
                    │  6. Create AssistantBinding     │
                    │  7. Return token to MCP         │
                    └─────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │  Permanent Token stored locally │
                    │  ~/.config/kanbu/mcp.json       │
                    └─────────────────────────────────┘
```

### Security Model

| Aspect | Setup Code | Permanent Token |
|--------|------------|-----------------|
| **Zichtbaar voor user** | Ja (in UI) | Nee (alleen lokaal) |
| **Levensduur** | 5 minuten | Permanent (tot revoke) |
| **Gebruik** | Eenmalig | Onbeperkt |
| **Format** | `KNB-XXXX-XXXX` | `ast_xxxxxx...` (256-bit) |
| **Opslag** | Database | Lokaal bestand |

## User Interface

### Profile Page - AI Assistant Sectie

**Niet verbonden:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Assistant                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Connect Claude Code to manage projects on your behalf.      │
│ Claude will inherit your permissions within Kanbu.          │
│                                                              │
│ Status: ○ Not connected                                      │
│                                                              │
│ [Generate Setup Code]                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Setup code gegenereerd:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Assistant                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Your setup code:                                             │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │          KNB-A3X9-7MK2                              │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   ⏱️ Expires in: 4:32                                        │
│                                                              │
│ Tell Claude Code:                                            │
│ "Connect to Kanbu with code KNB-A3X9-7MK2"                  │
│                                                              │
│ [Copy Code]  [Cancel]                                        │
│                                                              │
│ ⚠️ This code can only be used once and expires in 5 minutes │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Verbonden:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Assistant                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Status: ● Connected                                          │
│ Connected since: 2026-01-09 14:32                           │
│ Last used: 2 minutes ago                                    │
│ Machine: MAX (Linux)                                        │
│                                                              │
│ Your permissions Claude inherits:                            │
│ • Domain Admin (full access)                                │
│ • 3 Workspaces                                              │
│ • 12 Projects                                               │
│                                                              │
│ [Disconnect]                                                 │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ Connect another machine?                                     │
│ [Generate New Setup Code]                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Claude Code Commando's

### Eerste Keer Verbinden

```
User: Connect met Kanbu, mijn code is KNB-A3X9-7MK2

Claude: Ik verbind met Kanbu...

✓ Verbonden!
  User: Robin Waslander
  Role: Domain Admin
  Workspaces: 3
  Projects: 12

Je kunt nu vragen stellen zoals:
• "Wat zijn mijn taken?"
• "Maak een taak aan in project X"
• "Zet taak KANBU-42 op Done"
```

### Al Verbonden

```
User: Wat zijn mijn openstaande taken?

Claude: [kanbu_my_tasks]

Je hebt 4 openstaande taken:
1. KANBU-142: Implementeer MCP server (IN_PROGRESS)
2. KANBU-138: Fix login redirect bug (TODO)
3. KANBU-135: Update documentatie (TODO)
4. KANBU-130: Code review PR #42 (IN_REVIEW)
```

## Permission Inheritance

Claude erft automatisch jouw ACL rechten:

| Jouw Rol | Claude Kan |
|----------|------------|
| Domain Admin | Alles: workspaces, projecten, users beheren |
| Workspace Admin | Projecten in die workspace beheren |
| Project Manager | Taken in dat project beheren |
| Project Member | Taken lezen/bewerken waar je toegang tot hebt |
| Viewer | Alleen lezen |

Als jouw rechten veranderen, veranderen die van Claude automatisch mee.

## Beschikbare Tools

### Fase 1 - Pairing Tools (✅ Geïmplementeerd)

| Tool | Beschrijving | Status |
|------|--------------|--------|
| `kanbu_connect` | Verbind met setup code | ✅ Werkend |
| `kanbu_whoami` | Toon verbonden user en rechten | ✅ Werkend |
| `kanbu_disconnect` | Verbreek verbinding | ✅ Werkend |

### Fase 2 - Core Tools (✅ Geïmplementeerd)

| Tool | Beschrijving | Vereiste Permissie | Status |
|------|--------------|-------------------|--------|
| `kanbu_list_workspaces` | Lijst toegankelijke workspaces | R op workspace | ✅ Werkend |
| `kanbu_get_workspace` | Workspace details met projecten | R op workspace | ✅ Werkend |
| `kanbu_list_projects` | Lijst projecten in workspace | R op project | ✅ Werkend |
| `kanbu_get_project` | Project details met columns | R op project | ✅ Werkend |
| `kanbu_create_project` | Nieuw project aanmaken | W op workspace | ✅ Werkend |
| `kanbu_list_tasks` | Taken in project met filters | R op project | ✅ Werkend |
| `kanbu_get_task` | Taak details met subtasks/comments | R op task | ✅ Werkend |
| `kanbu_create_task` | Nieuwe taak aanmaken | W op project | ✅ Werkend |
| `kanbu_update_task` | Taak bewerken | W op task | ✅ Werkend |
| `kanbu_move_task` | Status/kolom wijzigen | W op task | ✅ Werkend |
| `kanbu_my_tasks` | Jouw toegewezen taken | - (eigen taken) | ✅ Werkend |

### Fase 3 - Subtask & Comment Tools (✅ Geïmplementeerd)

| Tool | Beschrijving | Vereiste Permissie | Status |
|------|--------------|-------------------|--------|
| `kanbu_list_subtasks` | Lijst subtaken voor een taak | R op project | ✅ Werkend |
| `kanbu_create_subtask` | Nieuwe subtaak aanmaken | W op project | ✅ Werkend |
| `kanbu_update_subtask` | Subtaak properties bewerken | W op project | ✅ Werkend |
| `kanbu_toggle_subtask` | Toggle TODO/DONE status | W op project | ✅ Werkend |
| `kanbu_delete_subtask` | Subtaak verwijderen | W op project | ✅ Werkend |
| `kanbu_list_comments` | Comments op een taak | R op project | ✅ Werkend |
| `kanbu_add_comment` | Comment toevoegen | W op project | ✅ Werkend |
| `kanbu_update_comment` | Eigen comment bewerken | W op project | ✅ Werkend |
| `kanbu_delete_comment` | Comment verwijderen | W op project | ✅ Werkend |

### Fase 4+ - Extended Tools (Gepland)

| Tool | Beschrijving |
|------|--------------|
| `kanbu_search_tasks` | Zoeken in taken |
| `kanbu_project_stats` | Project statistieken |
| `kanbu_bulk_update` | Bulk taak updates |

## Audit Logging

Alle acties via Claude Code worden gelogd:

```
[2026-01-09 14:45:23] Task #42 updated
  User: Robin Waslander
  Via: Claude Code (MCP)
  Machine: MAX
  Action: status changed TODO → IN_PROGRESS
```

In de UI: **Robin (via Claude)** moved task to In Progress

## Security

### Setup Code Beveiliging

- Format: `KNB-XXXX-XXXX` (12 karakters alfanumeriek)
- **One-time use**: Na consumptie onbruikbaar
- **5 minuten TTL**: Verloopt automatisch
- **Niet gevoelig**: Kan veilig mondeling gedeeld worden

### Permanent Token Beveiliging

- 256-bit random, cryptografisch veilig
- Gehashed opgeslagen in database (argon2)
- Nooit zichtbaar voor gebruiker
- Alleen opgeslagen op de machine die verbond
- Machine-specifieke binding

### Rate Limiting

- Max 100 requests per minuut per binding
- Burst: 20 requests per seconde
- Setup code attempts: max 5 per uur per user

### Token Revocation

- "Disconnect" in profile page verwijdert binding
- Admin kan bindings van users revoken
- Bij verdachte activiteit automatische revocatie

## Multi-Machine Support

Een user kan Claude Code op meerdere machines verbinden:

```
┌─────────────────────────────────────────────────────────────┐
│ Connected Machines                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ● MAX (Linux) - Connected 2026-01-09, last used: now        │
│   [Disconnect]                                               │
│                                                              │
│ ● MacBook Pro - Connected 2026-01-08, last used: yesterday  │
│   [Disconnect]                                               │
│                                                              │
│ [Generate Setup Code for New Machine]                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Installatie

### Vanuit Source

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

### Toevoegen aan Claude Code

**Via Claude CLI (aanbevolen):**

```bash
# Installeer Claude CLI indien nodig
npm install -g @anthropic-ai/claude-code

# Voeg Kanbu MCP server toe
claude mcp add kanbu -- node /path/to/kanbu/packages/mcp-server/dist/index.js

# Verifieer
claude mcp list
```

**Handmatig (settings.local.json):**

```json
{
  "mcpServers": {
    "kanbu": {
      "command": "node",
      "args": ["/path/to/kanbu/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### NPM Package (toekomstig)

```bash
npm install -g @kanbu/mcp-server
```

## Configuratie

De MCP server configuratie wordt automatisch gegenereerd bij pairing.

Na succesvolle verbinding staat in `~/.config/kanbu/mcp.json`:

```json
{
  "kanbuUrl": "http://localhost:3001",
  "token": "ast_xxxxxxxxxxxxxx",
  "machineId": "hash-of-machine-id",
  "userId": 1,
  "userName": "Robin Waslander",
  "userEmail": "robin@example.com",
  "connectedAt": "2026-01-09T14:32:00Z"
}
```

## Voorbeeld Sessie

```
User: Ik wil Claude Code verbinden met Kanbu

Claude: Om te verbinden heb ik een setup code nodig.
        Ga naar je Kanbu profile page → AI Assistant sectie
        en klik op "Generate Setup Code".

        Geef mij daarna de code (bijv. KNB-XXXX-XXXX).

User: De code is KNB-A3X9-7MK2

Claude: [kanbu_connect code="KNB-A3X9-7MK2"]

✓ Verbonden met Kanbu!

  User: Robin Waslander (robin@example.com)
  Role: Domain Admin

  Je kunt nu:
  • "Wat zijn mijn taken?" - Bekijk je toegewezen taken
  • "Maak taak X in project Y" - Nieuwe taak aanmaken
  • "Zet KANBU-42 op Done" - Status wijzigen

User: Wat zijn mijn taken?

Claude: [kanbu_my_tasks]

Je hebt 4 openstaande taken:

| Ref | Titel | Status | Project |
|-----|-------|--------|---------|
| KANBU-142 | Implementeer MCP server | IN_PROGRESS | Kanbu Dev |
| KANBU-138 | Fix login redirect bug | TODO | Kanbu Dev |
| KANBU-135 | Update documentatie | TODO | Kanbu Dev |
| KANBU-130 | Code review PR #42 | IN_REVIEW | Kanbu Dev |

User: Zet KANBU-138 op In Progress

Claude: [kanbu_move_task taskId=138 status="IN_PROGRESS"]

✓ KANBU-138 "Fix login redirect bug" is nu In Progress.
```

## Roadmap

Zie [ROADMAP.md](./ROADMAP.md) voor de implementatie planning.

## Technisch Ontwerp

Zie [PLAN.md](./PLAN.md) voor de technische architectuur.

## Links

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Kanbu ACL Documentatie](../ACL/README.md)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
