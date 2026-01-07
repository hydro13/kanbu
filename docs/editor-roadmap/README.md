# Kanbu Rich Text Editor Roadmap

## Overzicht

Dit document beschrijft de strategie voor het implementeren van een krachtige rich text editor in Kanbu, gebaseerd op **Lexical** (Meta's editor framework). De editor zal worden gebruikt voor alle tekstvelden die rijke content ondersteunen, inclusief media, links, en cross-referenties naar wiki pagina's.

## Gekozen Editor: Lexical

### Waarom Lexical?

Na evaluatie van meerdere editor frameworks is gekozen voor [Lexical](https://lexical.dev/):

| Framework | Overwogen | Reden voor/tegen |
|-----------|-----------|------------------|
| **Lexical** | Gekozen | Extensible, performant, React-first, TypeScript, actief onderhouden door Meta |
| Monaco Editor | Afgewezen | Te zwaar, primair voor code editing, niet voor rich text |
| TipTap | Overwogen | Goede optie, maar Lexical is nieuwer en performanter |
| Slate | Overwogen | Complexere API, minder actieve ontwikkeling |
| Quill | Afgewezen | Verouderd, minder flexibel |
| Plate | Overwogen | Gebaseerd op Slate, extra abstractielaag |
| Editor.js | Afgewezen | Block-based, minder geschikt voor inline editing |

### Lexical Voordelen

1. **Extensible Architecture**
   - Plugin-based systeem
   - Custom nodes voor wiki-links, mentions, embeds
   - Modulair: alleen laden wat nodig is

2. **Performance**
   - Gebouwd voor snelheid
   - Efficiënt met grote documenten
   - Minimal re-renders

3. **React Integration**
   - Native React hooks
   - Context-based state management
   - Declaratieve API

4. **TypeScript Support**
   - Volledig getypeerd
   - Goede IDE ondersteuning
   - Type-safe custom nodes

5. **Collaboration Ready**
   - Yjs integratie mogelijk
   - Real-time samenwerking (toekomst)

6. **Speech-to-Text**
   - Ingebouwde SpeechToTextPlugin
   - Gebruikt Web Speech API
   - Voice commands (undo, redo, etc.)

## Use Cases in Kanbu

### Fase 1: Core Editor Component

Eerst bouwen we een herbruikbare `RichTextEditor` component die overal kan worden ingezet.

#### 1.1 Workspace Descriptions
- **Locatie**: Workspace settings, workspace overview
- **Features**:
  - Rich text formatting
  - Media embeds (images, videos)
  - Links naar projecten binnen workspace
  - Links naar workspace wiki pagina's

#### 1.2 Project Descriptions
- **Locatie**: Project settings, project overview
- **Features**:
  - Rich text formatting
  - Media embeds
  - Links naar tasks
  - Links naar project wiki pagina's
  - Links naar parent workspace wiki

#### 1.3 Task Context/Descriptions
- **Locatie**: Task detail modal/page
- **Features**:
  - Rich text formatting
  - Media embeds (screenshots, diagrams)
  - @mentions naar team members
  - Links naar andere tasks
  - Links naar wiki pagina's
  - Checklists (subtasks inline)

#### 1.4 Sticky Notes
- **Locatie**: Board view, dashboard
- **Features**:
  - Compact rich text
  - Quick formatting
  - Links
  - Color coding (bestaand)

### Fase 2: Wiki System

Hiërarchisch wiki systeem geïntegreerd in de module structuur.

#### 2.1 Architectuur
```
Workspace
├── Workspace Wiki
│   ├── Page 1
│   ├── Page 2 [[links naar Page 3]]
│   └── Page 3
│
└── Project A
    ├── Project Wiki
    │   ├── Page A1 [[link naar Workspace Wiki/Page 1]]
    │   └── Page A2
    └── Tasks
        └── Task 1 (context kan linken naar wiki)
```

#### 2.2 Wiki Features
- **WYSIWYG editing** met Lexical
- **Wiki-links**: `[[Page Name]]` syntax
- **Backlinks**: Automatisch tonen welke pagina's linken naar huidige pagina
- **Tags**: `#tag` systeem voor categorisatie
- **Hiërarchie**: Project wikis kunnen linken naar workspace wikis
- **Versioning**: Geschiedenis van wijzigingen
- **Media library**: Gedeelde media per workspace/project

### Fase 3: Knowledge Graph (Foam-achtig)

Geavanceerde knowledge management features.

#### 3.1 Link Intelligence
- **Bi-directional links**: Automatische backlink tracking
- **Link suggestions**: AI-powered suggesties voor relevante links
- **Orphan detection**: Pagina's zonder links identificeren
- **Broken link detection**: Verwijderde pagina's detecteren

#### 3.2 Tags & Indexes
- **Tag pages**: Automatisch gegenereerde pagina's per tag
- **Tag hierarchy**: Nested tags (`#project/frontend/components`)
- **Index pages**: Overzichtspagina's per categorie

#### 3.3 RAG Integration
- **Semantic search**: Zoeken op betekenis, niet alleen keywords
- **Related content**: Automatisch gerelateerde pagina's tonen
- **Knowledge graph visualization**: Visuele weergave van verbanden
- **AI summaries**: Automatische samenvattingen van pagina's

## Technische Specificaties

### Data Model

```typescript
// Lexical slaat content op als JSON
interface RichTextContent {
  // Lexical editor state (JSON)
  editorState: string;
  // Plain text versie voor search indexing
  plainText: string;
  // Extracted links voor graph building
  links: {
    wikiLinks: string[];      // [[Page Name]]
    taskLinks: string[];      // #TASK-123
    userMentions: string[];   // @username
    externalUrls: string[];   // https://...
  };
  // Media references
  media: {
    id: string;
    type: 'image' | 'video' | 'file';
    url: string;
  }[];
}
```

### Database Schema Additions

```prisma
model WikiPage {
  id            Int       @id @default(autoincrement())
  slug          String    // URL-friendly identifier
  title         String
  content       Json      // Lexical editor state
  plainText     String    // For full-text search

  // Hierarchy
  workspaceId   Int?
  workspace     Workspace? @relation(fields: [workspaceId], references: [id])
  projectId     Int?
  project       Project?   @relation(fields: [projectId], references: [id])

  // Metadata
  tags          String[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdById   Int
  createdBy     User      @relation(fields: [createdById], references: [id])

  // Versioning
  versions      WikiPageVersion[]

  // Links (for graph)
  outgoingLinks WikiLink[] @relation("FromPage")
  incomingLinks WikiLink[] @relation("ToPage")

  @@unique([workspaceId, slug])
  @@unique([projectId, slug])
}

model WikiLink {
  id          Int      @id @default(autoincrement())
  fromPageId  Int
  fromPage    WikiPage @relation("FromPage", fields: [fromPageId], references: [id])
  toPageId    Int
  toPage      WikiPage @relation("ToPage", fields: [toPageId], references: [id])

  @@unique([fromPageId, toPageId])
}

model WikiPageVersion {
  id        Int      @id @default(autoincrement())
  pageId    Int
  page      WikiPage @relation(fields: [pageId], references: [id])
  content   Json
  createdAt DateTime @default(now())
  createdById Int
  createdBy User     @relation(fields: [createdById], references: [id])
}
```

### Editor Component API

```typescript
interface RichTextEditorProps {
  // Content
  initialContent?: string;          // Lexical JSON state
  onChange?: (content: RichTextContent) => void;

  // Features toggles
  features?: {
    formatting?: boolean;           // Bold, italic, etc.
    headings?: boolean;             // H1, H2, H3
    lists?: boolean;                // Bullet, numbered, checklist
    codeBlocks?: boolean;           // Code with syntax highlighting
    media?: boolean;                // Image/video embeds
    links?: boolean;                // External links
    wikiLinks?: boolean;            // [[wiki links]]
    mentions?: boolean;             // @mentions
    tables?: boolean;               // Table support
    speechToText?: boolean;         // Voice input
  };

  // Context for link resolution
  context?: {
    workspaceId?: number;
    projectId?: number;
  };

  // Styling
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  className?: string;

  // Mode
  readOnly?: boolean;
  compact?: boolean;               // For sticky notes
}
```

## Implementation Roadmap

### Sprint 1: Foundation
- [ ] Lexical package installatie
- [ ] Basis `RichTextEditor` component
- [ ] Toolbar met formatting opties
- [ ] Markdown shortcuts
- [ ] JSON serialization/deserialization

### Sprint 2: Media & Links
- [ ] Image upload & embed
- [ ] Video embed (YouTube, Vimeo)
- [ ] External link support
- [ ] Link preview cards

### Sprint 3: Integration
- [ ] Workspace description editor
- [ ] Project description editor
- [ ] Task context editor
- [ ] Sticky notes editor
- [ ] Database migration voor rich text velden

### Sprint 4: Wiki Foundation
- [ ] WikiPage model & API
- [ ] Wiki page CRUD
- [ ] `[[wiki-link]]` node
- [ ] Basic wiki navigation

### Sprint 5: Wiki Advanced
- [ ] Backlinks tracking & display
- [ ] Tag system
- [ ] Version history
- [ ] Wiki search

### Sprint 6: Knowledge Graph
- [ ] Link graph data model
- [ ] Graph visualization component
- [ ] RAG integration planning
- [ ] Related content suggestions

### Sprint 7: Speech & AI
- [ ] Speech-to-text integration
- [ ] AI-powered link suggestions
- [ ] Auto-tagging
- [ ] Content summarization

## Dependencies

### NPM Packages
```json
{
  "lexical": "^0.17.0",
  "@lexical/react": "^0.17.0",
  "@lexical/rich-text": "^0.17.0",
  "@lexical/list": "^0.17.0",
  "@lexical/code": "^0.17.0",
  "@lexical/link": "^0.17.0",
  "@lexical/table": "^0.17.0",
  "@lexical/markdown": "^0.17.0",
  "@lexical/selection": "^0.17.0",
  "@lexical/utils": "^0.17.0"
}
```

### Optional (Future)
```json
{
  "yjs": "^13.6.0",
  "@lexical/yjs": "^0.17.0",
  "prismjs": "^1.29.0"
}
```

## Resources

- [Lexical Documentation](https://lexical.dev/docs/intro)
- [Lexical Playground](https://playground.lexical.dev/)
- [Lexical GitHub](https://github.com/facebook/lexical)
- [Speech-to-Text Plugin Source](https://github.com/facebook/lexical/tree/main/packages/lexical-playground/src/plugins/SpeechToTextPlugin)

## Revision History

| Datum | Versie | Wijziging |
|-------|--------|-----------|
| 2026-01-07 | 1.0 | Initial roadmap created |
