# Text Editor - Implementatie TODO

## Overzicht

Dit document houdt de voortgang bij van de RichTextEditor implementatie door de hele Kanbu applicatie.

De editor is gebouwd op **Lexical** (Meta's editor framework) en biedt:
- Rich text formatting (bold, italic, headings, lists)
- Media support (images, videos, embeds)
- Markdown shortcuts
- Code blocks met syntax highlighting
- Checklists
- Drag & drop media

## Implementatie Status

### Sprint 1: Foundation - VOLTOOID

- [x] Lexical packages geinstalleerd
- [x] `RichTextEditor` component gebouwd
- [x] `ToolbarPlugin` met formatting opties
- [x] `MarkdownPastePlugin` voor markdown paste support
- [x] `MediaPlugin` voor media insertie
- [x] `DraggableMediaPlugin` voor drag & drop
- [x] Custom nodes: ImageNode, VideoNode, EmbedNode
- [x] `ResizableMediaWrapper` voor media resizing
- [x] Editor theme (`theme.ts`)
- [x] Utility functions (`utils.ts`)

### Sprint 2: Sticky Notes - VOLTOOID

- [x] `StickyNoteModal.tsx` geupgrade naar RichTextEditor
- [x] Legacy content migratie (plain text -> Lexical JSON)
- [x] Rich content preview in sticky note cards

### Sprint 3: Tasks & Comments - VOLTOOID

**Task Description:**
- [x] `TaskDescription.tsx` geupgrade naar RichTextEditor
- [x] View mode met rich text rendering (read-only editor)
- [x] Edit mode met RichTextEditor
- [x] Editing presence support behouden
- [x] Auto-save functionaliteit behouden (30s interval)
- [x] Legacy plain text content support (auto-conversie)

**Comments:**
- [x] `CommentSection.tsx` AddCommentForm geupgrade naar RichTextEditor
- [x] `CommentItem` edit mode geupgrade naar RichTextEditor
- [x] Rich content weergave in comments (read-only editor)
- [x] Typing indicator compatible
- [x] Empty content detection werkt met Lexical JSON

### Sprint 4: Project & Workspace Descriptions - VOLTOOID

**Project Description:**
- [x] `ProjectSettings.tsx` geupgrade naar RichTextEditor
- [x] View mode met rich text rendering (read-only editor)
- [x] Edit mode met RichTextEditor

**Workspace Description:**
- [x] `WorkspaceSettings.tsx` geupgrade naar RichTextEditor
- [x] Edit mode met RichTextEditor

**Subtask Description:**
- [x] `SubtaskEditModal.tsx` geupgrade naar RichTextEditor

**Overview Pages (plain text display):**
- [x] `ProjectList.tsx` - Lexical JSON naar plain text voor card display
- [x] `WorkspacePage.tsx` - Lexical JSON naar plain text voor header display

### Sprint 5: Wiki System - GEPLAND

Zie [02-wiki-system-design.md](./02-wiki-system-design.md) voor details.

- [ ] WikiPage database model
- [ ] Wiki CRUD API
- [ ] `[[wiki-link]]` custom node
- [ ] Wiki navigation component
- [ ] Backlinks tracking

### Sprint 6: Knowledge Graph - GEPLAND

Zie [03-knowledge-graph.md](./03-knowledge-graph.md) voor details.

- [ ] Bi-directional links
- [ ] Tag system
- [ ] Graph visualization
- [ ] RAG integration planning

### Sprint 7: Advanced Features - GEPLAND

- [ ] Speech-to-text (Web Speech API)
- [ ] AI-powered suggestions
- [ ] @mentions
- [ ] Task/Issue linking (`#TASK-123`)

## Alle Locaties voor RichTextEditor

| Locatie | Component | Status | Sprint |
|---------|-----------|--------|--------|
| Sticky Notes | `StickyNoteModal.tsx` | VOLTOOID | 2 |
| Task Description | `TaskDescription.tsx` | VOLTOOID | 3 |
| Task Comments | `CommentSection.tsx` | VOLTOOID | 3 |
| Project Description | `ProjectSettings.tsx` | VOLTOOID | 4 |
| Workspace Description | `WorkspaceSettings.tsx` | VOLTOOID | 4 |
| Subtask Description | `SubtaskEditModal.tsx` | VOLTOOID | 4 |
| Wiki Pages | `WikiEditor.tsx` | GEPLAND | 5 |
| Activity Feed | `ActivityTab.tsx` | GEPLAND | 5 |

## Technische Details

### Component Locaties

```
apps/web/src/components/editor/
├── RichTextEditor.tsx      # Main component
├── ToolbarPlugin.tsx       # Formatting toolbar
├── MediaPlugin.tsx         # Media insertion
├── DraggableMediaPlugin.tsx # Drag & drop
├── MarkdownPastePlugin.tsx # Markdown paste
├── SpeechToTextPlugin.tsx  # Voice input
├── ResizableMediaWrapper.tsx
├── theme.ts                # Lexical theme
├── utils.ts                # Helper functions
├── editor.css              # Styles
├── index.ts                # Exports
└── nodes/
    ├── ImageNode.tsx
    ├── VideoNode.tsx
    ├── EmbedNode.tsx
    └── index.ts
```

### API

```typescript
import { RichTextEditor, getDisplayContent, isLexicalContent } from '@/components/editor'

// Basic usage
<RichTextEditor
  initialContent={content}
  onChange={(state, editor, json) => setContent(json)}
  placeholder="Start typing..."
  minHeight="150px"
  maxHeight="400px"
/>

// Read-only mode
<RichTextEditor
  initialContent={content}
  readOnly={true}
  showToolbar={false}
/>

// Content utilities
isLexicalContent(content)  // Check if Lexical JSON
getDisplayContent(content) // Convert plain text to Lexical if needed
```

### Data Storage

Content wordt opgeslagen als Lexical JSON string in de database.
Legacy plain text wordt automatisch geconverteerd bij laden.

## Changelog

| Datum | Wijziging |
|-------|-----------|
| 2026-01-09 | **Sprint 4 VOLTOOID**: ProjectSettings, WorkspaceSettings, SubtaskEditModal geupgrade naar RichTextEditor |
| 2026-01-09 | **Sprint 3 VOLTOOID**: TaskDescription en CommentSection geupgrade naar RichTextEditor |
| 2026-01-09 | Sprint 3 gestart: Task Description en Comments |
| 2026-01-07 | Sprint 2 voltooid: Sticky Notes |
| 2026-01-07 | Sprint 1 voltooid: Foundation |
| 2026-01-07 | Initial TODO created |
