# WIKI-base Documentation

## Overview

De Kanbu Wiki is een **knowledge management systeem** geïntegreerd op workspace- en project-niveau. Gebouwd op de Lexical rich text editor, biedt het meer dan traditionele wiki's door bi-directionele links, knowledge graph visualisatie, en AI-powered features.

```
Workspace
├── Workspace Wiki        ← Gedeelde kennis voor alle projecten
│   ├── Onboarding
│   ├── Team Guidelines
│   └── Architecture [[→ linkt naar andere pagina's]]
│
└── Project A
    └── Project Wiki      ← Project-specifieke documentatie
        ├── Technical Spec [[→ Workspace Wiki/Architecture]]
        └── API Docs
```

## Architectuur

Zie [/docs/Text-editor/](../Text-editor/) voor technische details:

| Document | Beschrijving |
|----------|--------------|
| [02-wiki-system-design.md](../Text-editor/02-wiki-system-design.md) | Hiërarchie, links, permissions |
| [03-knowledge-graph.md](../Text-editor/03-knowledge-graph.md) | Graph visualisatie, RAG, AI features |
| [05-cross-references.md](../Text-editor/05-cross-references.md) | Link types, autocomplete, hover cards |

## Features

### Geïmplementeerd (v1.1.0)

- **CRUD** - Create, read, update, delete pagina's
- **Hiërarchie** - Parent/child structuur (onbeperkte diepte)
- **Publish/Draft** - Zichtbaarheid toggle
- **Auto-slugs** - URL-friendly slugs uit titels

### Roadmap

**Fase 1: Rich Text Editor**
- [ ] Lexical editor integratie
- [ ] Media support (images, video, embeds)
- [ ] Code blocks met syntax highlighting

**Fase 2: Cross-References**
- [ ] `[[Wiki Links]]` met autocomplete
- [ ] `#TASK-123` task linking
- [ ] `@mentions` met notificaties
- [ ] `#tags` categorisatie

**Fase 3: Knowledge Graph**
- [ ] Backlinks (automatisch)
- [ ] Graph visualisatie (D3.js)
- [ ] Related content suggesties

**Fase 4: AI Integration**
- [ ] Semantic search (RAG/Qdrant)
- [ ] Auto-tagging
- [ ] Content summarization

**Fase 5: Advanced**
- [ ] Version history
- [ ] Page templates
- [ ] Permissions per page
- [ ] Export (PDF, Markdown)

## Database Schema

```prisma
model WorkspaceWikiPage {
  id          Int       @id @default(autoincrement())
  workspaceId Int
  parentId    Int?
  title       String
  slug        String
  content     String    @default("")  // Wordt Lexical JSON
  isPublished Boolean   @default(false)
  sortOrder   Int       @default(0)
  creatorId   Int?
  modifierId  Int?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Toekomstig:
  // tags        String[]
  // plainText   String    // Voor full-text search
  // versions    WikiPageVersion[]
  // outgoingLinks WikiLink[]
  // incomingLinks WikiLink[]
}
```

## API Endpoints

`trpc.workspaceWiki.*`:

| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | Query | List pages in workspace |
| `getTree` | Query | Full page hierarchy |
| `get` | Query | Single page by ID |
| `getBySlug` | Query | Page by slug |
| `create` | Mutation | Create page |
| `update` | Mutation | Update page |
| `delete` | Mutation | Delete (cascades) |
| `reorder` | Mutation | Reorder pages |

Toekomstig: `getBacklinks`, `resolveLink`, `search`, `searchSemantic`

## Frontend

```
apps/web/src/pages/workspace/
├── WorkspaceWikiPage.tsx    # Wiki overview
├── WikiPageCard             # Page card
├── CreateWikiPageModal      # Create modal
└── EditWikiPageModal        # Edit modal (→ Lexical editor)
```

## Routes

| Route | Description |
|-------|-------------|
| `/workspace/:slug/wiki` | Wiki overview |
| `/workspace/:slug/wiki/:pageSlug` | View page |

## Design Notes

> Dit document is een startpunt. Zie Text-editor docs voor de volledige visie.
> Verdere verfijning volgt.
