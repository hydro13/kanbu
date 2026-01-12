/**
 * Mention Plugin for Lexical Editor
 *
 * Handles @username syntax detection and autocomplete.
 * When user types @ followed by characters, shows a dropdown with matching users.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (@mentions plugin)
 * ===================================================================
 */

import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  TextNode,
} from 'lexical'
import { mergeRegister } from '@lexical/utils'
import { $createMentionNode } from './nodes/MentionNode'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface MentionResult {
  id: number
  username: string
  name: string | null
  avatarUrl?: string | null
}

export interface MentionPluginProps {
  /** Function to search for users */
  searchUsers?: (query: string) => Promise<MentionResult[]>
}

// =============================================================================
// Avatar Component
// =============================================================================

function UserAvatar({ user }: { user: MentionResult }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? user.username}
        className="w-6 h-6 rounded-full object-cover"
      />
    )
  }

  // Fallback initials avatar
  const initials = (user.name ?? user.username)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
      {initials}
    </div>
  )
}

// =============================================================================
// Types for positioning
// =============================================================================

interface AnchorRect {
  left: number
  top: number
  bottom: number
}

// =============================================================================
// Autocomplete Dropdown Component
// =============================================================================

interface AutocompleteDropdownProps {
  anchorRect: AnchorRect | null
  items: MentionResult[]
  selectedIndex: number
  onSelect: (user: MentionResult) => void
  query: string
  isLoading?: boolean
}

function AutocompleteDropdown({
  anchorRect,
  items,
  selectedIndex,
  onSelect,
  query,
  isLoading,
}: AutocompleteDropdownProps) {
  if (!anchorRect) return null

  // Calculate position - center horizontally with some constraints
  const dropdownWidth = 300
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Position below cursor, but center the dropdown
  let left = anchorRect.left - dropdownWidth / 2 + 10
  // Constrain to viewport
  left = Math.max(16, Math.min(left, viewportWidth - dropdownWidth - 16))

  // Position below cursor, or above if not enough space below
  let top = anchorRect.bottom + 8
  const dropdownHeight = 250 // approximate max height
  if (top + dropdownHeight > viewportHeight - 16) {
    top = anchorRect.top - dropdownHeight - 8
  }

  return createPortal(
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-xl overflow-hidden"
      style={{
        top,
        left,
        width: dropdownWidth,
      }}
    >
      {isLoading ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          Searching users...
        </div>
      ) : items.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          {query ? `No users matching "${query}"` : 'Type to search users...'}
        </div>
      ) : (
        <div className="max-h-[200px] overflow-y-auto">
          {items.map((user, index) => (
            <button
              key={user.id}
              className={cn(
                'w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-3',
                index === selectedIndex && 'bg-accent'
              )}
              onClick={() => onSelect(user)}
            >
              <UserAvatar user={user} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.name ?? user.username}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}

// =============================================================================
// Main Plugin
// =============================================================================

export function MentionPlugin({
  searchUsers,
}: MentionPluginProps): React.ReactElement | null {
  const [editor] = useLexicalComposerContext()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null)
  const [searchResults, setSearchResults] = useState<MentionResult[]>([])
  const [triggerOffset, setTriggerOffset] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  // Guard against duplicate insertions
  const isInsertingRef = useRef(false)

  // Search effect for async search
  useEffect(() => {
    if (!searchUsers || !isOpen) {
      setSearchResults([])
      return
    }

    // Search immediately (empty query returns all members up to limit)
    setIsLoading(true)
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchUsers(query)
        setSearchResults(results)
      } catch (error) {
        console.error('User search failed:', error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [query, searchUsers, isOpen])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults])

  // Insert mention
  const insertMention = useCallback(
    (user: MentionResult) => {
      // Prevent duplicate insertions
      if (isInsertingRef.current) return
      isInsertingRef.current = true

      // Close dropdown immediately to prevent double-clicks
      setIsOpen(false)
      setQuery('')
      const currentTriggerOffset = triggerOffset
      setTriggerOffset(null)

      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || currentTriggerOffset === null) {
          isInsertingRef.current = false
          return
        }

        // Get the text node and remove the @ and query
        const anchor = selection.anchor
        const node = anchor.getNode()

        if (node instanceof TextNode) {
          const text = node.getTextContent()
          // Find the @ trigger position
          const beforeTrigger = text.substring(0, currentTriggerOffset)
          const afterCursor = text.substring(anchor.offset)

          // Create the mention node
          const mentionNode = $createMentionNode({
            userId: user.id,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatarUrl,
          })

          // Replace the text with our mention
          node.setTextContent(beforeTrigger)

          // Insert after the shortened text node
          node.insertAfter(mentionNode)

          // Add any remaining text after
          if (afterCursor) {
            const afterNode = $createTextNode(afterCursor)
            mentionNode.insertAfter(afterNode)
          }

          // Add a space after the mention for better UX
          const spaceNode = $createTextNode(' ')
          mentionNode.insertAfter(spaceNode)

          // Move selection to after the space
          spaceNode.select(1, 1)
        }

        // Reset insertion guard after update completes
        setTimeout(() => {
          isInsertingRef.current = false
        }, 100)
      })
    },
    [editor, triggerOffset]
  )

  // Handle selection
  const handleSelect = useCallback(
    (user: MentionResult) => {
      insertMention(user)
    },
    [insertMention]
  )

  // Update listener to detect @ and track query
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          if (isOpenRef.current) {
            setIsOpen(false)
            setQuery('')
            setTriggerOffset(null)
          }
          return
        }

        const anchor = selection.anchor
        const node = anchor.getNode()

        if (!(node instanceof TextNode)) {
          if (isOpenRef.current) {
            setIsOpen(false)
            setQuery('')
            setTriggerOffset(null)
          }
          return
        }

        const text = node.getTextContent()
        const cursorPos = anchor.offset

        // Find @ before cursor that could be a mention trigger
        const textBeforeCursor = text.substring(0, cursorPos)

        // Look for @ that is either at the start or after whitespace
        let triggerIndex = -1
        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
          if (textBeforeCursor[i] === '@') {
            // Check if it's a valid trigger position (start or after whitespace)
            if (i === 0 || /\s/.test(textBeforeCursor[i - 1] ?? '')) {
              triggerIndex = i
              break
            }
          }
          // Stop looking if we hit whitespace (no @ found in this word)
          if (/\s/.test(textBeforeCursor[i] ?? '')) {
            break
          }
        }

        if (triggerIndex === -1) {
          if (isOpenRef.current) {
            setIsOpen(false)
            setQuery('')
            setTriggerOffset(null)
          }
          return
        }

        // Get the query after @
        const queryText = textBeforeCursor.substring(triggerIndex + 1)

        // If query contains whitespace, close the dropdown (user is done)
        if (/\s/.test(queryText)) {
          if (isOpenRef.current) {
            setIsOpen(false)
            setQuery('')
            setTriggerOffset(null)
          }
          return
        }

        // We have a valid @ trigger, show dropdown
        setQuery(queryText)
        setTriggerOffset(triggerIndex)

        if (!isOpenRef.current) {
          setIsOpen(true)
        }

        // Always update anchor position while open
        const domSelection = window.getSelection()
        if (domSelection && domSelection.rangeCount > 0) {
          const range = domSelection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          setAnchorRect({
            left: rect.left,
            top: rect.top,
            bottom: rect.bottom,
          })
        }
      })
    })
  }, [editor])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false
          event?.preventDefault()
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : 0
          )
          return true
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false
          event?.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : searchResults.length - 1
          )
          return true
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false
          if (searchResults[selectedIndex]) {
            event?.preventDefault()
            handleSelect(searchResults[selectedIndex])
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false
          if (searchResults[selectedIndex]) {
            event?.preventDefault()
            handleSelect(searchResults[selectedIndex])
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (!isOpenRef.current) return false
          setIsOpen(false)
          setQuery('')
          setTriggerOffset(null)
          return true
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [editor, isOpen, searchResults, selectedIndex, handleSelect])

  // Update anchor position on scroll/resize
  useEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      const domSelection = window.getSelection()
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setAnchorRect({
          left: rect.left,
          top: rect.top,
          bottom: rect.bottom,
        })
      }
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // Don't render if no search function provided
  if (!searchUsers) return null

  return isOpen ? (
    <AutocompleteDropdown
      anchorRect={anchorRect}
      items={searchResults}
      selectedIndex={selectedIndex}
      onSelect={handleSelect}
      query={query}
      isLoading={isLoading}
    />
  ) : null
}

export default MentionPlugin
