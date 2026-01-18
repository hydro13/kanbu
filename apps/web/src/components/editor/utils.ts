/**
 * Editor Utility Functions
 *
 * Helper functions for content detection and conversion.
 * Includes Markdown/HTML to Lexical JSON conversion for GitHub content.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * Updated: MAX-2026-01-10 - Added markdown/HTML parsing for GitHub sync
 * Updated: MAX-2026-01-12 - Fixed wiki link extraction to preserve [[...]] format
 * ===================================================================
 */

/**
 * Check if content is Lexical JSON format
 * Lexical JSON always starts with {"root":
 */
export function isLexicalContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return false;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' && 'root' in parsed;
  } catch {
    return false;
  }
}

/**
 * Convert plain text to Lexical JSON format
 * Creates a simple document with paragraphs for each line
 */
export function plainTextToLexical(text: string): string {
  const lines = text.split('\n');
  const children = lines.map((line) => ({
    type: 'paragraph',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: line
      ? [
          {
            type: 'text',
            version: 1,
            format: 0,
            mode: 'normal',
            style: '',
            detail: 0,
            text: line,
          },
        ]
      : [],
  }));

  const lexicalState = {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children,
    },
  };

  return JSON.stringify(lexicalState);
}

/**
 * Extract plain text from Lexical JSON
 * Used for preview/truncation purposes
 */
export function lexicalToPlainText(content: string): string {
  if (!isLexicalContent(content)) {
    return content; // Already plain text
  }

  try {
    const parsed = JSON.parse(content);
    return extractTextFromNode(parsed.root);
  } catch {
    return content;
  }
}

/**
 * Recursively extract text from a Lexical node
 * Preserves special node formats for graph link extraction
 */
function extractTextFromNode(node: unknown): string {
  if (!node || typeof node !== 'object') return '';

  const n = node as Record<string, unknown>;

  // Text node
  if (n.type === 'text' && typeof n.text === 'string') {
    return n.text;
  }

  // Wiki link node - preserve [[...]] format for backlinks extraction
  if (n.type === 'wiki-link') {
    const displayText = (n.displayText as string) || '';
    if (displayText) {
      return `[[${displayText}]]`;
    }
    // Fallback to children if displayText not available
    if (Array.isArray(n.children)) {
      const childText = n.children.map(extractTextFromNode).join('');
      return `[[${childText}]]`;
    }
    return '';
  }

  // Mention node - preserve @format for entity extraction
  if (n.type === 'mention') {
    const mentionName = (n.mentionName as string) || '';
    if (mentionName) {
      return `@${mentionName}`;
    }
  }

  // Task ref node - preserve #format for task references
  if (n.type === 'task-ref') {
    const taskRef = (n.taskRef as string) || '';
    if (taskRef) {
      return `#${taskRef}`;
    }
  }

  // Node with children
  if (Array.isArray(n.children)) {
    const texts = n.children.map(extractTextFromNode);
    // Add newline after block elements
    if (['paragraph', 'heading', 'quote', 'listitem'].includes(n.type as string)) {
      return texts.join('') + '\n';
    }
    return texts.join('');
  }

  return '';
}

/**
 * Normalize content for storage
 * - If already Lexical JSON, return as-is
 * - If plain text, convert to Lexical JSON
 */
export function normalizeContent(content: string): string {
  if (!content) return plainTextToLexical('');
  if (isLexicalContent(content)) return content;
  return plainTextToLexical(content);
}

/**
 * Check if content contains Markdown or HTML
 */
export function isMarkdownOrHtml(content: string): boolean {
  if (!content || typeof content !== 'string') return false;

  const patterns = [
    /<img\s/i, // HTML images
    /<a\s/i, // HTML links
    /<(p|div|span|br)\s*\/?>/i, // Common HTML tags
    /!\[.*?\]\(.*?\)/, // Markdown images ![alt](url)
    /\[.*?\]\(.*?\)/, // Markdown links [text](url)
    /^#{1,6}\s/m, // Markdown headings
    /\*\*[^*]+\*\*/, // Bold **text**
    /\*[^*]+\*/, // Italic *text*
    /```[\s\S]*?```/, // Code blocks
    /`[^`]+`/, // Inline code
    /^\s*[-*+]\s/m, // Unordered lists
    /^\s*\d+\.\s/m, // Ordered lists
  ];

  return patterns.some((pattern) => pattern.test(content));
}

/**
 * Lexical node types for building the document
 */
interface LexicalTextNode {
  type: 'text';
  version: 1;
  format: number;
  mode: 'normal';
  style: string;
  detail: number;
  text: string;
}

interface LexicalLinkNode {
  type: 'link';
  version: 1;
  url: string;
  rel: string;
  target: string | null;
  title: string | null;
  direction: null;
  format: string;
  indent: number;
  children: LexicalTextNode[];
}

interface LexicalImageNode {
  type: 'image';
  version: 1;
  src: string;
  altText: string;
  width?: number;
  height?: number;
  alignment?: 'default' | 'left' | 'center' | 'right';
}

type LexicalInlineNode = LexicalTextNode | LexicalLinkNode | LexicalImageNode;

interface LexicalParagraphNode {
  type: 'paragraph';
  version: 1;
  direction: null;
  format: string;
  indent: number;
  children: LexicalInlineNode[];
}

interface LexicalHeadingNode {
  type: 'heading';
  version: 1;
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  direction: null;
  format: string;
  indent: number;
  children: LexicalInlineNode[];
}

type LexicalBlockNode = LexicalParagraphNode | LexicalHeadingNode;

/**
 * Create a Lexical text node
 */
function createTextNode(text: string, format: number = 0): LexicalTextNode {
  return {
    type: 'text',
    version: 1,
    format,
    mode: 'normal',
    style: '',
    detail: 0,
    text,
  };
}

/**
 * Create a Lexical link node
 */
function createLinkNode(url: string, text: string): LexicalLinkNode {
  return {
    type: 'link',
    version: 1,
    url,
    rel: 'noopener',
    target: '_blank',
    title: null,
    direction: null,
    format: '',
    indent: 0,
    children: [createTextNode(text)],
  };
}

/**
 * Create a Lexical image node
 * Matches the SerializedImageNode format from ImageNode.tsx
 */
function createImageNode(
  src: string,
  alt: string,
  width?: number,
  height?: number
): LexicalImageNode {
  return {
    type: 'image',
    version: 1,
    src,
    altText: alt || '',
    ...(width && { width }),
    ...(height && { height }),
    alignment: 'default',
  };
}

/**
 * Create a Lexical paragraph node
 */
function createParagraphNode(children: LexicalInlineNode[]): LexicalParagraphNode {
  return {
    type: 'paragraph',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children,
  };
}

/**
 * Create a Lexical heading node
 */
function createHeadingNode(level: number, children: LexicalInlineNode[]): LexicalHeadingNode {
  const tag = `h${Math.min(Math.max(level, 1), 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return {
    type: 'heading',
    version: 1,
    tag,
    direction: null,
    format: '',
    indent: 0,
    children,
  };
}

/**
 * Parse inline content (text with links, images, bold, italic)
 */
function parseInlineContent(text: string): LexicalInlineNode[] {
  const nodes: LexicalInlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Check for HTML image: <img ... src="..." ... />
    const htmlImgMatch = remaining.match(/^<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/i);
    if (htmlImgMatch && htmlImgMatch[1]) {
      const fullMatch = htmlImgMatch[0];
      const src = htmlImgMatch[1];
      const altMatch = fullMatch.match(/alt=["']([^"']*)["']/i);
      const widthMatch = fullMatch.match(/width=["']?(\d+)["']?/i);
      const heightMatch = fullMatch.match(/height=["']?(\d+)["']?/i);

      nodes.push(
        createImageNode(
          src,
          altMatch?.[1] ?? '',
          widthMatch?.[1] ? parseInt(widthMatch[1]) : undefined,
          heightMatch?.[1] ? parseInt(heightMatch[1]) : undefined
        )
      );
      remaining = remaining.slice(fullMatch.length);
      continue;
    }

    // Check for Markdown image: ![alt](url)
    const mdImgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (mdImgMatch && mdImgMatch[2]) {
      nodes.push(createImageNode(mdImgMatch[2], mdImgMatch[1] ?? ''));
      remaining = remaining.slice(mdImgMatch[0].length);
      continue;
    }

    // Check for Markdown link: [text](url)
    const mdLinkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (mdLinkMatch && mdLinkMatch[1] && mdLinkMatch[2]) {
      nodes.push(createLinkNode(mdLinkMatch[2], mdLinkMatch[1]));
      remaining = remaining.slice(mdLinkMatch[0].length);
      continue;
    }

    // Check for bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)([^*_]+)\1/);
    if (boldMatch && boldMatch[2]) {
      nodes.push(createTextNode(boldMatch[2], 1)); // format 1 = bold
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
    if (italicMatch && italicMatch[2]) {
      nodes.push(createTextNode(italicMatch[2], 2)); // format 2 = italic
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Check for inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch && codeMatch[1]) {
      nodes.push(createTextNode(codeMatch[1], 16)); // format 16 = code
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Find the next special character to determine plain text span
    const nextSpecial = remaining.search(/<img|!\[|\[|(\*\*)|(__)|(\*)|(_)|`/i);

    if (nextSpecial === -1) {
      // No more special content, add rest as plain text
      if (remaining) {
        nodes.push(createTextNode(remaining));
      }
      break;
    } else if (nextSpecial === 0) {
      // Special char at start but didn't match any pattern, treat as text
      const char = remaining[0];
      if (char) {
        nodes.push(createTextNode(char));
      }
      remaining = remaining.slice(1);
    } else {
      // Add plain text before next special
      nodes.push(createTextNode(remaining.slice(0, nextSpecial)));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return nodes;
}

/**
 * Convert Markdown/HTML content to Lexical JSON
 */
export function markdownToLexical(content: string): string {
  const lines = content.split('\n');
  const blocks: LexicalBlockNode[] = [];

  for (const line of lines) {
    // Check for heading: # ## ### etc
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch && headingMatch[1] && headingMatch[2] !== undefined) {
      const level = headingMatch[1].length;
      const inlineNodes = parseInlineContent(headingMatch[2]);
      blocks.push(createHeadingNode(level, inlineNodes));
      continue;
    }

    // Regular paragraph
    const inlineNodes = parseInlineContent(line);
    blocks.push(createParagraphNode(inlineNodes.length > 0 ? inlineNodes : []));
  }

  const lexicalState = {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: blocks,
    },
  };

  return JSON.stringify(lexicalState);
}

/**
 * Get content for display
 * - Returns Lexical JSON for the editor
 * - Handles legacy plain text by converting it
 * - Handles Markdown/HTML from GitHub by parsing it
 */
export function getDisplayContent(content: string): string {
  if (!content) return plainTextToLexical('');
  if (isLexicalContent(content)) return content;
  if (isMarkdownOrHtml(content)) return markdownToLexical(content);
  return plainTextToLexical(content);
}
