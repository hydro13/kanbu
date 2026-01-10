# GitHub Integratie - Implementatie Plan

## Versie: 1.1.0
## Datum: 2026-01-10
## Status: In Progress

---

## 🎯 Eerste Grote Milestone: 100% Feature Parity

### Doel

Bouw een **complete 1-op-1 replica** van GitHub Projects binnen Kanbu.

Alles wat je op GitHub kunt doen, moet je ook in Kanbu kunnen doen:
- Dezelfde layouts (Board, List, Table)
- Dezelfde keyboard shortcuts
- Dezelfde drag & drop
- Dezelfde filters en zoekfunctie
- Dezelfde bulk acties
- **Exact dezelfde ervaring**

### Waarom Feature Parity Eerst? (Drie Voordelen)

1. **Feature Parity**
   - Gebruikers kunnen naadloos overstappen
   - Het werkt precies zoals ze gewend zijn

2. **Leren van een Werkende Omgeving**
   - GitHub Projects is bewezen door miljoenen gebruikers
   - We leren hun UX patterns, shortcuts, workflows
   - Geen trial-and-error - we bouwen wat al werkt

3. **Referentie voor Kanbu's Interne Module**
   - Na het bouwen hebben we een prachtige structuur
   - We kunnen de Kanbu project-module ermee vergelijken
   - De beste features overnemen én verrijken
   - Beide modules worden beter door deze aanpak

### Architectuur

Twee project modules naast elkaar in een workspace:

```
Workspace
├── 📁 Interne Projecten (bestaande Kanbu module)
│
└── 🐙 GitHub Projecten (GitHub module - 1-op-1 met GitHub)
    └── Board, List, Table views
    └── Issues, Milestones, PRs
    └── Labels, Filters, Search
    └── Keyboard shortcuts
    └── Drag & drop
```

---

## Huidige Status

### Wat Werkt (GitHub Module)

| Feature | Status | Notities |
|---------|--------|----------|
| Repo koppelen | ✅ Werkt | Via GitHub App installatie |
| Issues sync (import) | ✅ Werkt | Bulk import + webhooks |
| Issue comments sync | ✅ Werkt | Inclusief afbeeldingen |
| Milestones sync (import) | ✅ Werkt | Bulk import + webhooks |
| PRs sync | ✅ Werkt | Read-only in Kanbu |
| Commits sync | ✅ Werkt | Read-only in Kanbu |
| Webhooks ontvangen | ✅ Werkt | Real-time updates |
| GitHub Integration pagina | ✅ Werkt | Toont alle data |

### Wat Ontbreekt (GitHub Module)

| Feature | Status | Prioriteit |
|---------|--------|------------|
| GitHub projecten in workspace lijst | ❌ Ontbreekt | HOOG |
| Volledige GitHub project UI (board view) | ❌ Ontbreekt | HOOG |
| Kanbu → GitHub sync (bi-directioneel) | ❌ Ontbreekt | HOOG |
| Visuele scheiding (iconen, kleuren) | ❌ Ontbreekt | MEDIUM |
| Project Groepen (combineren beide types) | ❌ Ontbreekt | MEDIUM |

---

## Implementatie Stappen

### Stap 1: GitHub Projecten in Workspace (HUIDIGE FOCUS)

**Doel:** GitHub repositories verschijnen als projecten in de workspace lijst.

#### Huidige Situatie

- Workspace toont alleen interne Kanbu projecten
- GitHub repos zijn gekoppeld aan Kanbu projecten via `Project.githubRepositoryId`
- Dit is de OUDE aanpak die we NIET meer volgen

#### Nieuwe Aanpak

GitHub projecten worden APART getoond in de workspace:

```
Workspace "Mijn Bedrijf"
├── 📁 Interne Projecten
│   └── (bestaande project lijst)
│
└── 🐙 GitHub Projecten
    └── (repositories gekoppeld aan deze workspace)
```

#### Database Overwegingen

Optie A: `GitHubRepository` krijgt directe `workspaceId`:
```prisma
model GitHubRepository {
  // Bestaande velden...
  workspaceId  Int?
  workspace    Workspace? @relation(fields: [workspaceId], references: [id])
}
```

Optie B: Via bestaande Project koppeling (huidige situatie):
- `GitHubRepository` → `Project` → `Workspace`
- Nadeel: afhankelijk van intern project

**Aanbeveling:** Optie A - directe koppeling voor onafhankelijkheid.

#### Te Doen

- [ ] Beslissing maken: directe workspaceId of via Project
- [ ] Database schema aanpassen indien nodig
- [ ] Workspace API uitbreiden met GitHub projecten
- [ ] Workspace UI splitsen in twee secties
- [ ] GitHub project cards ontwerpen

---

### Stap 2: GitHub Project Board View

**Doel:** Een volledige board view voor GitHub projecten (zoals Kanban).

#### Componenten

```
/workspace/:slug/github/:repoId
├── Board View (issues als kaarten)
├── List View (issues als lijst)
├── Milestones Tab
├── Pull Requests Tab
└── Settings Tab
```

#### Issues als Kaarten

GitHub issues worden getoond in kolommen:
- Kolom bepaling via **labels** (bv. `status:todo`, `status:in-progress`)
- Of via **milestone** groepering
- Of via **assignee** groepering

#### Te Doen

- [ ] Route structuur opzetten
- [ ] GitHubProjectPage component maken
- [ ] Board view component maken
- [ ] Issue card component maken
- [ ] Kolom configuratie (labels/milestones/assignees)

---

### Stap 3: Bi-directionele Sync (Kanbu → GitHub)

**Doel:** Wijzigingen in Kanbu's GitHub module worden gepusht naar GitHub.

#### Wat Synchroniseert

| Actie in Kanbu | Actie naar GitHub |
|----------------|-------------------|
| Issue title wijzigen | `PATCH /issues/:number` |
| Issue body wijzigen | `PATCH /issues/:number` |
| Issue sluiten | `PATCH /issues/:number {state: 'closed'}` |
| Issue verplaatsen (label) | `PUT /issues/:number/labels` |
| Comment toevoegen | `POST /issues/:number/comments` |
| Milestone wijzigen | `PATCH /milestones/:number` |

#### Sync Logic

```typescript
// Bij wijziging in GitHubIssue
async function syncIssueToGitHub(issueId: number, changes: Partial<GitHubIssue>) {
  const issue = await prisma.gitHubIssue.findUnique({
    where: { id: issueId },
    include: { repository: { include: { installation: true } } }
  })

  const octokit = await getInstallationOctokit(issue.repository.installation.installationId)

  await octokit.issues.update({
    owner: issue.repository.owner,
    repo: issue.repository.name,
    issue_number: issue.issueNumber,
    ...mapChangesToGitHub(changes)
  })

  // Log sync
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId: issue.repositoryId,
      action: 'issue_updated',
      direction: 'kanbu_to_github',
      entityType: 'issue',
      entityId: issue.id,
      status: 'success'
    }
  })
}
```

#### Te Doen

- [ ] Sync service voor Kanbu → GitHub
- [ ] Trigger bij wijzigingen in GitHub* tabellen
- [ ] Conflict detectie (timestamp check)
- [ ] Retry mechanisme bij failures

---

### Stap 4: UI Updates

#### Visuele Indicators

```tsx
// ProjectCard.tsx
function ProjectCard({ project }) {
  return (
    <Card>
      <CardHeader>
        {project.githubRepositoryId && (
          <GitHubIcon className="w-4 h-4 text-gray-500" />
        )}
        <span>{project.name}</span>
      </CardHeader>
    </Card>
  )
}
```

#### Sync Status

```tsx
// SyncStatus.tsx
function SyncStatus({ entityType, entityId }) {
  const { data: syncInfo } = trpc.sync.getStatus.useQuery({ entityType, entityId })

  return (
    <Badge variant={syncInfo.status}>
      {syncInfo.status === 'synced' && <CheckIcon />}
      {syncInfo.status === 'pending' && <ClockIcon />}
      {syncInfo.status === 'error' && <AlertIcon />}
      Last sync: {formatDate(syncInfo.lastSyncAt)}
    </Badge>
  )
}
```

---

## Database Migraties

### Migratie 1: GitHubRepository directe workspace koppeling (optioneel)

Als we besluiten voor Optie A (directe workspaceId):

```sql
-- AddWorkspaceIdToGitHubRepository
ALTER TABLE "GitHubRepository" ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "GitHubRepository" ADD CONSTRAINT "GitHubRepository_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE SET NULL;

-- Index voor snelle queries
CREATE INDEX "GitHubRepository_workspaceId_idx" ON "GitHubRepository"("workspaceId");
```

### Database Aanpak

De GitHub module gebruikt de bestaande `GitHub*` tabellen:
- `GitHubRepository`
- `GitHubIssue`
- `GitHubMilestone`
- `GitHubPullRequest`
- `GitHubCommit`
- `GitHubComment`

De UI wordt volledig gebouwd rondom deze tabellen voor 1-op-1 feature parity met GitHub.

---

## Testing Strategie

### Unit Tests

- [ ] `syncGitHubMilestoneToKanbu` - correct mapping
- [ ] `syncKanbuMilestoneToGitHub` - correct API calls
- [ ] Conflict detection werkt

### Integration Tests

- [ ] Full sync flow GitHub → Kanbu
- [ ] Full sync flow Kanbu → GitHub
- [ ] Webhook processing
- [ ] Error recovery

### E2E Tests

- [ ] Milestone aanmaken in GitHub → verschijnt in Kanbu
- [ ] Milestone wijzigen in Kanbu → wijzigt in GitHub
- [ ] Cross-project dependency met GitHub milestone

---

## Rollback Plan

Bij problemen:
1. Disable bi-directional sync (feature flag)
2. Fallback naar read-only mode (GitHub → Kanbu only)
3. Data is veilig in beide systemen

---

## Referenties

- [VISIE.md](./VISIE.md) - De overkoepelende visie
- [GitHub API Docs](https://docs.github.com/en/rest)
- [Prisma Docs](https://www.prisma.io/docs)
