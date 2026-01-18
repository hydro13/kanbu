/**
 * Lexical Editor Theme
 *
 * CSS class mappings for Lexical editor elements.
 * These classes are applied to the corresponding DOM elements.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import type { EditorThemeClasses } from 'lexical';

export const editorTheme: EditorThemeClasses = {
  // Root container
  root: 'lexical-root',

  // Text formatting
  text: {
    bold: 'lexical-text-bold',
    italic: 'lexical-text-italic',
    underline: 'lexical-text-underline',
    strikethrough: 'lexical-text-strikethrough',
    underlineStrikethrough: 'lexical-text-underline-strikethrough',
    code: 'lexical-text-code',
    subscript: 'lexical-text-subscript',
    superscript: 'lexical-text-superscript',
  },

  // Paragraphs
  paragraph: 'lexical-paragraph',

  // Headings
  heading: {
    h1: 'lexical-heading-h1',
    h2: 'lexical-heading-h2',
    h3: 'lexical-heading-h3',
    h4: 'lexical-heading-h4',
    h5: 'lexical-heading-h5',
    h6: 'lexical-heading-h6',
  },

  // Lists
  list: {
    ul: 'lexical-list-ul',
    ol: 'lexical-list-ol',
    listitem: 'lexical-listitem',
    listitemChecked: 'lexical-listitem-checked',
    listitemUnchecked: 'lexical-listitem-unchecked',
    nested: {
      listitem: 'lexical-nested-listitem',
    },
  },

  // Quotes
  quote: 'lexical-quote',

  // Links
  link: 'lexical-link',

  // Code
  code: 'lexical-code-block',
  codeHighlight: {
    atrule: 'lexical-code-atrule',
    attr: 'lexical-code-attr',
    boolean: 'lexical-code-boolean',
    builtin: 'lexical-code-builtin',
    cdata: 'lexical-code-cdata',
    char: 'lexical-code-char',
    class: 'lexical-code-class',
    'class-name': 'lexical-code-class-name',
    comment: 'lexical-code-comment',
    constant: 'lexical-code-constant',
    deleted: 'lexical-code-deleted',
    doctype: 'lexical-code-doctype',
    entity: 'lexical-code-entity',
    function: 'lexical-code-function',
    important: 'lexical-code-important',
    inserted: 'lexical-code-inserted',
    keyword: 'lexical-code-keyword',
    namespace: 'lexical-code-namespace',
    number: 'lexical-code-number',
    operator: 'lexical-code-operator',
    prolog: 'lexical-code-prolog',
    property: 'lexical-code-property',
    punctuation: 'lexical-code-punctuation',
    regex: 'lexical-code-regex',
    selector: 'lexical-code-selector',
    string: 'lexical-code-string',
    symbol: 'lexical-code-symbol',
    tag: 'lexical-code-tag',
    url: 'lexical-code-url',
    variable: 'lexical-code-variable',
  },

  // Tables (future)
  table: 'lexical-table',
  tableCell: 'lexical-table-cell',
  tableCellHeader: 'lexical-table-cell-header',
  tableRow: 'lexical-table-row',

  // Images (future)
  image: 'lexical-image',

  // Horizontal rule
  hr: 'lexical-hr',

  // Wiki links
  wikiLink: 'wiki-link',

  // Task references
  taskRef: 'task-ref',

  // Mentions
  mention: 'mention',

  // Signatures
  signature: 'signature',
};

export default editorTheme;
