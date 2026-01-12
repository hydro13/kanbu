/**
 * Wiki Link Plugin for Lexical Editor
 *
 * Handles [[wiki link]] syntax detection and autocomplete.
 * When user types [[, shows a dropdown with matching wiki pages.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (Fase 3 - Cross References)
 * ===================================================================
 */

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react'
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
import { $createWikiLinkNode } from './nodes/WikiLinkNode'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface WikiPage {
  id: number
  title: string
  slug: string
  exists?: boolean
}

export interface WikiLinkPluginProps {
  /** Function to search for wiki pages */
  searchPages?: (query: string) => Promise<WikiPage[]>
  /** Static list of pages (alternative to searchPages) */
  pages?: WikiPage[]
  /** Base path for wiki links (e.g., /workspace/slug/wiki) */
  basePath?: string
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
  items: WikiPage[]
  selectedIndex: number
  onSelect: (page: WikiPage) => void
  query: string
}

function AutocompleteDropdown({
  anchorRect,
  items,
  selectedIndex,
  onSelect,
  query,
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
  let top = anchorRect.bottom + 4
  const dropdownHeight = 250 // approximate max height
  if (top + dropdownHeight > viewportHeight - 16) {
    top = anchorRect.top - dropdownHeight - 8
  }

  return createPortal(
    <div
      className="fixed z-50 bg-popover border rounded-md shadow-lg overflow-hidden"
      style={{
        top,
        left,
        width: dropdownWidth,
      }}
    >
      {items.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          {query ? (
            <span>
              Create new page: <strong>"{query}"</strong>
            </span>
          ) : (
            'Type to search pages...'
          )}
        </div>
      ) : (
        <div className="max-h-[200px] overflow-y-auto">
          {items.map((page, index) => (
            <button
              key={page.id}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
              onClick={() => onSelect(page)}
            >
              <span className="font-medium">{page.title}</span>
              {!page.exists && (
                <span className="ml-2 text-xs text-muted-foreground">(new)</span>
              )}
            </button>
          ))}
        </div>
      )}
      {query && items.length > 0 && !items.some((p) => p.title.toLowerCase() === query.toLowerCase()) && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          Press Enter to create "{query}"
        </div>
      )}
    </div>,
    document.body
  )
}

// =============================================================================
// Main Plugin
// =============================================================================

export function WikiLinkPlugin({
  searchPages,
  pages = [],
  basePath: _basePath = '',
}: WikiLinkPluginProps): React.ReactElement | null {
  const [editor] = useLexicalComposerContext()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null)
  const [searchResults, setSearchResults] = useState<WikiPage[]>([])
  const [triggerOffset, setTriggerOffset] = useState<number | null>(null)

  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  // Filter pages based on query
  const filteredPages = useMemo(() => {
    if (searchPages) {
      return searchResults
    }

    if (!query) return pages.slice(0, 10)

    const lowerQuery = query.toLowerCase()
    return pages
      .filter((p) => p.title.toLowerCase().includes(lowerQuery))
      .slice(0, 10)
  }, [query, pages, searchPages, searchResults])

  // Search effect for async search
  useEffect(() => {
    if (!searchPages || !query) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchPages(query)
        setSearchResults(results)
      } catch (error) {
        console.error('Wiki page search failed:', error)
        setSearchResults([])
      }
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [query, searchPages])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredPages])

  // Insert wiki link
  const insertWikiLink = useCallback(
    (page: WikiPage) => {
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || triggerOffset === null) return

        // Get the text node and remove the [[ and query
        const anchor = selection.anchor
        const node = anchor.getNode()

        if (node instanceof TextNode) {
          const text = node.getTextContent()
          // Find the [[ trigger position
          const beforeTrigger = text.substring(0, triggerOffset)
          const afterCursor = text.substring(anchor.offset)

          // Create the wiki link node
          const wikiLinkNode = $createWikiLinkNode({
            pageSlug: page.slug,
            displayText: page.title,
            exists: page.exists !== false,
          })

          // Replace the text with our link
          node.setTextContent(beforeTrigger)

          // Insert after the shortened text node
          node.insertAfter(wikiLinkNode)

          // Add any remaining text after
          if (afterCursor) {
            const afterNode = $createTextNode(afterCursor)
            wikiLinkNode.insertAfter(afterNode)
          }

          // Add a space after the link for better UX
          const spaceNode = $createTextNode(' ')
          wikiLinkNode.insertAfter(spaceNode)

          // Move selection to after the space
          spaceNode.select(1, 1)
        }
      })

      // Close dropdown
      setIsOpen(false)
      setQuery('')
      setTriggerOffset(null)
    },
    [editor, triggerOffset]
  )

  // Handle creating a new page
  const createNewPage = useCallback(() => {
    if (!query) return

    const slug = query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100)

    insertWikiLink({
      id: -1, // Temporary ID for new page
      title: query,
      slug: slug || 'new-page',
      exists: false,
    })
  }, [query, insertWikiLink])

  // Handle selection
  const handleSelect = useCallback(
    (page: WikiPage) => {
      insertWikiLink(page)
    },
    [insertWikiLink]
  )

  // Update listener to detect [[ and track query
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

        // Find [[ before cursor
        const textBeforeCursor = text.substring(0, cursorPos)
        const triggerIndex = textBeforeCursor.lastIndexOf('[[')

        if (triggerIndex === -1) {
          if (isOpenRef.current) {
            setIsOpen(false)
            setQuery('')
            setTriggerOffset(null)
          }
          return
        }

        // Check if there's a ]] between trigger and cursor (link already closed)
        const betweenText = textBeforeCursor.substring(triggerIndex + 2)
        if (betweenText.includes(']]')) {
          if (isOpenRef.current) {
            setIsOpen(false)
            setQuery('')
            setTriggerOffset(null)
          }
          return
        }

        // We have an open [[, show dropdown
        const newQuery = betweenText
        setQuery(newQuery)
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
            prev < filteredPages.length - 1 ? prev + 1 : 0
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
            prev > 0 ? prev - 1 : filteredPages.length - 1
          )
          return true
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false
          event?.preventDefault()
          if (filteredPages[selectedIndex]) {
            handleSelect(filteredPages[selectedIndex])
          } else if (query) {
            createNewPage()
          }
          return true
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false
          event?.preventDefault()
          if (filteredPages[selectedIndex]) {
            handleSelect(filteredPages[selectedIndex])
          }
          return true
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
  }, [editor, isOpen, filteredPages, selectedIndex, handleSelect, createNewPage, query])

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

  return isOpen ? (
    <AutocompleteDropdown
      anchorRect={anchorRect}
      items={filteredPages}
      selectedIndex={selectedIndex}
      onSelect={handleSelect}
      query={query}
    />
  ) : null
}

export default WikiLinkPlugin
