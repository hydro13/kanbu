/**
 * Mention Node for Lexical Editor
 *
 * An inline ElementNode that represents an @username mention in the editor.
 * Renders as a styled span that can be clicked to view the user profile.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (@mentions plugin)
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
} from 'lexical';
import { $applyNodeReplacement, ElementNode, $createTextNode } from 'lexical';
import { addClassNamesToElement } from '@lexical/utils';

// =============================================================================
// Types
// =============================================================================

export interface MentionPayload {
  /** User ID */
  userId: number;
  /** Username (without @) */
  username: string;
  /** Display name */
  name: string | null;
  /** Avatar URL */
  avatarUrl?: string | null;
  /** Optional key for the node */
  key?: NodeKey;
}

export type SerializedMentionNode = Spread<
  {
    userId: number;
    username: string;
    name: string | null;
  },
  SerializedElementNode
>;

// =============================================================================
// Mention Node
// =============================================================================

export class MentionNode extends ElementNode {
  __userId: number;
  __username: string;
  __name: string | null;

  static getType(): string {
    return 'mention';
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__userId, node.__username, node.__name, node.__key);
  }

  constructor(userId: number, username: string, name: string | null, key?: NodeKey) {
    super(key);
    this.__userId = userId;
    this.__username = username;
    this.__name = name;
  }

  // Getters
  getUserId(): number {
    return this.__userId;
  }

  getUsername(): string {
    return this.__username;
  }

  getName(): string | null {
    return this.__name;
  }

  // Setters (create new version for immutability)
  setUserId(userId: number): void {
    const writable = this.getWritable();
    writable.__userId = userId;
  }

  setUsername(username: string): void {
    const writable = this.getWritable();
    writable.__username = username;
  }

  setName(name: string | null): void {
    const writable = this.getWritable();
    writable.__name = name;
  }

  // Inline element that cannot contain other elements
  isInline(): boolean {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  // DOM Creation
  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('span');
    addClassNamesToElement(element, config.theme.mention ?? 'mention');

    // Add data attributes for identification
    element.setAttribute('data-mention', this.__username);
    element.setAttribute('data-user-id', String(this.__userId));
    element.setAttribute('title', this.__name ?? this.__username);

    return element;
  }

  updateDOM(prevNode: MentionNode, dom: HTMLElement): boolean {
    // Update if properties changed
    if (prevNode.__username !== this.__username) {
      dom.setAttribute('data-mention', this.__username);
    }
    if (prevNode.__userId !== this.__userId) {
      dom.setAttribute('data-user-id', String(this.__userId));
    }
    if (prevNode.__name !== this.__name) {
      dom.setAttribute('title', this.__name ?? this.__username);
    }
    return false;
  }

  // HTML Export
  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-mention', this.__username);
    element.setAttribute('data-user-id', String(this.__userId));
    element.textContent = `@${this.__username}`;
    element.className = 'mention';
    return { element };
  }

  // HTML Import
  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (domNode.hasAttribute('data-mention')) {
          return {
            conversion: convertMentionElement,
            priority: 1,
          };
        }
        return null;
      },
    };
  }

  // JSON Serialization
  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    // Don't use $createMentionNode here - it would add duplicate children
    // The children are already in the serialized node and will be restored by Lexical
    const node = new MentionNode(
      serializedNode.userId,
      serializedNode.username,
      serializedNode.name
    );
    return node;
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      type: 'mention',
      userId: this.__userId,
      username: this.__username,
      name: this.__name,
      version: 1,
    };
  }

  // Text content for copy/paste
  getTextContent(): string {
    return `@${this.__username}`;
  }
}

// =============================================================================
// DOM Conversion Helper
// =============================================================================

function convertMentionElement(domNode: HTMLElement): DOMConversionOutput {
  const username = domNode.getAttribute('data-mention') ?? '';
  const userIdAttr = domNode.getAttribute('data-user-id');
  const userId = userIdAttr ? parseInt(userIdAttr, 10) : 0;

  // Get name from title attribute or use username
  const name = domNode.getAttribute('title') ?? username;

  if (username) {
    const node = $createMentionNode({
      userId,
      username,
      name,
    });
    return { node };
  }

  return { node: null };
}

// =============================================================================
// Factory Functions
// =============================================================================

export function $createMentionNode(payload: MentionPayload): MentionNode {
  const node = new MentionNode(payload.userId, payload.username, payload.name, payload.key);
  // Add the mention text as a child
  node.append($createTextNode(`@${payload.username}`));
  return $applyNodeReplacement(node);
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
  return node instanceof MentionNode;
}
