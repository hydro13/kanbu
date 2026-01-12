/**
 * Wiki Link Node for Lexical Editor
 *
 * An inline ElementNode that represents a [[Wiki Link]] in the editor.
 * Renders as a clickable link that navigates to the target wiki page.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (Fase 3 - Cross References)
 * ===================================================================
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical'
import { $applyNodeReplacement, ElementNode, $createTextNode } from 'lexical'
import { addClassNamesToElement } from '@lexical/utils'

// =============================================================================
// Types
// =============================================================================

export interface WikiLinkPayload {
  /** Target page slug */
  pageSlug: string
  /** Display text (usually page title) */
  displayText: string
  /** Whether the target page exists */
  exists?: boolean
  /** Optional key for the node */
  key?: NodeKey
}

export type SerializedWikiLinkNode = Spread<
  {
    pageSlug: string
    displayText: string
    exists: boolean
  },
  SerializedElementNode
>

// =============================================================================
// Wiki Link Node
// =============================================================================

export class WikiLinkNode extends ElementNode {
  __pageSlug: string
  __displayText: string
  __exists: boolean

  static getType(): string {
    return 'wiki-link'
  }

  static clone(node: WikiLinkNode): WikiLinkNode {
    return new WikiLinkNode(
      node.__pageSlug,
      node.__displayText,
      node.__exists,
      node.__key
    )
  }

  constructor(
    pageSlug: string,
    displayText: string,
    exists: boolean = true,
    key?: NodeKey
  ) {
    super(key)
    this.__pageSlug = pageSlug
    this.__displayText = displayText
    this.__exists = exists
  }

  // Getters
  getPageSlug(): string {
    return this.__pageSlug
  }

  getDisplayText(): string {
    return this.__displayText
  }

  getExists(): boolean {
    return this.__exists
  }

  // Setters (create new version for immutability)
  setPageSlug(pageSlug: string): void {
    const writable = this.getWritable()
    writable.__pageSlug = pageSlug
  }

  setDisplayText(displayText: string): void {
    const writable = this.getWritable()
    writable.__displayText = displayText
  }

  setExists(exists: boolean): void {
    const writable = this.getWritable()
    writable.__exists = exists
  }

  // Inline element that cannot contain other elements
  isInline(): boolean {
    return true
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }

  // DOM Creation
  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('span')
    addClassNamesToElement(
      element,
      config.theme.wikiLink ?? 'wiki-link'
    )

    // Add data attributes for styling
    element.setAttribute('data-wiki-link', this.__pageSlug)
    element.setAttribute('data-exists', String(this.__exists))

    // Style based on existence
    if (!this.__exists) {
      element.classList.add('wiki-link--missing')
    }

    return element
  }

  updateDOM(prevNode: WikiLinkNode, dom: HTMLElement): boolean {
    // Update if slug or exists changed
    if (prevNode.__pageSlug !== this.__pageSlug) {
      dom.setAttribute('data-wiki-link', this.__pageSlug)
    }
    if (prevNode.__exists !== this.__exists) {
      dom.setAttribute('data-exists', String(this.__exists))
      if (this.__exists) {
        dom.classList.remove('wiki-link--missing')
      } else {
        dom.classList.add('wiki-link--missing')
      }
    }
    return false
  }

  // HTML Export
  exportDOM(): DOMExportOutput {
    const element = document.createElement('a')
    element.setAttribute('href', `#wiki:${this.__pageSlug}`)
    element.setAttribute('data-wiki-link', this.__pageSlug)
    element.textContent = this.__displayText
    element.className = this.__exists ? 'wiki-link' : 'wiki-link wiki-link--missing'
    return { element }
  }

  // HTML Import
  static importDOM(): DOMConversionMap | null {
    return {
      a: (domNode: HTMLElement) => {
        const href = domNode.getAttribute('href')
        if (href?.startsWith('#wiki:')) {
          return {
            conversion: convertWikiLinkElement,
            priority: 1,
          }
        }
        return null
      },
      span: (domNode: HTMLElement) => {
        if (domNode.hasAttribute('data-wiki-link')) {
          return {
            conversion: convertWikiLinkElement,
            priority: 1,
          }
        }
        return null
      },
    }
  }

  // JSON Serialization
  static importJSON(serializedNode: SerializedWikiLinkNode): WikiLinkNode {
    // Use raw constructor to avoid duplicate children bug
    // Lexical will restore children from the serialized JSON automatically
    const node = new WikiLinkNode(
      serializedNode.pageSlug,
      serializedNode.displayText,
      serializedNode.exists
    )
    return node
  }

  exportJSON(): SerializedWikiLinkNode {
    return {
      ...super.exportJSON(),
      type: 'wiki-link',
      pageSlug: this.__pageSlug,
      displayText: this.__displayText,
      exists: this.__exists,
      version: 1,
    }
  }

  // Text content for copy/paste
  getTextContent(): string {
    return `[[${this.__displayText}]]`
  }
}

// =============================================================================
// DOM Conversion Helper
// =============================================================================

function convertWikiLinkElement(domNode: HTMLElement): DOMConversionOutput {
  let pageSlug = ''
  let displayText = ''

  // Try to get from data attribute
  pageSlug = domNode.getAttribute('data-wiki-link') ?? ''

  // Try to get from href
  if (!pageSlug) {
    const href = domNode.getAttribute('href')
    if (href?.startsWith('#wiki:')) {
      pageSlug = href.substring(6)
    }
  }

  // Get display text
  displayText = domNode.textContent ?? pageSlug

  if (pageSlug) {
    const node = $createWikiLinkNode({
      pageSlug,
      displayText,
      exists: !domNode.classList.contains('wiki-link--missing'),
    })
    // Add the text as a child
    node.append($createTextNode(displayText))
    return { node }
  }

  return { node: null }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function $createWikiLinkNode(payload: WikiLinkPayload): WikiLinkNode {
  const node = new WikiLinkNode(
    payload.pageSlug,
    payload.displayText,
    payload.exists ?? true,
    payload.key
  )
  // Add the display text as a child
  node.append($createTextNode(payload.displayText))
  return $applyNodeReplacement(node)
}

export function $isWikiLinkNode(
  node: LexicalNode | null | undefined
): node is WikiLinkNode {
  return node instanceof WikiLinkNode
}
