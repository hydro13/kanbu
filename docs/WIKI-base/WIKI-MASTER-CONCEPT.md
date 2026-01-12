# Kanbu Wiki - Master Concept Document

> **Versie:** 1.0
> **Datum:** Januari 2025
> **Status:** Concept voor implementatie

---

## Visie

**"Een wiki die zichzelf schrijft, in de stem van jouw bedrijf."**

Kanbu Wiki is niet zomaar een documentatie tool. Het is een **levend kennissysteem** dat:
- Automatisch verbanden ontdekt tussen concepten
- Documentatie genereert in jouw bedrijfsstijl
- Evolueert met je projecten en team
- Antwoord geeft op vragen over je hele kennisbase

---

## Deel 1: Het Grote Plaatje

### Wat Maakt Kanbu Wiki Anders?

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   TRADITIONELE WIKI              KANBU WIKI                      │
│   ─────────────────              ──────────                      │
│                                                                  │
│   📝 Handmatig schrijven    →    🤖 AI-assisted + Auto-generated │
│   🔗 Handmatig linken       →    🧠 Automatische verbanden       │
│   🏷️ Handmatig taggen       →    🎯 Auto-tags uit content        │
│   📁 Platte structuur       →    🌐 Knowledge Graph              │
│   🔍 Keyword search         →    💬 "Vraag de wiki"              │
│   📸 Snapshot in tijd       →    ⏰ Temporele kennis             │
│   👤 Eén workspace          →    🔄 Cross-project intelligence   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### De Drie Lagen

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  LAAG 1: CONTENT CREATION                                        │
│  ════════════════════════                                        │
│  Lexical Editor + [[Wiki Links]] + @mentions + #task-refs        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Rich Text Editor                                        │    │
│  │  • Bold, italic, headers, lists                          │    │
│  │  • Code blocks met syntax highlighting                   │    │
│  │  • [[Wiki Links]] met autocomplete                       │    │
│  │  • @team-member mentions                                 │    │
│  │  • #TASK-123 references                                  │    │
│  │  • /slash commands                                       │    │
│  │  • Drag & drop images                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  LAAG 2: KNOWLEDGE ENGINE                                        │
│  ════════════════════════                                        │
│  Graphiti + Entity Extraction + Temporal Model                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Bij elke save:                                          │    │
│  │  1. Content → Graphiti Episode                           │    │
│  │  2. LLM extraheert entities (concepten, mensen, tech)    │    │
│  │  3. Relaties worden edges in knowledge graph             │    │
│  │  4. Temporal metadata (valid_at, invalid_at)             │    │
│  │  5. Cross-wiki entity matching                           │    │
│  │  6. Auto-tags gegenereerd                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  LAAG 3: INTELLIGENCE                                            │
│  ═══════════════════                                             │
│  Search + Q&A + Auto-generation + Insights                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • Semantic search over alle wiki's                      │    │
│  │  • "Vraag de wiki" natural language Q&A                  │    │
│  │  • Auto-generated documentation                          │    │
│  │  • "Related pages" suggestions                           │    │
│  │  • Graph visualization                                   │    │
│  │  • Temporal queries ("wat wisten we in januari?")        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deel 2: User Experience

### 2.1 Wiki Hiërarchie

```
Workspace (Bedrijf X)
├── 📚 Workspace Wiki
│   ├── Company Handbook
│   ├── Coding Standards
│   ├── Architecture Principles
│   └── Onboarding Guide
│
├── 📁 Project: Frontend App
│   └── 📚 Project Wiki
│       ├── Setup Guide
│       ├── Component Library
│       └── API Integration
│
├── 📁 Project: Backend API
│   └── 📚 Project Wiki
│       ├── Database Schema
│       ├── Endpoint Docs
│       └── Deployment Guide
│
└── 🔗 Cross-Project Knowledge Graph
    └── Automatische links tussen alle wiki's
```

### 2.2 De Editor Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  📄 Authentication Flow                              [Save] [⋮] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Breadcrumb: Workspace X > Project Y > Wiki > Authentication     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  # Authentication Flow                                   │    │
│  │                                                          │    │
│  │  Our app uses [[OAuth2]] for authentication, implemented │    │
│  │  by @robin in sprint 23. See #TASK-456 for details.      │    │
│  │                                                          │    │
│  │  ## How it works                                         │    │
│  │                                                          │    │
│  │  1. User clicks "Login with Google"                      │    │
│  │  2. Redirect to [[Google OAuth]] consent screen          │    │
│  │  3. Callback to `/api/auth/callback`                     │    │
│  │  4. [[JWT Token]] generated and stored                   │    │
│  │                                                          │    │
│  │  ```typescript                                           │    │
│  │  const token = await auth.generateToken(user)            │    │
│  │  ```                                                     │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Auto-tags: OAuth2 · JWT · Authentication · Google · @robin      │
├─────────────────────────────────────────────────────────────────┤
│  📎 Backlinks (3)           │  🔗 Related Pages (5)             │
│  • Security Guidelines      │  • JWT Token Refresh               │
│  • API Overview             │  • User Sessions                   │
│  • Login Component          │  • Google OAuth Setup              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 "Vraag de Wiki" Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Ask the Wiki                                          [×]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Hoe werkt onze authentication?                     [Ask] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🤖 Antwoord:                                            │    │
│  │                                                          │    │
│  │  Jullie app gebruikt OAuth2 voor authenticatie. Het      │    │
│  │  proces werkt als volgt:                                 │    │
│  │                                                          │    │
│  │  1. Gebruiker klikt op "Login with Google"               │    │
│  │  2. Na consent wordt een JWT token gegenereerd           │    │
│  │  3. Token wordt opgeslagen voor sessie management        │    │
│  │                                                          │    │
│  │  Dit is geïmplementeerd door Robin in sprint 23.         │    │
│  │                                                          │    │
│  │  📚 Bronnen:                                             │    │
│  │  • Authentication Flow (Project Y Wiki)                  │    │
│  │  • Security Guidelines (Workspace Wiki)                  │    │
│  │  • JWT Token Refresh (Project Y Wiki)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Knowledge Graph Visualisatie

```
┌─────────────────────────────────────────────────────────────────┐
│  🌐 Knowledge Graph: Authentication Domain              [×]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        ┌───────────┐                            │
│                        │   OAuth2  │                            │
│                        └─────┬─────┘                            │
│                    ┌─────────┼─────────┐                        │
│                    ▼         ▼         ▼                        │
│              ┌─────────┐ ┌───────┐ ┌─────────┐                  │
│              │ Google  │ │  JWT  │ │ GitHub  │                  │
│              │  OAuth  │ │ Token │ │  OAuth  │                  │
│              └────┬────┘ └───┬───┘ └────┬────┘                  │
│                   │          │          │                        │
│                   ▼          ▼          ▼                        │
│              ┌─────────────────────────────┐                    │
│              │     Authentication Flow     │                    │
│              │        (Wiki Page)          │                    │
│              └──────────────┬──────────────┘                    │
│                             │                                    │
│                    ┌────────┴────────┐                          │
│                    ▼                 ▼                          │
│              ┌──────────┐     ┌────────────┐                    │
│              │  @robin  │     │  #TASK-456 │                    │
│              │ (Person) │     │   (Task)   │                    │
│              └──────────┘     └────────────┘                    │
│                                                                  │
│  [Zoom +] [Zoom -] [Filter: People | Concepts | Pages | Tasks]  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Version History met Temporal Queries

```
┌─────────────────────────────────────────────────────────────────┐
│  📜 Version History: Authentication Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Current ────────────────────────────────────────────────┐   │
│  │ v5 • 25 jan 2025 • @robin                                │   │
│  │ "Added GitHub OAuth as alternative provider"             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Previous ───────────────────────────────────────────────┐   │
│  │ v4 • 20 jan 2025 • @claude-agent                         │   │
│  │ "Auto-updated JWT refresh documentation"                 │   │
│  │ [View] [Compare with current] [Restore]                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  │ v3 • 15 jan 2025 • @sarah                                │   │
│  │ v2 • 10 jan 2025 • @robin                                │   │
│  │ v1 • 5 jan 2025 • @robin (created)                       │   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🕐 Temporal Query                                         │   │
│  │ "Wat stond hier op 12 januari?"                    [Ask] │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deel 3: Technische Architectuur

### 3.1 Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      KANBU WIKI STACK                            │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     FRONTEND                               │  │
│  │  React + TypeScript + TailwindCSS                          │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │  │
│  │  │ Lexical     │ │ D3.js       │ │ React Query         │  │  │
│  │  │ Editor      │ │ Graph Viz   │ │ Data Fetching       │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     BACKEND API                            │  │
│  │  Fastify + tRPC + Prisma                                   │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │  │
│  │  │ Wiki Router │ │ Graphiti    │ │ Auth Middleware     │  │  │
│  │  │ CRUD + Sync │ │ Service     │ │ Permissions         │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     DATA LAYER                             │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────┐ │  │
│  │  │ PostgreSQL          │  │ Graph Database              │ │  │
│  │  │ • WikiPage model    │  │ (Neo4j / FalkorDB / Kuzu)   │ │  │
│  │  │ • User/Permissions  │  │ • EpisodicNodes (versions)  │ │  │
│  │  │ • Task references   │  │ • EntityNodes (concepts)    │ │  │
│  │  │                     │  │ • EntityEdges (relations)   │ │  │
│  │  └─────────────────────┘  └─────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     AI LAYER                               │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────┐ │  │
│  │  │ LLM Provider        │  │ Embedding Provider          │ │  │
│  │  │ ┌─────┐ ┌────────┐  │  │ ┌─────┐ ┌────────────────┐  │ │  │
│  │  │ │Cloud│ │ Local  │  │  │ │Cloud│ │ Local          │  │ │  │
│  │  │ │OpenAI│ │ Ollama │  │  │ │OpenAI│ │ nomic-embed   │  │ │  │
│  │  │ └─────┘ └────────┘  │  │ └─────┘ └────────────────┘  │ │  │
│  │  └─────────────────────┘  └─────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Model

```typescript
// PostgreSQL - Prisma Schema (Bron van waarheid)
model WikiPage {
  id            String   @id @default(cuid())
  title         String
  slug          String
  content       Json     // Lexical editor state
  contentText   String   // Plain text voor search fallback

  // Hiërarchie
  workspaceId   String
  projectId     String?  // Null = workspace-level wiki
  parentId      String?  // Voor nested pages

  // Metadata
  createdById   String
  updatedById   String
  createdAt     DateTime
  updatedAt     DateTime

  // Status
  status        WikiPageStatus @default(DRAFT)
  publishedAt   DateTime?

  // Graphiti sync
  graphitiGroupId    String   // "wiki-ws-{id}" of "wiki-proj-{id}"
  graphitiSynced     Boolean  @default(false)
  graphitiSyncedAt   DateTime?

  // Relations
  workspace     Workspace @relation(...)
  project       Project?  @relation(...)
  parent        WikiPage? @relation(...)
  children      WikiPage[] @relation(...)
  versions      WikiPageVersion[]

  @@unique([workspaceId, projectId, slug])
  @@index([graphitiGroupId])
}

model WikiPageVersion {
  id          String   @id @default(cuid())
  pageId      String
  version     Int
  content     Json
  contentText String

  createdById String
  createdAt   DateTime

  // Graphiti reference
  graphitiEpisodeId String?

  page        WikiPage @relation(...)

  @@unique([pageId, version])
}

enum WikiPageStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### 3.3 Graphiti Integration Service

```typescript
// apps/api/src/services/graphiti.service.ts

import { Graphiti } from 'graphiti-core';

export class GraphitiService {
  private client: Graphiti;

  constructor(config: GraphitiConfig) {
    this.client = new Graphiti({
      // Database
      uri: config.graphDb.uri,
      user: config.graphDb.user,
      password: config.graphDb.password,

      // LLM (local of cloud)
      llmClient: config.useLocalLLM
        ? new OllamaClient(config.ollama)
        : new OpenAIClient(config.openai),

      // Embeddings (local of cloud)
      embedder: config.useLocalEmbeddings
        ? new OllamaEmbedder(config.ollama)
        : new OpenAIEmbedder(config.openai),
    });
  }

  /**
   * Sync een wiki pagina naar Graphiti
   */
  async syncWikiPage(page: WikiPage, userId: string): Promise<void> {
    const groupId = page.projectId
      ? `wiki-proj-${page.projectId}`
      : `wiki-ws-${page.workspaceId}`;

    await this.client.addEpisode({
      name: page.title,
      episodeBody: page.contentText,
      groupId,
      source: 'text',
      sourceDescription: `wiki_edit:user:${userId}:page:${page.id}`,
      referenceTime: new Date(),
    });
  }

  /**
   * Zoek across wiki's
   */
  async search(query: string, groupIds: string[]): Promise<SearchResult[]> {
    return this.client.search({
      query,
      groupIds,
      numResults: 10,
    });
  }

  /**
   * Vraag de wiki (RAG)
   */
  async askWiki(question: string, groupIds: string[]): Promise<WikiAnswer> {
    const context = await this.search(question, groupIds);

    return this.client.generateAnswer({
      question,
      context,
      systemPrompt: `Je bent een behulpzame assistent die vragen beantwoordt
                     op basis van de wiki documentatie. Citeer je bronnen.`,
    });
  }

  /**
   * Haal auto-generated tags op
   */
  async getAutoTags(pageId: string): Promise<string[]> {
    const entities = await this.client.getEntitiesForEpisode(pageId);
    return entities.map(e => e.name);
  }

  /**
   * Haal related pages op
   */
  async getRelatedPages(pageId: string, groupIds: string[]): Promise<WikiPage[]> {
    const edges = await this.client.getRelatedEdges(pageId);
    // Map terug naar WikiPages via graphitiEpisodeId
    return this.mapEdgesToPages(edges, groupIds);
  }
}
```

### 3.4 Configuratie voor Local vs Cloud

```yaml
# config/wiki.yaml

# Optie 1: 100% Lokaal
local:
  llm:
    provider: ollama
    model: llama3:70b
    baseUrl: http://localhost:11434/v1

  embeddings:
    provider: ollama
    model: nomic-embed-text
    baseUrl: http://localhost:11434/v1

  graphDb:
    provider: kuzu  # Embedded, geen server nodig
    path: ./data/wiki-graph

# Optie 2: Cloud APIs
cloud:
  llm:
    provider: openai
    model: gpt-4o-mini
    apiKey: ${OPENAI_API_KEY}

  embeddings:
    provider: openai
    model: text-embedding-3-small
    apiKey: ${OPENAI_API_KEY}

  graphDb:
    provider: neo4j
    uri: ${NEO4J_URI}
    user: ${NEO4J_USER}
    password: ${NEO4J_PASSWORD}

# Optie 3: Hybrid (SaaS)
hybrid:
  llm:
    provider: openai  # Cloud voor kwaliteit
    model: gpt-4o

  embeddings:
    provider: ollama  # Lokaal voor snelheid/kosten
    model: nomic-embed-text

  graphDb:
    provider: neo4j   # Managed voor reliability
```

---

## Deel 4: Features Breakdown

### 4.1 Core Wiki Features

| Feature | Beschrijving | Prioriteit |
|---------|--------------|------------|
| Rich Text Editor | Lexical-based met formatting | P0 |
| Wiki Pages CRUD | Create, read, update, delete | P0 |
| Page Hierarchy | Parent/child pages, breadcrumbs | P0 |
| Workspace Wiki | Wiki op workspace niveau | P0 |
| Project Wiki | Wiki per project | P0 |
| Draft/Published | Status management | P1 |
| Permissions | Read/write per page/wiki | P1 |

### 4.2 Linking & References

| Feature | Beschrijving | Prioriteit |
|---------|--------------|------------|
| [[Wiki Links]] | Links naar andere pages met autocomplete | P0 |
| @mentions | Link naar team members | P1 |
| #task-refs | Link naar taken | P1 |
| Backlinks | Automatisch "linked from" sectie | P1 |
| Hover Cards | Preview bij hover over link | P2 |

### 4.3 Knowledge Graph Features

| Feature | Beschrijving | Prioriteit |
|---------|--------------|------------|
| Entity Extraction | Auto-extract concepten uit content | P1 |
| Auto-Tags | Tags gegenereerd uit entities | P1 |
| Related Pages | Suggesties gebaseerd op graph | P1 |
| Cross-Wiki Links | Links tussen workspace en project wikis | P2 |
| Graph Visualization | D3.js knowledge graph view | P2 |

### 4.4 AI Features

| Feature | Beschrijving | Prioriteit |
|---------|--------------|------------|
| Semantic Search | Zoek op betekenis, niet keywords | P1 |
| "Ask the Wiki" | Natural language Q&A | P2 |
| Auto Documentation | Genereer docs uit code/context | P3 |
| Writing Suggestions | AI-assisted editing | P3 |

### 4.5 Version Control

| Feature | Beschrijving | Prioriteit |
|---------|--------------|------------|
| Version History | Laatste 20 versies per page | P1 |
| Version Compare | Diff tussen versies | P2 |
| Restore Version | Terug naar eerdere versie | P2 |
| Temporal Queries | "Wat stond hier op datum X?" | P3 |

---

## Deel 5: Implementatie Roadmap

### Fase 0: Foundation (Week 1-2)
**Doel:** Database en basis API

```
□ Prisma schema uitbreiden
  □ WikiPage model
  □ WikiPageVersion model
  □ Relaties met Workspace/Project

□ tRPC Router: wiki.*
  □ wiki.create
  □ wiki.get
  □ wiki.update
  □ wiki.delete
  □ wiki.list
  □ wiki.getBySlug

□ Permissions
  □ canReadWiki()
  □ canWriteWiki()
  □ Inherit from workspace/project

□ Tests
  □ Unit tests voor router
  □ Permission tests
```

**Deliverable:** Wiki CRUD werkt via API

---

### Fase 1: Editor Integration (Week 3-4)
**Doel:** Lexical editor voor wiki

```
□ Wiki Editor Component
  □ Integreer bestaande Lexical setup
  □ Wiki-specifieke toolbar
  □ Auto-save functionaliteit

□ [[Wiki Links]] Plugin
  □ Lexical node voor wiki links
  □ Autocomplete dropdown
  □ Link naar bestaande pages

□ Basic Page UI
  □ Page view component
  □ Edit mode toggle
  □ Breadcrumb navigation

□ Navigation
  □ Wiki sidebar met page tree
  □ Create new page
  □ Page settings modal
```

**Deliverable:** Gebruikers kunnen wiki pages maken en editen

---

### Fase 2: Graphiti Integration (Week 5-7)
**Doel:** Knowledge graph backend

```
□ Graphiti Setup
  □ Docker compose voor FalkorDB/Neo4j
  □ GraphitiService class
  □ Config voor local/cloud switch

□ Sync Pipeline
  □ On wiki save → sync to Graphiti
  □ Background job voor bulk sync
  □ Sync status tracking

□ Entity Extraction
  □ Custom entity types (Person, Tech, Concept)
  □ Extract op save
  □ Store entity references

□ Auto-Tags
  □ Display extracted entities als tags
  □ Tag click → filter/search
```

**Deliverable:** Wiki content wordt geïndexeerd in knowledge graph

---

### Fase 3: Cross-References (Week 8-9)
**Doel:** Linking features

```
□ Backlinks
  □ Query Graphiti voor incoming links
  □ Backlinks panel in page view
  □ Real-time update bij nieuwe links

□ Related Pages
  □ Query based op shared entities
  □ Related pages sidebar
  □ Relevance scoring

□ @mentions
  □ Lexical plugin voor @mentions
  □ Link naar user profile
  □ Notification bij mention

□ #task-refs
  □ Lexical plugin voor task refs
  □ Link naar task detail
  □ Twee-weg sync (task ↔ wiki)
```

**Deliverable:** Wiki pages zijn connected via knowledge graph

---

### Fase 4: Search & Discovery (Week 10-11)
**Doel:** Intelligent zoeken

```
□ Semantic Search
  □ Search input component
  □ Graphiti search integration
  □ Results ranking

□ Search UI
  □ Global search (Cmd+K)
  □ Wiki-specific search
  □ Filter by workspace/project

□ Hover Cards
  □ Preview popup bij hover
  □ Quick actions (open, edit)
  □ Loading state
```

**Deliverable:** Gebruikers kunnen semantisch zoeken

---

### Fase 5: AI Features (Week 12-14)
**Doel:** "Ask the Wiki" en meer

```
□ Ask the Wiki
  □ Chat interface component
  □ RAG pipeline setup
  □ Source citations
  □ Conversation history

□ Writing Assistant
  □ /ai slash command
  □ Expand, summarize, rewrite
  □ Tone adjustment

□ Auto-Suggestions
  □ "Did you mean to link to [[X]]?"
  □ Missing backlink suggestions
  □ Content improvement hints
```

**Deliverable:** AI-powered wiki experience

---

### Fase 6: Visualization (Week 15-16)
**Doel:** Knowledge graph UI

```
□ Graph Visualization
  □ D3.js force-directed graph
  □ Node types (page, person, concept)
  □ Edge types (links, mentions)
  □ Zoom/pan controls

□ Filters & Controls
  □ Filter by entity type
  □ Filter by time range
  □ Expand/collapse clusters

□ Interactive Features
  □ Click node → open page
  □ Hover → show details
  □ Drag to rearrange
```

**Deliverable:** Visuele knowledge graph explorer

---

### Fase 7: Version Control (Week 17-18)
**Doel:** Temporal features

```
□ Version History UI
  □ Version list panel
  □ Version metadata (who, when, what)
  □ Version preview

□ Version Compare
  □ Diff view component
  □ Side-by-side comparison
  □ Highlight changes

□ Restore & Temporal
  □ Restore to previous version
  □ "What was here on date X?"
  □ Temporal graph queries
```

**Deliverable:** Complete version control

---

### Fase 8: Auto-Generation (Week 19-21)
**Doel:** Documentation generation

```
□ Templates
  □ Company doc templates in workspace wiki
  □ Template detection/learning

□ Code Integration
  □ GitHub repo connection
  □ Code analysis pipeline
  □ Function/class extraction

□ Auto-Generate
  □ Generate API docs from code
  □ Apply company style
  □ Review & publish flow

□ Keep in Sync
  □ Detect code changes
  □ Suggest doc updates
  □ Auto-update option
```

**Deliverable:** Self-writing documentation

---

## Deel 6: Configuratie & Deployment

### 6.1 Community Edition (Self-Hosted)

```yaml
# docker-compose.yml voor self-hosted

version: '3.8'
services:
  kanbu:
    image: kanbu/kanbu:latest
    environment:
      - DATABASE_URL=postgresql://...
      - WIKI_MODE=local  # of 'cloud'
    ports:
      - "3000:3000"

  # Optioneel: lokale AI
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  # Optioneel: graph database
  falkordb:
    image: falkordb/falkordb:latest
    ports:
      - "6379:6379"
```

### 6.2 SaaS Edition

```yaml
# Kubernetes deployment voor SaaS

# Shared services
- Neo4j Cluster (managed)
- OpenAI API (pay-per-use)
- Dedicated embedding cache

# Per-tenant isolation
- Separate group_ids in Graphiti
- Row-level security in PostgreSQL
- Tenant-scoped search
```

---

## Deel 7: Success Metrics

### 7.1 Adoption Metrics

| Metric | Target |
|--------|--------|
| Wiki pages created per workspace | >10 in first month |
| Daily active wiki users | >30% of workspace members |
| [[Links]] per page | >3 average |
| Search queries per user/week | >5 |

### 7.2 Quality Metrics

| Metric | Target |
|--------|--------|
| Auto-tag accuracy | >85% relevant |
| Search result relevance | >80% click-through |
| "Ask Wiki" answer quality | >4/5 user rating |
| Related pages relevance | >70% useful |

### 7.3 Performance Metrics

| Metric | Target |
|--------|--------|
| Page load time | <500ms |
| Search response time | <1s |
| Graphiti sync latency | <5s |
| "Ask Wiki" response | <3s |

---

## Deel 8: Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Graphiti performance bij schaal | High | Caching, batch processing, index optimization |
| LLM kosten bij veel gebruik | Medium | Local Ollama optie, caching, rate limiting |
| Entity extraction kwaliteit | Medium | Custom prompts, feedback loop, human review |
| Graph database complexiteit | Medium | Start met Kuzu (simpel), migreer later |
| Privacy concerns | High | Local-first optie, data isolation, encryption |

---

## Appendix A: Gerelateerde Documenten

- [COGNEE-ANALYSE.md](COGNEE-ANALYSE.md) - Initiële Cognee research
- [KANDIDATEN-VERGELIJKING.md](KANDIDATEN-VERGELIJKING.md) - Framework vergelijking
- [GRAPHITI-IMPLEMENTATIE.md](GRAPHITI-IMPLEMENTATIE.md) - Graphiti deep dive
- [../Text-editor/README.md](../Text-editor/README.md) - Lexical editor documentatie

---

## Appendix B: API Reference (Conceptueel)

```typescript
// tRPC Router: wiki.*

wiki.create({ title, content, workspaceId, projectId?, parentId? })
wiki.get({ id })
wiki.getBySlug({ workspaceId, projectId?, slug })
wiki.update({ id, title?, content?, status? })
wiki.delete({ id })
wiki.list({ workspaceId, projectId?, parentId? })
wiki.move({ id, newParentId })
wiki.search({ query, workspaceId, projectId? })

// Knowledge features
wiki.getBacklinks({ pageId })
wiki.getRelated({ pageId })
wiki.getAutoTags({ pageId })
wiki.askWiki({ question, scope: 'workspace' | 'project' | 'all' })

// Version control
wiki.getVersions({ pageId })
wiki.getVersion({ pageId, version })
wiki.compareVersions({ pageId, v1, v2 })
wiki.restoreVersion({ pageId, version })
```

---

**Dit document is de blauwdruk voor Kanbu Wiki.**

Samen met het development team kunnen we dit iteratief uitbouwen, te beginnen met Fase 0 en 1.
