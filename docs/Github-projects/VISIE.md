# GitHub Integratie Visie

## Versie: 1.0.0
## Datum: 2026-01-10
## Auteur: Robin Waslander

---

## Kernvisie

**GitHub + Kanbu = WIN (1+1=3)**

Kanbu is een project management applicatie die volledig zelfstandig kan werken, maar ook gekoppeld kan worden aan GitHub repositories. Deze koppeling is **bi-directioneel** - wijzigingen in Kanbu verschijnen in GitHub en vice versa.

### Het Principe

> "Gebruik GitHub zoals je gewend bent. Kanbu maakt het beter. En je data is altijd van jou."

- Kanbu "fixt" GitHub niet - GitHub is excellent voor wat het doet
- Kanbu is de **orchestratielaag** bovenop GitHub
- Gebruikers werken waar ze willen - het resultaat is hetzelfde

---

## Waarom Bi-directionele Sync?

### 1. Geen Vendor Lock-in
- Alle data staat OOK in GitHub
- Stop je met Kanbu? Je project leeft door in GitHub
- Gebruikers durven eerder te starten - geen risico

### 2. Flexibele Toegang
- **Externe contributor** → alleen GitHub toegang nodig
- **Freelancer** → werkt via GitHub issues
- **Core team** → Kanbu voor de rijke ervaring
- Iedereen ziet dezelfde data

### 3. Open Source Projecten
- Publieke repo = community contributes via GitHub
- Maintainers managen via Kanbu (betere tools)
- Community hoeft Kanbu niet te kennen

### 4. Geloofwaardigheid
- Developers vertrouwen GitHub
- "Het synct met GitHub" = instant geloofwaardigheid
- Kanbu voegt waarde toe, vervangt niet

---

## Architectuur

### Eerste Grote Milestone: 100% Feature Parity

**Doel:** Bouw een complete 1-op-1 replica van GitHub Projects binnen Kanbu.

Alles wat GitHub Projects kan, moet de Kanbu GitHub Module ook kunnen:

| Feature | Status |
|---------|--------|
| Board view (Kanban) | 🔲 Te bouwen |
| List view | 🔲 Te bouwen |
| Table view | 🔲 Te bouwen |
| Issues CRUD | ✅ Sync werkt |
| Milestones CRUD | ✅ Sync werkt |
| Labels & filters | 🔲 Te bouwen |
| Keyboard shortcuts | 🔲 Te bouwen |
| Drag & drop | 🔲 Te bouwen |
| Bulk acties | 🔲 Te bouwen |
| Search | 🔲 Te bouwen |

**Waarom eerst 1-op-1? (Drie Voordelen)**

1. **Feature Parity**
   - Gebruikers kunnen naadloos overstappen
   - Geen leercurve - het werkt zoals ze gewend zijn

2. **Leren van een Werkende Omgeving**
   - GitHub Projects is bewezen en getest door miljoenen gebruikers
   - We leren hun UX patterns, keyboard shortcuts, workflows
   - Geen trial-and-error nodig - we bouwen wat al werkt

3. **Referentie voor Kanbu's Interne Module**
   - Na het bouwen hebben we een prachtige structuur
   - We kunnen de Kanbu project-module vergelijken
   - De beste features overnemen én verrijken
   - Beide modules worden beter door deze aanpak

### Twee Project Modules

**Aanpak:** De workspace krijgt twee project modules die naast elkaar bestaan:

1. **Interne Projecten Module** - bestaande Kanbu projecten
2. **GitHub Projecten Module** - 1-op-1 met GitHub Projects

| Aspect | Interne Module | GitHub Module |
|--------|----------------|---------------|
| Structuur | Kanbu-eigen ontwerp | 1-op-1 met GitHub |
| Sync | Geen externe sync | Bi-directioneel |
| Focus | Kan vrij evolueren | Feature parity eerst |

### Workspace Structuur

```
┌─────────────────── KANBU WORKSPACE ─────────────────────┐
│  Workspace: "Mijn Bedrijf"                              │
│                                                         │
│  ┌─ 📁 INTERNE PROJECTEN (Kanbu Module) ─────────────┐  │
│  │                                                    │  │
│  │  📋 design-specs                                   │  │
│  │  📋 internal-docs                                  │  │
│  │  📋 team-planning                                  │  │
│  │                                                    │  │
│  │  → Pure Kanbu structuur                           │  │
│  │  → Geen externe sync                              │  │
│  │  → Kan vrij evolueren                             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ 🐙 GITHUB PROJECTEN (GitHub Module) ─────────────┐  │
│  │                                                    │  │
│  │  🔗 webapp-frontend    ↔️ github.com/org/webapp    │  │
│  │  🔗 api-service        ↔️ github.com/org/api       │  │
│  │  🔗 component-lib      ↔️ github.com/org/components│  │
│  │                                                    │  │
│  │  → Volgt GitHub's structuur                       │  │
│  │  → Bi-directionele sync                           │  │
│  │  → Issues, Milestones, PRs, etc.                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ Project Groepen (optioneel) ─────────────────────┐  │
│  │  Groep "Frontend": webapp + component-lib + design │  │
│  │  → Combineert BEIDE types voor statistieken       │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ↕️ sync      ↕️ sync
    ┌─────────┐   ┌─────────┐
    │ GitHub  │   │ GitHub  │
    │ webapp  │   │   api   │
    └─────────┘   └─────────┘
```

### Voordelen van deze Aanpak

1. **100% Feature Parity** - GitHub module wordt een exacte replica van GitHub Projects
2. **Naadloze ervaring** - Gebruikers voelen zich meteen thuis
3. **Duidelijke code** - Gescheiden services, routes, componenten
4. **Gefaseerd bouwen** - Eerst 1-op-1, daarna Kanbu-specifieke features

### Database

De GitHub module gebruikt de bestaande `GitHub*` tabellen:

```
GitHubRepository  → Projecten
GitHubIssue       → Issues/Cards
GitHubMilestone   → Milestones
GitHubPullRequest → Pull Requests
GitHubCommit      → Commits
GitHubComment     → Comments
```

De UI en logica worden volledig gebouwd rondom deze tabellen.

---

## Wat Kanbu Toevoegt (GitHub heeft dit niet)

### 1. Workspaces
GitHub kent geen workspaces. Je hebt organizations en repositories, maar geen overkoepelende structuur.

**Kanbu:**
- Een workspace kan meerdere projecten bevatten
- Mix van GitHub én interne projecten
- Gecentraliseerd gebruikersbeheer

### 2. Project Groepen
Groepeer gerelateerde projecten samen.

**Kanbu:**
- Combineer statistieken over meerdere projecten
- Zie totale velocity, burndown, etc.
- Cross-project afhankelijkheden visualiseren

### 3. Cross-Project Dependencies
Een task in GitHub project A kan afhangen van een task in intern project B.

**In GitHub:** Je ziet alleen project A en "heeft een dependency"
**In Kanbu:** Je ziet BEIDE projecten en de volledige dependency chain

### 4. Het Totaalplaatje
GitHub toont je één repo/project tegelijk. Kanbu toont:
- Portfolio overzicht
- Resource allocatie over projecten
- Gecombineerde rapportages
- Cross-project zoeken

---

## Sync Strategie

### Entiteiten die Synchroniseren

| GitHub | Kanbu | Sync Richting |
|--------|-------|---------------|
| Repository | Project | GitHub → Kanbu (bij koppelen) |
| Issue | Task | Bi-directioneel |
| Milestone | Milestone | Bi-directioneel |
| Pull Request | PR (read-only in Kanbu) | GitHub → Kanbu |
| Commit | Commit (read-only in Kanbu) | GitHub → Kanbu |
| Comment | Comment | Bi-directioneel |
| Label | Tag | Bi-directioneel |
| Release | Release | Bi-directioneel |

### Wat NIET synchroniseert (Kanbu-only)

- Workspaces
- Project Groepen
- Cross-project dependencies naar interne projecten
- Kanbu-specifieke velden (time tracking, custom fields, etc.)
- ACL/Permissions

### Conflict Resolutie

Bij gelijktijdige wijzigingen:
1. **Timestamp vergelijking** - meest recente wint
2. **Optioneel: Merge** - voor tekstvelden (beschrijvingen, comments)
3. **Audit log** - alle wijzigingen worden gelogd

---

## Implementatie Flow

### Bij Koppelen van een Repo

1. Gebruiker selecteert GitHub repo in Kanbu
2. Kanbu maakt/update Project met `githubRepositoryId`
3. **Initial sync:**
   - Importeer alle issues → Kanbu tasks
   - Importeer alle milestones → Kanbu milestones
   - Importeer alle labels → Kanbu tags
   - Importeer alle PRs → Kanbu PRs (read-only)
4. Webhook registratie voor real-time updates

### Bij Wijziging in GitHub (via Webhook)

1. GitHub stuurt webhook naar Kanbu
2. Kanbu ontvangt en valideert
3. Update corresponderende Kanbu entiteit
4. Log in sync history

### Bij Wijziging in Kanbu

1. Gebruiker wijzigt task/milestone/etc.
2. Kanbu detecteert dat project GitHub-gekoppeld is
3. Push wijziging naar GitHub API
4. Log in sync history

---

## UI/UX Overwegingen

### Visuele Indicatoren

- **GitHub icoon** bij gekoppelde projecten
- **Sync status indicator** (synced, pending, error)
- **"Open in GitHub" link** bij alle gesyncte entiteiten
- **Verschillende kleur/badge** voor GitHub vs lokale items

### Sync Controls

- **Manual sync knop** - forceer sync nu
- **Sync history** - bekijk wat er gesynchroniseerd is
- **Conflict resolution UI** - bij merge conflicts

---

## Toekomstige Uitbreidingen

### Fase 2: GitHub Projects (Boards)
- Sync met GitHub's eigen Project boards
- Column mapping (To Do → Backlog, etc.)

### Fase 3: GitHub Actions Integration
- Zie CI/CD status in Kanbu
- Trigger workflows vanuit Kanbu

### Fase 4: Multi-Provider
- GitLab support
- Bitbucket support
- Azure DevOps support

---

## Samenvatting

Kanbu is de **orchestratielaag** bovenop GitHub (en andere providers). Het voegt waarde toe door:

1. **Workspaces** - overkoepelende structuur
2. **Project Groepen** - gecombineerde inzichten
3. **Cross-project features** - dependencies, zoeken, rapportages
4. **Betere UI/UX** - voor project management

De bi-directionele sync zorgt ervoor dat:
- Data nooit verloren gaat (GitHub backup)
- Iedereen kan werken waar ze willen
- Geen vendor lock-in
- Instant adoptie mogelijk

**De business case:**
> GitHub + Kanbu = beter dan beide apart. Je data, jouw keuze waar je werkt.
