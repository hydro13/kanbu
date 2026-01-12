# Wiki Implementation Roadmap & Status

> **Laatst bijgewerkt:** 2026-01-12
> **Huidige fase:** Fase 3 - Cross-References
> **Volgende actie:** Test BacklinksPanel in browser

---

## Fase 0: Foundation ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| WikiPage model (project) | ✅ | schema.prisma |
| WorkspaceWikiPage model | ✅ | schema.prisma |
| ProjectWikiVersion model | ✅ | Voor version history |
| WorkspaceWikiVersion model | ✅ | Voor version history |
| WikiPageStatus enum | ✅ | DRAFT, PUBLISHED, ARCHIVED |
| Graphiti sync velden | ✅ | graphitiGroupId, graphitiSynced, graphitiSyncedAt |
| projectWiki.ts router | ✅ | Full CRUD + versions |
| workspaceWiki.ts router | ✅ | Full CRUD + versions |
| wiki.permissions.ts | ✅ | view, create, edit, delete, publish, history |

---

## Fase 1: Editor Integration ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| WikiSidebar.tsx | ✅ | Tree navigation |
| WikiPageView.tsx | ✅ | View/edit met Lexical |
| WikiVersionHistory.tsx | ✅ | Version modal |
| WikiLinkPlugin.tsx | ✅ | [[wiki links]] in editor |
| WikiLinkNode.tsx | ✅ | Lexical node |
| WorkspaceWikiPage.tsx | ✅ | Volledige pagina |
| Routes in App.tsx | ✅ | /workspace/:slug/wiki/* |
| MarkdownPastePlugin | ✅ | Showdown + tables support |

---

## Fase 2: Graphiti Integration ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| Graphiti/FalkorDB opzetten | ✅ | Port 6379 (redis), 3000 (UI) |
| GraphitiService class | ✅ | apps/api/src/services/graphitiService.ts |
| Sync on wiki save | ✅ | Hooks in create/update/delete mutations |
| Entity extraction | ✅ | Rules-based (@mentions, #tasks, concepts) |
| graphiti.getBacklinks endpoint | ✅ | graphiti.ts router |
| graphiti.search endpoint | ✅ | graphiti.ts router |
| graphiti.getRelated endpoint | ✅ | graphiti.ts router |

### Vereisten voor Fase 2:
- [x] FalkorDB draaiend op MAX (kanbu-falkordb container)
- [ ] LLM-based entity extraction (future improvement)
- [x] Sync hooks in wiki routers
- [x] tRPC endpoints voor graph queries

---

## Fase 3: Cross-References ⏳ IN PROGRESS

| Item | Status | Notities |
|------|--------|----------|
| BacklinksPanel component | ✅ | components/wiki/BacklinksPanel.tsx |
| Related pages in panel | ✅ | Geïntegreerd in BacklinksPanel |
| Integratie in WikiPageView | ✅ | Toont panel onder content |
| @mentions plugin | ❌ | Lexical plugin |
| #task-refs plugin | ❌ | Link naar tasks |

---

## Fase 4: Search & Discovery (NA FASE 3)

| Item | Status | Notities |
|------|--------|----------|
| Semantic search | ❌ | Graphiti search integration |
| Wiki search UI | ❌ | In sidebar (nu placeholder) |
| Cmd+K wiki search | ❌ | CommandPalette integratie |

---

## Fase 5+: AI Features (TOEKOMST)

- Ask the Wiki (RAG)
- Auto-suggestions
- Graph visualization (D3.js)
- Temporal queries

---

## Blocking Issues

| Issue | Impact | Oplossing |
|-------|--------|-----------|
| ~~Geen Graphiti server~~ | ~~Fase 2 blocked~~ | ✅ FalkorDB draait |
| Project Wiki page mist | Minor | Kan later, workspace wiki werkt |
| ~~tRPC endpoints voor graph queries~~ | ~~Fase 3 blocked~~ | ✅ graphiti.ts router |

---

## Quick Commands

```bash
# Start Kanbu dev
bash ~/genx/v6/dev/kanbu/scripts/api.sh start
cd ~/genx/v6/dev/kanbu/apps/web && pnpm dev

# Wiki URL
http://max:5173/workspace/genx/wiki

# Graphiti docs
cat ~/genx/v6/dev/kanbu/docs/WIKI-base/GRAPHITI-IMPLEMENTATIE.md
```

---

## Changelog

| Datum | Actie |
|-------|-------|
| 2026-01-12 | Fase 0 & 1 compleet, MarkdownPastePlugin met Showdown |
| 2026-01-12 | Roadmap bestand aangemaakt |
| 2026-01-12 | FalkorDB toegevoegd aan docker-compose.yml |
| 2026-01-12 | GraphitiService.ts aangemaakt |
| 2026-01-12 | Sync hooks toegevoegd aan workspaceWiki.ts en projectWiki.ts |
| 2026-01-12 | graphiti.ts tRPC router toegevoegd (Fase 2 compleet) |
| 2026-01-12 | BacklinksPanel.tsx component aangemaakt |
| 2026-01-12 | BacklinksPanel geïntegreerd in WikiPageView.tsx |
