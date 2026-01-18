# Wiki System Design

## Overview

The Kanbu wiki system is a hierarchical knowledge management system that is integrated with the workspace and project structure. Unlike traditional wikis, this system is designed to be context-aware and create connections between documents, tasks, and users.

## Architecture

### Hierarchy

```
Kanbu Instance
│
├── Workspace A
│   ├── Workspace Wiki
│   │   ├── Onboarding Guide
│   │   ├── Team Conventions
│   │   └── Architecture Overview
│   │
│   ├── Project 1
│   │   ├── Project Wiki
│   │   │   ├── Technical Spec [[→ Workspace Wiki/Architecture Overview]]
│   │   │   ├── API Documentation
│   │   │   └── Deployment Guide
│   │   └── Tasks
│   │       └── Task #123 (context links to [[Project Wiki/API Documentation]])
│   │
│   └── Project 2
│       └── Project Wiki
│           └── ...
│
└── Workspace B
    └── ...
```

### Link Types

| Type         | Syntax                    | Example                           | Description               |
| ------------ | ------------------------- | --------------------------------- | ------------------------- |
| Wiki Link    | `[[Page Name]]`           | `[[API Documentation]]`           | Link to page in same wiki |
| Cross-Wiki   | `[[Workspace Wiki/Page]]` | `[[Workspace Wiki/Architecture]]` | Link to parent wiki       |
| Task Link    | `#TASK-123`               | `#TASK-456`                       | Link to a task            |
| User Mention | `@username`               | `@robin`                          | Mention a user            |
| Tag          | `#tag-name`               | `#frontend`                       | Categorization tag        |

## Wiki Page Model

### Core Fields

```typescript
interface WikiPage {
  // Identity
  id: number;
  slug: string; // URL-friendly: "api-documentation"
  title: string; // Display: "API Documentation"

  // Content
  content: LexicalEditorState; // Rich text JSON
  plainText: string; // For full-text search
  excerpt: string; // First 200 chars for previews

  // Hierarchy
  workspaceId?: number; // If workspace wiki page
  projectId?: number; // If project wiki page
  parentPageId?: number; // For nested pages

  // Metadata
  tags: string[];
  icon?: string; // Emoji or icon
  coverImage?: string; // Header image URL

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date; // null = draft

  // Ownership
  createdById: number;
  lastEditedById: number;

  // Permissions
  visibility: 'public' | 'workspace' | 'project' | 'private';
}
```

### Computed Fields (via relations)

```typescript
interface WikiPageWithRelations extends WikiPage {
  // Navigation
  workspace?: Workspace;
  project?: Project;
  parentPage?: WikiPage;
  childPages: WikiPage[];

  // Links
  outgoingLinks: WikiLink[]; // Pages this page links to
  incomingLinks: WikiLink[]; // Pages that link to this page (backlinks)

  // Activity
  versions: WikiPageVersion[];
  contributors: User[];
  viewCount: number;
  lastViewedAt?: Date;
}
```

## Link Resolution

### Algorithm

When a `[[Page Name]]` is resolved:

```typescript
function resolveWikiLink(
  linkText: string,
  context: { workspaceId?: number; projectId?: number }
): WikiPage | null {
  // 1. Check for explicit path
  if (linkText.includes('/')) {
    const [wikiType, pageName] = linkText.split('/');

    if (wikiType === 'Workspace Wiki' && context.workspaceId) {
      return findPage({ workspaceId: context.workspaceId, slug: toSlug(pageName) });
    }
    // ... other wiki types
  }

  // 2. Search in current context first (project wiki)
  if (context.projectId) {
    const projectPage = findPage({ projectId: context.projectId, slug: toSlug(linkText) });
    if (projectPage) return projectPage;
  }

  // 3. Search in parent context (workspace wiki)
  if (context.workspaceId) {
    const workspacePage = findPage({ workspaceId: context.workspaceId, slug: toSlug(linkText) });
    if (workspacePage) return workspacePage;
  }

  // 4. Not found - return null (broken link)
  return null;
}
```

### Link Status

```typescript
type LinkStatus =
  | 'valid' // Page exists
  | 'broken' // Page doesn't exist
  | 'no-access' // Page exists but user has no access
  | 'draft' // Page exists but is unpublished
  | 'external' // External URL
  | 'create'; // Page doesn't exist, can be created
```

## Backlinks

Backlinks are automatically tracked when content is saved.

### Extraction

```typescript
function extractLinks(editorState: LexicalEditorState): ExtractedLinks {
  const links: ExtractedLinks = {
    wikiLinks: [],
    taskLinks: [],
    userMentions: [],
    externalUrls: [],
    tags: [],
  };

  // Traverse all nodes
  editorState.read(() => {
    const root = $getRoot();
    traverseNodes(root, (node) => {
      if (node instanceof WikiLinkNode) {
        links.wikiLinks.push(node.getPageName());
      }
      if (node instanceof TaskLinkNode) {
        links.taskLinks.push(node.getTaskId());
      }
      if (node instanceof MentionNode) {
        links.userMentions.push(node.getUsername());
      }
      if (node instanceof LinkNode) {
        links.externalUrls.push(node.getURL());
      }
      if (node instanceof TagNode) {
        links.tags.push(node.getTagName());
      }
    });
  });

  return links;
}
```

### Update Flow

```
User saves page
      ↓
Extract links from content
      ↓
Compare with existing links
      ↓
┌─────────┴─────────┐
│                   │
↓                   ↓
Delete removed    Insert new
links             links
      │                   │
      └─────────┬─────────┘
                ↓
      Invalidate backlink
      cache for affected pages
```

## Tags & Indexes

### Tag System

Tags are first-class citizens in the system:

```typescript
interface Tag {
  id: number;
  name: string; // "frontend"
  slug: string; // "frontend"
  color?: string; // "#3B82F6"
  description?: string;

  // Scope
  workspaceId?: number; // Workspace-scoped tag
  isGlobal: boolean; // Instance-wide tag

  // Stats
  pageCount: number;
  taskCount: number;
}
```

### Automatic Index Pages

For each tag, a virtual index page is generated:

```typescript
interface TagIndexPage {
  tag: Tag;
  pages: WikiPage[]; // Pages with this tag
  tasks: Task[]; // Tasks with this tag
  relatedTags: Tag[]; // Tags that often appear together
}
```

### Tag Hierarchy

Tags can be hierarchical via `/` separator:

```
#engineering
#engineering/frontend
#engineering/frontend/react
#engineering/backend
#engineering/backend/api
```

Query capabilities:

- `#engineering` → All items with engineering or sub-tags
- `#engineering/frontend` → Only frontend items
- `#engineering/*` → Direct children of engineering

## Versioning

### Version Model

```typescript
interface WikiPageVersion {
  id: number;
  pageId: number;

  // Snapshot
  title: string;
  content: LexicalEditorState;
  tags: string[];

  // Metadata
  createdAt: Date;
  createdById: number;

  // Diff info
  changeType: 'create' | 'edit' | 'restore' | 'merge';
  changeSummary?: string; // Optional commit message
}
```

### Version Comparison

```typescript
interface VersionDiff {
  titleChanged: boolean;
  oldTitle?: string;
  newTitle?: string;

  contentChanges: {
    added: number; // Characters added
    removed: number; // Characters removed
    hunks: DiffHunk[]; // Actual diff hunks
  };

  tagsAdded: string[];
  tagsRemoved: string[];
}
```

## Search

### Full-Text Search

Each page has a `plainText` field for search:

```sql
-- PostgreSQL full-text search
CREATE INDEX wiki_pages_search_idx ON wiki_pages
USING GIN (to_tsvector('dutch', plain_text || ' ' || title));

-- Query
SELECT * FROM wiki_pages
WHERE to_tsvector('dutch', plain_text || ' ' || title)
      @@ plainto_tsquery('dutch', 'zoekterm');
```

### Semantic Search (RAG)

For advanced search we use vector embeddings:

```typescript
interface WikiPageEmbedding {
  pageId: number;
  embedding: number[]; // 1536-dim vector (OpenAI)
  chunkIndex: number; // For long pages
  chunkText: string; // The text of this chunk
}
```

Search flow:

1. Query → Embedding
2. Vector similarity search in Qdrant
3. Re-rank results
4. Return matched pages with highlighted snippets

## Permissions

### Access Levels

```typescript
type WikiPermission =
  | 'view' // Can read
  | 'comment' // Can add comments
  | 'edit' // Can edit content
  | 'manage'; // Can delete, change permissions
```

### Permission Resolution

```typescript
function getWikiPermission(user: User, page: WikiPage): WikiPermission | null {
  // 1. Page-level override
  const pagePermission = page.permissions.find((p) => p.userId === user.id);
  if (pagePermission) return pagePermission.level;

  // 2. Project-level (if project wiki)
  if (page.projectId) {
    const projectRole = getProjectRole(user, page.projectId);
    if (projectRole === 'admin') return 'manage';
    if (projectRole === 'member') return 'edit';
    if (projectRole === 'viewer') return 'view';
  }

  // 3. Workspace-level
  if (page.workspaceId) {
    const workspaceRole = getWorkspaceRole(user, page.workspaceId);
    if (workspaceRole === 'admin') return 'manage';
    if (workspaceRole === 'member') return 'edit';
    if (workspaceRole === 'viewer') return 'view';
  }

  // 4. Public pages
  if (page.visibility === 'public') return 'view';

  // 5. No access
  return null;
}
```

## UI Components

### Wiki Sidebar

```
┌─────────────────────────────┐
│ 🔍 Search...                │
├─────────────────────────────┤
│ + New Page                  │
├─────────────────────────────┤
│ 📄 Getting Started          │
│ 📄 Team Guidelines          │
│ 📁 Engineering              │
│   ├── 📄 Architecture       │
│   ├── 📄 API Docs           │
│   └── 📄 Deployment         │
│ 📁 Design                   │
│   └── 📄 Style Guide        │
├─────────────────────────────┤
│ Tags                        │
│ #frontend (12)              │
│ #backend (8)                │
│ #documentation (15)         │
└─────────────────────────────┘
```

### Page View

```
┌─────────────────────────────────────────────────────────────┐
│ [Icon] Page Title                            [Edit] [•••]   │
├─────────────────────────────────────────────────────────────┤
│ #tag1  #tag2  #tag3                     Last edited 2h ago  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Page content here...                                       │
│                                                             │
│  With [[Wiki Links]] and @mentions                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Backlinks (3)                                               │
│ ├── 📄 Parent Page                                          │
│ ├── 📄 Related Topic                                        │
│ └── 📄 Another Reference                                    │
└─────────────────────────────────────────────────────────────┘
```

### Link Popup

When you hover over a wiki-link:

```
┌──────────────────────────────┐
│ 📄 API Documentation         │
│                              │
│ Documentation for the REST   │
│ API endpoints including...   │
│                              │
│ #api #documentation          │
│ Updated 2 days ago           │
│                              │
│ [Open] [Edit] [Copy Link]    │
└──────────────────────────────┘
```

## API Endpoints

```typescript
// CRUD
POST   /api/wiki/pages                    // Create page
GET    /api/wiki/pages/:id                // Get page
PATCH  /api/wiki/pages/:id                // Update page
DELETE /api/wiki/pages/:id                // Delete page

// Navigation
GET    /api/wiki/workspace/:id/pages      // List workspace wiki pages
GET    /api/wiki/project/:id/pages        // List project wiki pages
GET    /api/wiki/pages/:id/children       // Get child pages

// Links
GET    /api/wiki/pages/:id/backlinks      // Get pages linking to this page
GET    /api/wiki/pages/:id/outlinks       // Get pages this page links to
POST   /api/wiki/resolve-link             // Resolve a [[wiki link]]

// Search
GET    /api/wiki/search                   // Full-text search
GET    /api/wiki/search/semantic          // Semantic/RAG search

// Tags
GET    /api/wiki/tags                     // List all tags
GET    /api/wiki/tags/:slug               // Get tag with pages

// Versions
GET    /api/wiki/pages/:id/versions       // List versions
GET    /api/wiki/pages/:id/versions/:vid  // Get specific version
POST   /api/wiki/pages/:id/restore/:vid   // Restore to version
```

## tRPC Procedures

```typescript
export const wikiRouter = router({
  // Pages
  createPage: protectedProcedure.input(createPageSchema).mutation(/* ... */),

  getPage: protectedProcedure.input(z.object({ id: z.number() })).query(/* ... */),

  updatePage: protectedProcedure.input(updatePageSchema).mutation(/* ... */),

  deletePage: protectedProcedure.input(z.object({ id: z.number() })).mutation(/* ... */),

  // Navigation
  listWorkspacePages: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(/* ... */),

  listProjectPages: protectedProcedure.input(z.object({ projectId: z.number() })).query(/* ... */),

  // Links
  getBacklinks: protectedProcedure.input(z.object({ pageId: z.number() })).query(/* ... */),

  resolveLink: protectedProcedure
    .input(
      z.object({
        linkText: z.string(),
        context: z.object({
          workspaceId: z.number().optional(),
          projectId: z.number().optional(),
        }),
      })
    )
    .query(/* ... */),

  // Search
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        workspaceId: z.number().optional(),
        projectId: z.number().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().default(20),
      })
    )
    .query(/* ... */),
});
```
