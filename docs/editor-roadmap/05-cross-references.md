# Cross-References & Link System

## Overzicht

Het cross-reference systeem in Kanbu maakt het mogelijk om verbanden te leggen tussen alle entiteiten in het systeem:

- Wiki pagina's
- Tasks
- Projecten
- Workspaces
- Gebruikers
- Media

## Link Types

### 1. Wiki Links `[[Page Name]]`

Link naar wiki pagina's binnen de huidige context.

```
Zie [[Getting Started]] voor meer informatie.
```

**Resolutie volgorde:**
1. Project wiki (als in project context)
2. Workspace wiki (parent)
3. Exacte match op titel
4. Fuzzy match op titel

### 2. Cross-Wiki Links `[[Wiki/Page]]`

Expliciete link naar specifieke wiki:

```
Zie [[Workspace Wiki/Architecture]] voor het overzicht.
Zie [[Project Wiki/API Docs]] voor de API.
```

**Syntax:**
- `[[Workspace Wiki/Page]]` - Link naar workspace wiki
- `[[Project Wiki/Page]]` - Link naar project wiki (in project context)
- `[[/Absolute/Path]]` - Absolute path in wiki hiërarchie

### 3. Task Links `#TASK-123` of `#123`

Link naar taken:

```
Dit is gerelateerd aan #TASK-456.
Zie ook #123 voor de backend implementatie.
```

**Features:**
- Hover preview met task details
- Status indicator (open/closed)
- Click to open task modal

### 4. User Mentions `@username`

Mention van gebruikers:

```
@robin kan je hier naar kijken?
CC: @team-frontend
```

**Features:**
- Autocomplete tijdens typen
- Notificatie naar mentioned user
- Avatar tonen

### 5. Tags `#tag-name`

Categorisatie tags:

```
#frontend #urgent #v2.0
```

**Note:** Tags en task links gebruiken beide `#`, maar worden onderscheiden door:
- `#TASK-123` of `#123` (alleen cijfers) = Task link
- `#tag-name` (bevat letters) = Tag

### 6. External Links

Automatische link detectie en preview:

```
Bekijk https://example.com voor meer info.
```

**Features:**
- Automatische URL detectie
- Link preview card (unfurl)
- Open in new tab

## Lexical Node Types

### WikiLinkNode

```typescript
import { TextNode, NodeKey, SerializedTextNode } from 'lexical';

export class WikiLinkNode extends TextNode {
  __pageName: string;
  __pageId: number | null;
  __status: 'valid' | 'broken' | 'loading';

  static getType(): string {
    return 'wiki-link';
  }

  static clone(node: WikiLinkNode): WikiLinkNode {
    return new WikiLinkNode(node.__pageName, node.__pageId, node.__key);
  }

  constructor(pageName: string, pageId: number | null = null, key?: NodeKey) {
    super(`[[${pageName}]]`, key);
    this.__pageName = pageName;
    this.__pageId = pageId;
    this.__status = pageId ? 'valid' : 'loading';
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('a');
    element.className = `wiki-link wiki-link--${this.__status}`;
    element.href = this.__pageId
      ? `/wiki/page/${this.__pageId}`
      : `#create:${encodeURIComponent(this.__pageName)}`;
    element.textContent = this.__pageName;
    return element;
  }

  updateDOM(prevNode: WikiLinkNode, dom: HTMLElement): boolean {
    if (prevNode.__status !== this.__status) {
      dom.className = `wiki-link wiki-link--${this.__status}`;
      return true;
    }
    return false;
  }

  exportJSON(): SerializedWikiLinkNode {
    return {
      ...super.exportJSON(),
      type: 'wiki-link',
      pageName: this.__pageName,
      pageId: this.__pageId,
    };
  }

  static importJSON(json: SerializedWikiLinkNode): WikiLinkNode {
    return new WikiLinkNode(json.pageName, json.pageId);
  }
}
```

### TaskLinkNode

```typescript
export class TaskLinkNode extends TextNode {
  __taskId: string;
  __taskStatus: 'open' | 'closed' | 'unknown';

  static getType(): string {
    return 'task-link';
  }

  constructor(taskId: string, status: TaskStatus = 'unknown', key?: NodeKey) {
    super(`#${taskId}`, key);
    this.__taskId = taskId;
    this.__taskStatus = status;
  }

  createDOM(): HTMLElement {
    const element = document.createElement('a');
    element.className = `task-link task-link--${this.__taskStatus}`;
    element.href = `/task/${this.__taskId}`;
    element.textContent = `#${this.__taskId}`;
    return element;
  }

  // ... rest of implementation
}
```

### MentionNode

```typescript
export class MentionNode extends TextNode {
  __username: string;
  __userId: number;

  static getType(): string {
    return 'mention';
  }

  constructor(username: string, userId: number, key?: NodeKey) {
    super(`@${username}`, key);
    this.__username = username;
    this.__userId = userId;
  }

  createDOM(): HTMLElement {
    const element = document.createElement('span');
    element.className = 'mention';
    element.textContent = `@${this.__username}`;
    element.setAttribute('data-user-id', String(this.__userId));
    return element;
  }

  // ... rest of implementation
}
```

### TagNode

```typescript
export class TagNode extends TextNode {
  __tagName: string;

  static getType(): string {
    return 'tag';
  }

  constructor(tagName: string, key?: NodeKey) {
    super(`#${tagName}`, key);
    this.__tagName = tagName;
  }

  createDOM(): HTMLElement {
    const element = document.createElement('a');
    element.className = 'tag';
    element.href = `/wiki/tag/${encodeURIComponent(this.__tagName)}`;
    element.textContent = `#${this.__tagName}`;
    return element;
  }

  // ... rest of implementation
}
```

## Autocomplete System

### Trigger Detection

```typescript
const TRIGGERS = {
  wikiLink: {
    pattern: /\[\[([^\]]*)/,       // [[ followed by text
    handler: 'wiki-autocomplete',
  },
  mention: {
    pattern: /@(\w*)/,             // @ followed by word chars
    handler: 'mention-autocomplete',
  },
  tag: {
    pattern: /#([a-z][a-z0-9-]*)/i, // # followed by tag name
    handler: 'tag-autocomplete',
  },
  taskLink: {
    pattern: /#(TASK-)?(\d+)/i,    // # followed by number
    handler: 'task-autocomplete',
  },
};

function detectTrigger(text: string, cursorPos: number): TriggerMatch | null {
  // Get text before cursor
  const textBeforeCursor = text.slice(0, cursorPos);

  for (const [type, config] of Object.entries(TRIGGERS)) {
    const match = textBeforeCursor.match(config.pattern);
    if (match) {
      return {
        type,
        query: match[1] || match[2] || '',
        startIndex: match.index!,
        handler: config.handler,
      };
    }
  }

  return null;
}
```

### Autocomplete Plugin

```typescript
function AutocompletePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [trigger, setTrigger] = useState<TriggerMatch | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Listen for text changes
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          setTrigger(null);
          return;
        }

        const node = selection.anchor.getNode();
        if (!$isTextNode(node)) {
          setTrigger(null);
          return;
        }

        const text = node.getTextContent();
        const cursorPos = selection.anchor.offset;
        const match = detectTrigger(text, cursorPos);

        setTrigger(match);
      });
    });
  }, [editor]);

  // Fetch suggestions when trigger changes
  useEffect(() => {
    if (!trigger) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const results = await getSuggestions(trigger.type, trigger.query);
      setSuggestions(results);
      setSelectedIndex(0);
    };

    const debounced = debounce(fetchSuggestions, 150);
    debounced();

    return () => debounced.cancel();
  }, [trigger]);

  // Handle keyboard navigation
  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!trigger || suggestions.length === 0) return false;

        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            setSelectedIndex(i => (i + 1) % suggestions.length);
            return true;

          case 'ArrowUp':
            event.preventDefault();
            setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length);
            return true;

          case 'Enter':
          case 'Tab':
            event.preventDefault();
            insertSuggestion(suggestions[selectedIndex]);
            return true;

          case 'Escape':
            setTrigger(null);
            return true;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, trigger, suggestions, selectedIndex]);

  if (!trigger || suggestions.length === 0) return null;

  return (
    <AutocompletePopup
      suggestions={suggestions}
      selectedIndex={selectedIndex}
      onSelect={insertSuggestion}
      type={trigger.type}
    />
  );
}
```

### Suggestion Fetching

```typescript
async function getSuggestions(
  type: string,
  query: string,
  context: EditorContext
): Promise<Suggestion[]> {
  switch (type) {
    case 'wikiLink':
      return searchWikiPages(query, {
        workspaceId: context.workspaceId,
        projectId: context.projectId,
        limit: 10,
      });

    case 'mention':
      return searchUsers(query, {
        workspaceId: context.workspaceId,
        limit: 10,
      });

    case 'tag':
      return searchTags(query, {
        workspaceId: context.workspaceId,
        limit: 10,
      });

    case 'taskLink':
      return searchTasks(query, {
        projectId: context.projectId,
        limit: 10,
      });

    default:
      return [];
  }
}
```

## Link Preview (Hover Cards)

### Preview Component

```tsx
function LinkPreviewCard({ link, type }: LinkPreviewProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreviewData(link, type)
      .then(setData)
      .finally(() => setLoading(false));
  }, [link, type]);

  if (loading) {
    return <PreviewSkeleton />;
  }

  if (!data) {
    return <BrokenLinkPreview link={link} />;
  }

  return (
    <div className="link-preview-card">
      {data.icon && <span className="preview-icon">{data.icon}</span>}
      <div className="preview-content">
        <h4 className="preview-title">{data.title}</h4>
        {data.description && (
          <p className="preview-description">{data.description}</p>
        )}
        {data.tags && data.tags.length > 0 && (
          <div className="preview-tags">
            {data.tags.map(tag => (
              <span key={tag} className="preview-tag">#{tag}</span>
            ))}
          </div>
        )}
        <div className="preview-meta">
          {data.updatedAt && (
            <span>Updated {formatRelative(data.updatedAt)}</span>
          )}
        </div>
      </div>
      <div className="preview-actions">
        <button onClick={() => openLink(data.url)}>Open</button>
        <button onClick={() => copyLink(data.url)}>Copy Link</button>
      </div>
    </div>
  );
}
```

### Hover Detection

```typescript
function LinkHoverPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const [hoveredLink, setHoveredLink] = useState<HoveredLink | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const linkElement = target.closest('.wiki-link, .task-link, .mention');

      if (linkElement) {
        // Delay showing preview
        hoverTimeoutRef.current = window.setTimeout(() => {
          const rect = linkElement.getBoundingClientRect();
          setHoveredLink({
            element: linkElement,
            position: { x: rect.left, y: rect.bottom + 8 },
            type: getLinkType(linkElement),
            data: getLinkData(linkElement),
          });
        }, 500);
      }
    };

    const handleMouseOut = (event: MouseEvent) => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Check if moving to preview card
      const related = event.relatedTarget as HTMLElement;
      if (!related?.closest('.link-preview-card')) {
        setHoveredLink(null);
      }
    };

    rootElement.addEventListener('mouseover', handleMouseOver);
    rootElement.addEventListener('mouseout', handleMouseOut);

    return () => {
      rootElement.removeEventListener('mouseover', handleMouseOver);
      rootElement.removeEventListener('mouseout', handleMouseOut);
    };
  }, [editor]);

  if (!hoveredLink) return null;

  return (
    <Portal>
      <div
        className="link-preview-portal"
        style={{
          position: 'fixed',
          left: hoveredLink.position.x,
          top: hoveredLink.position.y,
        }}
      >
        <LinkPreviewCard
          link={hoveredLink.data}
          type={hoveredLink.type}
        />
      </div>
    </Portal>
  );
}
```

## Link Extraction & Storage

### On Save Extraction

```typescript
async function extractAndStoreLinks(
  pageId: number,
  editorState: EditorState,
  context: EditorContext
): Promise<void> {
  // 1. Extract all links from content
  const links = extractAllLinks(editorState);

  // 2. Resolve wiki links to page IDs
  const resolvedWikiLinks = await Promise.all(
    links.wikiLinks.map(async (pageName) => {
      const page = await resolveWikiLink(pageName, context);
      return {
        pageName,
        pageId: page?.id ?? null,
        status: page ? 'valid' : 'broken',
      };
    })
  );

  // 3. Update link records in database
  await updatePageLinks(pageId, {
    wikiLinks: resolvedWikiLinks,
    taskLinks: links.taskLinks,
    mentions: links.mentions,
    tags: links.tags,
    externalUrls: links.externalUrls,
  });

  // 4. Update backlinks for target pages
  for (const link of resolvedWikiLinks) {
    if (link.pageId) {
      await addBacklink(link.pageId, pageId);
    }
  }

  // 5. Send notifications for mentions
  for (const mention of links.mentions) {
    await sendMentionNotification(mention.userId, {
      type: 'wiki-mention',
      pageId,
      mentionedBy: context.currentUserId,
    });
  }
}
```

### Link Resolution Service

```typescript
class LinkResolutionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache: CacheService
  ) {}

  async resolveWikiLink(
    pageName: string,
    context: { workspaceId?: number; projectId?: number }
  ): Promise<WikiPage | null> {
    // Check cache first
    const cacheKey = `wiki-link:${context.projectId}:${context.workspaceId}:${pageName}`;
    const cached = await this.cache.get<WikiPage>(cacheKey);
    if (cached) return cached;

    // Check for explicit path
    if (pageName.includes('/')) {
      return this.resolveExplicitPath(pageName, context);
    }

    const slug = toSlug(pageName);

    // 1. Search in project wiki
    if (context.projectId) {
      const projectPage = await this.prisma.wikiPage.findFirst({
        where: { projectId: context.projectId, slug },
      });
      if (projectPage) {
        await this.cache.set(cacheKey, projectPage, 300);
        return projectPage;
      }
    }

    // 2. Search in workspace wiki
    if (context.workspaceId) {
      const workspacePage = await this.prisma.wikiPage.findFirst({
        where: { workspaceId: context.workspaceId, slug },
      });
      if (workspacePage) {
        await this.cache.set(cacheKey, workspacePage, 300);
        return workspacePage;
      }
    }

    // 3. Fuzzy search by title
    const fuzzyMatch = await this.prisma.wikiPage.findFirst({
      where: {
        OR: [
          { workspaceId: context.workspaceId },
          { projectId: context.projectId },
        ],
        title: { contains: pageName, mode: 'insensitive' },
      },
    });

    if (fuzzyMatch) {
      await this.cache.set(cacheKey, fuzzyMatch, 300);
      return fuzzyMatch;
    }

    return null;
  }

  async resolveTaskLink(taskRef: string): Promise<Task | null> {
    // Parse task reference
    const taskId = taskRef.replace(/^TASK-/, '');

    return this.prisma.task.findFirst({
      where: {
        OR: [
          { id: parseInt(taskId, 10) },
          { identifier: taskRef.toUpperCase() },
        ],
      },
    });
  }

  async resolveMention(username: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
  }
}
```

## CSS Styling

```css
/* Wiki Links */
.wiki-link {
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px dashed var(--color-primary);
  cursor: pointer;
}

.wiki-link:hover {
  border-bottom-style: solid;
}

.wiki-link--broken {
  color: var(--color-error);
  border-bottom-color: var(--color-error);
}

.wiki-link--loading {
  color: var(--color-muted);
  animation: pulse 1s infinite;
}

/* Task Links */
.task-link {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 0.1em 0.3em;
  background: var(--color-surface);
  border-radius: 4px;
  text-decoration: none;
}

.task-link--open {
  color: var(--color-success);
}

.task-link--closed {
  color: var(--color-muted);
  text-decoration: line-through;
}

/* Mentions */
.mention {
  color: var(--color-primary);
  font-weight: 500;
  cursor: pointer;
}

.mention:hover {
  text-decoration: underline;
}

/* Tags */
.tag {
  font-size: 0.85em;
  padding: 0.1em 0.4em;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  border-radius: 4px;
  text-decoration: none;
}

.tag:hover {
  background: var(--color-primary);
  color: white;
}

/* Link Preview Card */
.link-preview-card {
  max-width: 320px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px;
}

.preview-description {
  font-size: 12px;
  color: var(--color-muted);
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.preview-tag {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--color-surface-hover);
  border-radius: 4px;
}

.preview-meta {
  font-size: 11px;
  color: var(--color-muted);
}

.preview-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}
```
