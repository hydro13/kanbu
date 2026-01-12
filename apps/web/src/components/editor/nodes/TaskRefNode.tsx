/**
 * Task Reference Node for Lexical Editor
 *
 * An inline ElementNode that represents a #TASK-123 reference in the editor.
 * Renders as a clickable link that navigates to the task.
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

export interface TaskRefPayload {
  /** Task ID */
  taskId: number
  /** Task reference (e.g., KANBU-123) */
  reference: string
  /** Task title */
  title: string
  /** Whether the task exists */
  exists?: boolean
  /** Optional key for the node */
  key?: NodeKey
}

export type SerializedTaskRefNode = Spread<
  {
    taskId: number
    reference: string
    title: string
    exists: boolean
  },
  SerializedElementNode
>

// =============================================================================
// Task Reference Node
// =============================================================================

export class TaskRefNode extends ElementNode {
  __taskId: number
  __reference: string
  __title: string
  __exists: boolean

  static getType(): string {
    return 'task-ref'
  }

  static clone(node: TaskRefNode): TaskRefNode {
    return new TaskRefNode(
      node.__taskId,
      node.__reference,
      node.__title,
      node.__exists,
      node.__key
    )
  }

  constructor(
    taskId: number,
    reference: string,
    title: string,
    exists: boolean = true,
    key?: NodeKey
  ) {
    super(key)
    this.__taskId = taskId
    this.__reference = reference
    this.__title = title
    this.__exists = exists
  }

  // Getters
  getTaskId(): number {
    return this.__taskId
  }

  getReference(): string {
    return this.__reference
  }

  getTitle(): string {
    return this.__title
  }

  getExists(): boolean {
    return this.__exists
  }

  // Setters (create new version for immutability)
  setTaskId(taskId: number): void {
    const writable = this.getWritable()
    writable.__taskId = taskId
  }

  setReference(reference: string): void {
    const writable = this.getWritable()
    writable.__reference = reference
  }

  setTitle(title: string): void {
    const writable = this.getWritable()
    writable.__title = title
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
      config.theme.taskRef ?? 'task-ref'
    )

    // Add data attributes for styling and identification
    element.setAttribute('data-task-ref', this.__reference)
    element.setAttribute('data-task-id', String(this.__taskId))
    element.setAttribute('data-exists', String(this.__exists))
    element.setAttribute('title', this.__title)

    // Style based on existence
    if (!this.__exists) {
      element.classList.add('task-ref--missing')
    }

    return element
  }

  updateDOM(prevNode: TaskRefNode, dom: HTMLElement): boolean {
    // Update if properties changed
    if (prevNode.__reference !== this.__reference) {
      dom.setAttribute('data-task-ref', this.__reference)
    }
    if (prevNode.__taskId !== this.__taskId) {
      dom.setAttribute('data-task-id', String(this.__taskId))
    }
    if (prevNode.__title !== this.__title) {
      dom.setAttribute('title', this.__title)
    }
    if (prevNode.__exists !== this.__exists) {
      dom.setAttribute('data-exists', String(this.__exists))
      if (this.__exists) {
        dom.classList.remove('task-ref--missing')
      } else {
        dom.classList.add('task-ref--missing')
      }
    }
    return false
  }

  // HTML Export
  exportDOM(): DOMExportOutput {
    const element = document.createElement('a')
    element.setAttribute('href', `#task:${this.__reference}`)
    element.setAttribute('data-task-ref', this.__reference)
    element.setAttribute('data-task-id', String(this.__taskId))
    element.textContent = `#${this.__reference}`
    element.className = this.__exists ? 'task-ref' : 'task-ref task-ref--missing'
    return { element }
  }

  // HTML Import
  static importDOM(): DOMConversionMap | null {
    return {
      a: (domNode: HTMLElement) => {
        const href = domNode.getAttribute('href')
        if (href?.startsWith('#task:')) {
          return {
            conversion: convertTaskRefElement,
            priority: 1,
          }
        }
        return null
      },
      span: (domNode: HTMLElement) => {
        if (domNode.hasAttribute('data-task-ref')) {
          return {
            conversion: convertTaskRefElement,
            priority: 1,
          }
        }
        return null
      },
    }
  }

  // JSON Serialization
  static importJSON(serializedNode: SerializedTaskRefNode): TaskRefNode {
    // Don't use $createTaskRefNode here - it would add duplicate children
    // The children are already in the serialized node and will be restored by Lexical
    const node = new TaskRefNode(
      serializedNode.taskId,
      serializedNode.reference,
      serializedNode.title,
      serializedNode.exists
    )
    return node
  }

  exportJSON(): SerializedTaskRefNode {
    return {
      ...super.exportJSON(),
      type: 'task-ref',
      taskId: this.__taskId,
      reference: this.__reference,
      title: this.__title,
      exists: this.__exists,
      version: 1,
    }
  }

  // Text content for copy/paste
  getTextContent(): string {
    return `#${this.__reference}`
  }
}

// =============================================================================
// DOM Conversion Helper
// =============================================================================

function convertTaskRefElement(domNode: HTMLElement): DOMConversionOutput {
  let reference = ''
  let taskId = 0

  // Try to get from data attribute
  reference = domNode.getAttribute('data-task-ref') ?? ''
  const taskIdAttr = domNode.getAttribute('data-task-id')
  if (taskIdAttr) {
    taskId = parseInt(taskIdAttr, 10)
  }

  // Try to get from href
  if (!reference) {
    const href = domNode.getAttribute('href')
    if (href?.startsWith('#task:')) {
      reference = href.substring(6)
    }
  }

  // Get title from title attribute or text content
  const title = domNode.getAttribute('title') ?? domNode.textContent ?? reference

  if (reference) {
    // $createTaskRefNode already adds the text child, so don't add it again
    const node = $createTaskRefNode({
      taskId,
      reference,
      title,
      exists: !domNode.classList.contains('task-ref--missing'),
    })
    return { node }
  }

  return { node: null }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function $createTaskRefNode(payload: TaskRefPayload): TaskRefNode {
  const node = new TaskRefNode(
    payload.taskId,
    payload.reference,
    payload.title,
    payload.exists ?? true,
    payload.key
  )
  // Add the reference text as a child
  node.append($createTextNode(`#${payload.reference}`))
  return $applyNodeReplacement(node)
}

export function $isTaskRefNode(
  node: LexicalNode | null | undefined
): node is TaskRefNode {
  return node instanceof TaskRefNode
}
