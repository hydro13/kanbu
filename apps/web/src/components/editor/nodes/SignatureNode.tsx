/**
 * Signature Node for Lexical Editor
 *
 * A DecoratorNode that renders user signatures with avatar and full name.
 * Used for signing wiki pages, documents, etc.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (signature block feature)
 * Modified: 2026-01-12
 * Change: Changed to DecoratorNode for proper React component rendering
 * ===================================================================
 */

import type { JSX } from 'react';
import {
  DecoratorNode,
  $applyNodeReplacement,
  type LexicalNode,
  type LexicalEditor,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
} from 'lexical';

// =============================================================================
// Types
// =============================================================================

export interface SignaturePayload {
  userId: number;
  username: string;
  name: string | null;
  avatarUrl?: string | null;
  key?: NodeKey;
}

export type SerializedSignatureNode = Spread<
  {
    userId: number;
    username: string;
    name: string | null;
    avatarUrl?: string | null;
  },
  SerializedLexicalNode
>;

// =============================================================================
// Signature Node
// =============================================================================

export class SignatureNode extends DecoratorNode<JSX.Element> {
  __userId: number;
  __username: string;
  __name: string | null;
  __avatarUrl: string | null;

  static getType(): string {
    return 'signature';
  }

  static clone(node: SignatureNode): SignatureNode {
    return new SignatureNode(
      node.__userId,
      node.__username,
      node.__name,
      node.__avatarUrl,
      node.__key
    );
  }

  constructor(
    userId: number,
    username: string,
    name: string | null,
    avatarUrl?: string | null,
    key?: NodeKey
  ) {
    super(key);
    this.__userId = userId;
    this.__username = username;
    this.__name = name;
    this.__avatarUrl = avatarUrl ?? null;
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

  getAvatarUrl(): string | null {
    return this.__avatarUrl;
  }

  getDisplayName(): string {
    return this.__name || this.__username;
  }

  // DOM methods
  createDOM(_config: EditorConfig): HTMLElement {
    // Use a neutral wrapper - the React component handles all styling
    const span = document.createElement('span');
    span.setAttribute('data-lexical-decorator', 'true');
    return span;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.className = 'signature';
    element.setAttribute('data-user-id', String(this.__userId));
    element.setAttribute('data-username', this.__username);

    // Create avatar
    if (this.__avatarUrl) {
      const img = document.createElement('img');
      img.src = this.__avatarUrl;
      img.alt = this.getDisplayName();
      img.className = 'signature-avatar';
      element.appendChild(img);
    } else {
      // Initials fallback
      const initials = this.getDisplayName()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      const initialsSpan = document.createElement('span');
      initialsSpan.className = 'signature-initials';
      initialsSpan.textContent = initials;
      element.appendChild(initialsSpan);
    }

    // Create name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'signature-name';
    nameSpan.textContent = this.getDisplayName();
    element.appendChild(nameSpan);

    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.classList.contains('signature')) {
          return null;
        }
        return {
          conversion: (element: HTMLElement) => {
            const userId = parseInt(element.getAttribute('data-user-id') ?? '0', 10);
            const username = element.getAttribute('data-username') ?? '';
            const nameEl = element.querySelector('.signature-name');
            const name = nameEl?.textContent ?? null;

            return {
              node: new SignatureNode(userId, username, name),
            };
          },
          priority: 1,
        };
      },
    };
  }

  // Serialization
  static importJSON(serializedNode: SerializedSignatureNode): SignatureNode {
    return $createSignatureNode({
      userId: serializedNode.userId,
      username: serializedNode.username,
      name: serializedNode.name,
      avatarUrl: serializedNode.avatarUrl,
    });
  }

  exportJSON(): SerializedSignatureNode {
    return {
      ...super.exportJSON(),
      type: 'signature',
      userId: this.__userId,
      username: this.__username,
      name: this.__name,
      avatarUrl: this.__avatarUrl,
      version: 1,
    };
  }

  // Behavior
  isInline(): boolean {
    return true;
  }

  updateDOM(): false {
    return false;
  }

  // Decorate to render as React component
  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return (
      <SignatureComponent
        userId={this.__userId}
        username={this.__username}
        name={this.__name}
        avatarUrl={this.__avatarUrl}
      />
    );
  }
}

// =============================================================================
// React Component for Signature Display
// =============================================================================

interface SignatureComponentProps {
  userId: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

function SignatureComponent({ username, name, avatarUrl }: SignatureComponentProps) {
  const displayName = name || username;

  // Get initials for fallback avatar
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <span className="signature" contentEditable={false}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName} className="signature-avatar" />
      ) : (
        <span className="signature-initials">{initials}</span>
      )}
      <span className="signature-name">{displayName}</span>
    </span>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

export function $createSignatureNode(payload: SignaturePayload): SignatureNode {
  return $applyNodeReplacement(
    new SignatureNode(
      payload.userId,
      payload.username,
      payload.name,
      payload.avatarUrl,
      payload.key
    )
  );
}

export function $isSignatureNode(node: LexicalNode | null | undefined): node is SignatureNode {
  return node instanceof SignatureNode;
}
