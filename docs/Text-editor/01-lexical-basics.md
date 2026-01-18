# Lexical Basics - Technical Deep Dive

## What is Lexical?

Lexical is an extensible text editor framework built by Meta (Facebook). It is designed as a successor to Draft.js with focus on:

- **Performance**: Minimal overhead, efficient updates
- **Accessibility**: WCAG compliant out of the box
- **Extensibility**: Everything is a plugin
- **Reliability**: Extensively tested in production at Meta

## Core Concepts

### 1. Editor State

Lexical works with an immutable state model. Each change creates a new state.

```typescript
import { createEditor, EditorState } from 'lexical';

const editor = createEditor();

// Reading state
editor.getEditorState().read(() => {
  const root = $getRoot();
  const text = root.getTextContent();
});

// Writing to state
editor.update(() => {
  const root = $getRoot();
  const paragraph = $createParagraphNode();
  paragraph.append($createTextNode('Hello World'));
  root.append(paragraph);
});
```

### 2. Nodes

Everything in Lexical is a Node. There are different base node types:

```typescript
// Base nodes
import {
  RootNode, // Container for everything
  ParagraphNode, // <p> element
  TextNode, // Text content
  LineBreakNode, // <br> element
} from 'lexical';

// Extended nodes (packages)
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TableNode, TableRowNode, TableCellNode } from '@lexical/table';
```

### 3. Custom Nodes

For wiki-links we create a custom node:

```typescript
import { TextNode, SerializedTextNode, NodeKey } from 'lexical';

export interface SerializedWikiLinkNode extends SerializedTextNode {
  pageName: string;
}

export class WikiLinkNode extends TextNode {
  __pageName: string;

  static getType(): string {
    return 'wiki-link';
  }

  static clone(node: WikiLinkNode): WikiLinkNode {
    return new WikiLinkNode(node.__pageName, node.__key);
  }

  constructor(pageName: string, key?: NodeKey) {
    super(`[[${pageName}]]`, key);
    this.__pageName = pageName;
  }

  getPageName(): string {
    return this.__pageName;
  }

  createDOM(): HTMLElement {
    const element = document.createElement('span');
    element.className = 'wiki-link';
    element.setAttribute('data-page', this.__pageName);
    return element;
  }

  static importJSON(serializedNode: SerializedWikiLinkNode): WikiLinkNode {
    return new WikiLinkNode(serializedNode.pageName);
  }

  exportJSON(): SerializedWikiLinkNode {
    return {
      ...super.exportJSON(),
      type: 'wiki-link',
      pageName: this.__pageName,
    };
  }
}
```

### 4. Commands

Lexical uses a command pattern for actions:

```typescript
import {
  createCommand,
  COMMAND_PRIORITY_EDITOR,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from 'lexical';

// Built-in commands
editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
editor.dispatchCommand(UNDO_COMMAND, undefined);

// Custom command
export const INSERT_WIKI_LINK_COMMAND = createCommand<string>();

// Register handler
editor.registerCommand(
  INSERT_WIKI_LINK_COMMAND,
  (pageName) => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const wikiLinkNode = new WikiLinkNode(pageName);
      selection.insertNodes([wikiLinkNode]);
    }
    return true;
  },
  COMMAND_PRIORITY_EDITOR
);
```

### 5. Plugins

Plugins are React components that add functionality:

```typescript
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

function WikiLinkPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Register transform to detect [[...]] syntax
    return editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent();
      const match = text.match(/\[\[([^\]]+)\]\]/);

      if (match) {
        const pageName = match[1];
        const wikiLinkNode = new WikiLinkNode(pageName);
        node.replace(wikiLinkNode);
      }
    });
  }, [editor]);

  return null;
}
```

## React Integration

### LexicalComposer

The root component that provides the editor context:

```tsx
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';

const initialConfig = {
  namespace: 'KanbuEditor',
  theme: editorTheme,
  nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, CodeNode, LinkNode, WikiLinkNode],
  onError: (error: Error) => {
    console.error('Lexical error:', error);
  },
};

function Editor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container">
        <ToolbarPlugin />
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={<div className="editor-placeholder">Start typing...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        <WikiLinkPlugin />
        <MarkdownShortcutPlugin />
      </div>
    </LexicalComposer>
  );
}
```

### Theme

Lexical theming via CSS classes:

```typescript
const editorTheme = {
  paragraph: 'editor-paragraph',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  list: {
    ul: 'editor-list-ul',
    ol: 'editor-list-ol',
    listitem: 'editor-listitem',
    nested: {
      listitem: 'editor-nested-listitem',
    },
  },
  link: 'editor-link',
  code: 'editor-code',
  codeHighlight: {
    // Prism.js token classes
    comment: 'editor-code-comment',
    keyword: 'editor-code-keyword',
    string: 'editor-code-string',
    // ...
  },
};
```

## Serialization

### JSON Format

Lexical stores state as JSON:

```json
{
  "root": {
    "children": [
      {
        "children": [
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "Hello ",
            "type": "text",
            "version": 1
          },
          {
            "detail": 0,
            "format": 1,
            "mode": "normal",
            "style": "",
            "text": "World",
            "type": "text",
            "version": 1
          }
        ],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1
      }
    ],
    "direction": "ltr",
    "format": "",
    "indent": 0,
    "type": "root",
    "version": 1
  }
}
```

### Import/Export

```typescript
// Export to JSON string
const editorState = editor.getEditorState();
const json = JSON.stringify(editorState.toJSON());

// Import from JSON string
const parsedState = editor.parseEditorState(json);
editor.setEditorState(parsedState);

// Export to HTML
import { $generateHtmlFromNodes } from '@lexical/html';
const html = editor.getEditorState().read(() => {
  return $generateHtmlFromNodes(editor, null);
});

// Export to Markdown
import { $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
const markdown = editor.getEditorState().read(() => {
  return $convertToMarkdownString(TRANSFORMERS);
});
```

## Markdown Shortcuts

Lexical supports real-time markdown conversion:

```typescript
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';

// In your editor:
<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
```

Supported shortcuts:

- `# ` → H1
- `## ` → H2
- `### ` → H3
- `* ` or `- ` → Bullet list
- `1. ` → Numbered list
- `> ` → Quote
- `` ` `` → Inline code
- `**text**` → Bold
- `*text*` → Italic
- `~~text~~` → Strikethrough
- `[text](url)` → Link

## Performance Tips

1. **Debounce onChange**: Don't send every keystroke to server
2. **Lazy load plugins**: Only load what's needed
3. **Virtualization**: For long documents
4. **Web Workers**: Heavy operations off-main-thread

```typescript
// Debounced save
const debouncedSave = useMemo(
  () =>
    debounce((content: string) => {
      saveToServer(content);
    }, 1000),
  []
);

function handleChange(editorState: EditorState) {
  const json = JSON.stringify(editorState.toJSON());
  debouncedSave(json);
}
```

## Accessibility

Lexical has built-in accessibility:

- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management

```typescript
<ContentEditable
  className="editor-input"
  aria-label="Rich text editor"
  role="textbox"
  aria-multiline="true"
/>
```

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

Speech-to-text requires:

- Chrome/Edge: Full support
- Safari: webkit prefix
- Firefox: Limited (behind flag)
