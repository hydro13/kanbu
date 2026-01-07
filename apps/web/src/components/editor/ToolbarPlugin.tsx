/**
 * Toolbar Plugin for Lexical Editor
 *
 * Provides formatting controls for the rich text editor.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import {
  $isHeadingNode,
  $createHeadingNode,
  HeadingTagType,
} from '@lexical/rich-text'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $setBlocksType } from '@lexical/selection'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import { $createParagraphNode } from 'lexical'
import { $createQuoteNode, $isQuoteNode } from '@lexical/rich-text'
import { $createCodeNode, $isCodeNode } from '@lexical/code'

// =============================================================================
// Icons
// =============================================================================

function BoldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  )
}

function ItalicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  )
}

function UnderlineIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  )
}

function StrikethroughIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function ListOrderedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  )
}

function CheckListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 6h9" />
      <path d="M11 12h9" />
      <path d="M11 18h9" />
      <path d="M3 6l2 2 4-4" />
      <rect x="3" y="10" width="4" height="4" rx="1" />
      <path d="M3 18l2 2 4-4" />
    </svg>
  )
}

function QuoteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  )
}

// =============================================================================
// Block Type Options
// =============================================================================

const blockTypeOptions = [
  { value: 'paragraph', label: 'Normal' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'quote', label: 'Quote' },
  { value: 'code', label: 'Code Block' },
] as const

type BlockType = typeof blockTypeOptions[number]['value']

// =============================================================================
// Component
// =============================================================================

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()

  // Text formatting state
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [isLink, setIsLink] = useState(false)

  // Block type state
  const [blockType, setBlockType] = useState<BlockType>('paragraph')

  // Undo/redo state
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Update toolbar state based on selection
  const updateToolbar = useCallback(() => {
    const selection = $getSelection()

    if ($isRangeSelection(selection)) {
      // Text formatting
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
      setIsCode(selection.hasFormat('code'))

      // Link
      const node = selection.anchor.getNode()
      const parent = node.getParent()
      setIsLink($isLinkNode(parent) || $isLinkNode(node))

      // Block type
      const anchorNode = selection.anchor.getNode()
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent()
              return parent !== null && $isRootOrShadowRoot(parent)
            })

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow()
      }

      const elementKey = element.getKey()
      const elementDOM = editor.getElementByKey(elementKey)

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $findMatchingParent(anchorNode, $isListNode) as ListNode | null
          const listType = parentList ? parentList.getListType() : element.getListType()
          setBlockType(listType === 'number' ? 'paragraph' : 'paragraph')
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : $isQuoteNode(element)
            ? 'quote'
            : $isCodeNode(element)
            ? 'code'
            : 'paragraph'
          setBlockType(type as BlockType)
        }
      }
    }
  }, [editor])

  // Register update listener
  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar()
        })
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar()
          return false
        },
        1
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload)
          return false
        },
        1
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload)
          return false
        },
        1
      )
    )
  }, [editor, updateToolbar])

  // Format handlers
  const formatBold = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
  const formatItalic = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
  const formatUnderline = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
  const formatStrikethrough = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
  const formatCode = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')

  // List handlers
  const formatBulletList = () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
  const formatNumberedList = () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
  const formatCheckList = () => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)

  // Block type handler
  const formatBlockType = (type: BlockType) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (type === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode())
        } else if (type === 'h1' || type === 'h2' || type === 'h3') {
          $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType))
        } else if (type === 'quote') {
          $setBlocksType(selection, () => $createQuoteNode())
        } else if (type === 'code') {
          $setBlocksType(selection, () => $createCodeNode())
        }
      }
    })
  }

  // Link handler
  const insertLink = useCallback(() => {
    if (!isLink) {
      const url = prompt('Enter URL:')
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    }
  }, [editor, isLink])

  // Undo/redo handlers
  const undo = () => editor.dispatchCommand(UNDO_COMMAND, undefined)
  const redo = () => editor.dispatchCommand(REDO_COMMAND, undefined)

  return (
    <div className="lexical-toolbar">
      {/* Undo/Redo */}
      <div className="lexical-toolbar-group">
        <button
          type="button"
          className="lexical-toolbar-button"
          disabled={!canUndo}
          onClick={undo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="lexical-toolbar-button"
          disabled={!canRedo}
          onClick={redo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <RedoIcon />
        </button>
      </div>

      <div className="lexical-toolbar-divider" />

      {/* Block Type */}
      <div className="lexical-toolbar-group">
        <select
          className="lexical-toolbar-select"
          value={blockType}
          onChange={(e) => formatBlockType(e.target.value as BlockType)}
          aria-label="Block type"
        >
          {blockTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="lexical-toolbar-divider" />

      {/* Text Formatting */}
      <div className="lexical-toolbar-group">
        <button
          type="button"
          className={`lexical-toolbar-button ${isBold ? 'active' : ''}`}
          onClick={formatBold}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <BoldIcon />
        </button>
        <button
          type="button"
          className={`lexical-toolbar-button ${isItalic ? 'active' : ''}`}
          onClick={formatItalic}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <ItalicIcon />
        </button>
        <button
          type="button"
          className={`lexical-toolbar-button ${isUnderline ? 'active' : ''}`}
          onClick={formatUnderline}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <UnderlineIcon />
        </button>
        <button
          type="button"
          className={`lexical-toolbar-button ${isStrikethrough ? 'active' : ''}`}
          onClick={formatStrikethrough}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <StrikethroughIcon />
        </button>
        <button
          type="button"
          className={`lexical-toolbar-button ${isCode ? 'active' : ''}`}
          onClick={formatCode}
          title="Inline Code"
          aria-label="Inline Code"
        >
          <CodeIcon />
        </button>
      </div>

      <div className="lexical-toolbar-divider" />

      {/* Lists */}
      <div className="lexical-toolbar-group">
        <button
          type="button"
          className="lexical-toolbar-button"
          onClick={formatBulletList}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <ListIcon />
        </button>
        <button
          type="button"
          className="lexical-toolbar-button"
          onClick={formatNumberedList}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrderedIcon />
        </button>
        <button
          type="button"
          className="lexical-toolbar-button"
          onClick={formatCheckList}
          title="Check List"
          aria-label="Check List"
        >
          <CheckListIcon />
        </button>
      </div>

      <div className="lexical-toolbar-divider" />

      {/* Quote & Link */}
      <div className="lexical-toolbar-group">
        <button
          type="button"
          className={`lexical-toolbar-button ${blockType === 'quote' ? 'active' : ''}`}
          onClick={() => formatBlockType('quote')}
          title="Quote"
          aria-label="Quote"
        >
          <QuoteIcon />
        </button>
        <button
          type="button"
          className={`lexical-toolbar-button ${isLink ? 'active' : ''}`}
          onClick={insertLink}
          title="Link (Ctrl+K)"
          aria-label="Link"
        >
          <LinkIcon />
        </button>
      </div>
    </div>
  )
}

export default ToolbarPlugin
