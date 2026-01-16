# Kanbu Rich Text Editor

## Overview

This document describes the architecture and strategy for the rich text editor in Kanbu, based on **Lexical** (Meta's editor framework). The editor is used for all text fields that support rich content, including media, links, and cross-references to wiki pages.

> **Implementation Tracking:** See [TODO.md](./TODO.md) for current status and progress.

## Chosen Editor: Lexical

### Why Lexical?

After evaluating multiple editor frameworks, [Lexical](https://lexical.dev/) was chosen:

| Framework | Considered | Reason for/against |
|-----------|-----------|------------------|
| **Lexical** | Chosen | Extensible, performant, React-first, TypeScript, actively maintained by Meta |
| Monaco Editor | Rejected | Too heavy, primarily for code editing, not for rich text |
| TipTap | Considered | Good option, but Lexical is newer and more performant |
| Slate | Considered | More complex API, less active development |
| Quill | Rejected | Outdated, less flexible |
| Plate | Considered | Based on Slate, extra abstraction layer |
| Editor.js | Rejected | Block-based, less suitable for inline editing |

### Lexical Advantages

1. **Extensible Architecture**
   - Plugin-based system
   - Custom nodes for wiki-links, mentions, embeds
   - Modular: only load what's needed

2. **Performance**
   - Built for speed
   - Efficient with large documents
   - Minimal re-renders

3. **React Integration**
   - Native React hooks
   - Context-based state management
   - Declarative API

4. **TypeScript Support**
   - Fully typed
   - Good IDE support
   - Type-safe custom nodes

5. **Collaboration Ready**
   - Yjs integration possible
   - Real-time collaboration (future)

6. **Speech-to-Text**
   - Built-in SpeechToTextPlugin
   - Uses Web Speech API
   - Voice commands (undo, redo, etc.)

## Use Cases in Kanbu

### Phase 1: Core Editor Component

First, we build a reusable `RichTextEditor` component that can be deployed everywhere.

#### 1.1 Workspace Descriptions
- **Location**: Workspace settings, workspace overview
- **Features**:
  - Rich text formatting
  - Media embeds (images, videos)
  - Links to projects within workspace
  - Links to workspace wiki pages

#### 1.2 Project Descriptions
- **Location**: Project settings, project overview
- **Features**:
  - Rich text formatting
  - Media embeds
  - Links to tasks
  - Links to project wiki pages
  - Links to parent workspace wiki

#### 1.3 Task Context/Descriptions
- **Location**: Task detail modal/page
- **Features**:
  - Rich text formatting
  - Media embeds (screenshots, diagrams)
  - @mentions to team members
  - Links to other tasks
  - Links to wiki pages
  - Checklists (inline subtasks)

#### 1.4 Sticky Notes
- **Location**: Board view, dashboard
- **Features**:
  - Compact rich text
  - Quick formatting
  - Links
  - Color coding (existing)

### Phase 2: Wiki System

Hierarchical wiki system integrated into the module structure.

#### 2.1 Architecture
```
Workspace
├── Workspace Wiki
│   ├── Page 1
│   ├── Page 2 [[links to Page 3]]
│   └── Page 3
│
└── Project A
    ├── Project Wiki
    │   ├── Page A1 [[link to Workspace Wiki/Page 1]]
    │   └── Page A2
    └── Tasks
        └── Task 1 (context can link to wiki)
```

#### 2.2 Wiki Features
- **WYSIWYG editing** with Lexical
- **Wiki-links**: `[[Page Name]]` syntax
- **Backlinks**: Automatically show which pages link to current page
- **Tags**: `#tag` system for categorization
- **Hierarchy**: Project wikis can link to workspace wikis
- **Versioning**: History of changes
- **Media library**: Shared media per workspace/project

### Phase 3: Knowledge Graph (Foam-like)

Advanced knowledge management features.

#### 3.1 Link Intelligence
- **Bi-directional links**: Automatic backlink tracking
- **Link suggestions**: AI-powered suggestions for relevant links
- **Orphan detection**: Identify pages without links
- **Broken link detection**: Detect deleted pages

#### 3.2 Tags & Indexes
- **Tag pages**: Automatically generated pages per tag
- **Tag hierarchy**: Nested tags (`#project/frontend/components`)
- **Index pages**: Overview pages per category

#### 3.3 RAG Integration
- **Semantic search**: Search by meaning, not just keywords
- **Related content**: Automatically show related pages
- **Knowledge graph visualization**: Visual representation of connections
- **AI summaries**: Automatic summaries of pages

## Technical Specifications

### Data Model

```typescript
// Lexical stores content as JSON
interface RichTextContent {
  // Lexical editor state (JSON)
  editorState: string;
  // Plain text version for search indexing
  plainText: string;
  // Extracted links for graph building
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
- [x] Lexical package installation
- [x] Basic `RichTextEditor` component
- [x] Toolbar with formatting options
- [x] Markdown shortcuts
- [x] JSON serialization/deserialization

### Sprint 2: Media & Links
- [x] Image upload & embed
- [x] Video embed (YouTube, Vimeo)
- [x] External link support
- [x] Link preview cards

### Sprint 3: Integration
- [ ] Workspace description editor
- [ ] Project description editor
- [ ] Task context editor
- [x] Sticky notes editor
- [ ] Database migration for rich text fields

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

| Date | Version | Change |
|-------|--------|-----------|
| 2026-01-07 | 1.0 | Initial roadmap created |
