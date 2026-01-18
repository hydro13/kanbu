/**
 * Signature Plugin for Lexical Editor
 *
 * Handles & syntax for inserting user signatures.
 * Type &Sign to insert your own signature, or &username for others.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (signature insertion feature)
 * ===================================================================
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
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
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { $createSignatureNode } from './nodes/SignatureNode';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface SignatureUser {
  id: number;
  username: string;
  name: string | null;
  avatarUrl?: string | null;
}

export interface SignaturePluginProps {
  /** Current user (for &Sign shortcut) */
  currentUser?: SignatureUser;
  /** Function to search for users */
  searchUsers?: (query: string) => Promise<SignatureUser[]>;
}

// =============================================================================
// Types for positioning
// =============================================================================

interface AnchorRect {
  left: number;
  top: number;
  bottom: number;
}

// =============================================================================
// Avatar Component
// =============================================================================

function UserAvatar({ user }: { user: SignatureUser }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? user.username}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }

  // Fallback initials avatar
  const initials = (user.name ?? user.username)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
      {initials}
    </div>
  );
}

// =============================================================================
// Autocomplete Dropdown Component
// =============================================================================

interface AutocompleteDropdownProps {
  anchorRect: AnchorRect | null;
  items: SignatureUser[];
  selectedIndex: number;
  onSelect: (user: SignatureUser) => void;
  query: string;
  isLoading?: boolean;
  currentUser?: SignatureUser;
}

function AutocompleteDropdown({
  anchorRect,
  items,
  selectedIndex,
  onSelect,
  query,
  isLoading,
  currentUser,
}: AutocompleteDropdownProps) {
  if (!anchorRect) return null;

  // Calculate position
  const dropdownWidth = 320;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = anchorRect.left - dropdownWidth / 2 + 10;
  left = Math.max(16, Math.min(left, viewportWidth - dropdownWidth - 16));

  let top = anchorRect.bottom + 8;
  const dropdownHeight = 300;
  if (top + dropdownHeight > viewportHeight - 16) {
    top = anchorRect.top - dropdownHeight - 8;
  }

  // Check for &Sign or &sign shortcut
  const isSignShortcut = query.toLowerCase() === 'sign';

  // Build display items - add current user as "Sign" option at top
  const displayItems: (SignatureUser & { isSignOption?: boolean })[] = [];

  if (
    currentUser &&
    (query === '' ||
      isSignShortcut ||
      currentUser.username.toLowerCase().includes(query.toLowerCase()) ||
      (currentUser.name ?? '').toLowerCase().includes(query.toLowerCase()))
  ) {
    displayItems.push({ ...currentUser, isSignOption: true });
  }

  // Add other users (but not current user again)
  items.forEach((user) => {
    if (!currentUser || user.id !== currentUser.id) {
      displayItems.push(user);
    }
  });

  return createPortal(
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-xl overflow-hidden"
      style={{
        top,
        left,
        width: dropdownWidth,
      }}
    >
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
        Insert Signature
      </div>
      {isLoading ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">Searching users...</div>
      ) : displayItems.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">
          {query ? `No users matching "${query}"` : 'Type to search users...'}
        </div>
      ) : (
        <div className="max-h-[240px] overflow-y-auto">
          {displayItems.map((user, index) => (
            <button
              key={user.id}
              className={cn(
                'w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center gap-3',
                index === selectedIndex && 'bg-accent'
              )}
              onClick={() => onSelect(user)}
            >
              <UserAvatar user={user} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{user.name ?? user.username}</span>
                  {'isSignOption' in user && user.isSignOption && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      Your signature
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t bg-muted/30">
        Type <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">&Sign</kbd> for quick
        signature
      </div>
    </div>,
    document.body
  );
}

// =============================================================================
// Main Plugin
// =============================================================================

export function SignaturePlugin({
  currentUser,
  searchUsers,
}: SignaturePluginProps): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [searchResults, setSearchResults] = useState<SignatureUser[]>([]);
  const [triggerOffset, setTriggerOffset] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // Guard against duplicate insertions
  const isInsertingRef = useRef(false);

  // Build display items for index calculation
  const displayItems: SignatureUser[] = [];
  if (
    currentUser &&
    (query === '' ||
      query.toLowerCase() === 'sign' ||
      currentUser.username.toLowerCase().includes(query.toLowerCase()) ||
      (currentUser.name ?? '').toLowerCase().includes(query.toLowerCase()))
  ) {
    displayItems.push(currentUser);
  }
  searchResults.forEach((user) => {
    if (!currentUser || user.id !== currentUser.id) {
      displayItems.push(user);
    }
  });

  // Search effect for async search
  useEffect(() => {
    if (!searchUsers || !isOpen) {
      setSearchResults([]);
      return;
    }

    // Don't search if just "sign" - that's for current user
    if (query.toLowerCase() === 'sign') {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchUsers(query);
        setSearchResults(results);
      } catch (error) {
        console.error('User search failed:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query, searchUsers, isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayItems.length]);

  // Insert signature
  const insertSignature = useCallback(
    (user: SignatureUser) => {
      // Prevent duplicate insertions
      if (isInsertingRef.current) return;
      isInsertingRef.current = true;

      // Close dropdown immediately
      setIsOpen(false);
      setQuery('');
      const currentTriggerOffset = triggerOffset;
      setTriggerOffset(null);

      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || currentTriggerOffset === null) {
          isInsertingRef.current = false;
          return;
        }

        const anchor = selection.anchor;
        const node = anchor.getNode();

        if (node instanceof TextNode) {
          const text = node.getTextContent();
          const beforeTrigger = text.substring(0, currentTriggerOffset);
          const afterCursor = text.substring(anchor.offset);

          // Create the signature node
          const signatureNode = $createSignatureNode({
            userId: user.id,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatarUrl,
          });

          // Replace text
          node.setTextContent(beforeTrigger);
          node.insertAfter(signatureNode);

          if (afterCursor) {
            const afterNode = $createTextNode(afterCursor);
            signatureNode.insertAfter(afterNode);
          }

          // Add space after signature
          const spaceNode = $createTextNode(' ');
          signatureNode.insertAfter(spaceNode);
          spaceNode.select(1, 1);
        }

        setTimeout(() => {
          isInsertingRef.current = false;
        }, 100);
      });
    },
    [editor, triggerOffset]
  );

  // Handle selection
  const handleSelect = useCallback(
    (user: SignatureUser) => {
      insertSignature(user);
    },
    [insertSignature]
  );

  // Update listener to detect & and track query
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          if (isOpenRef.current) {
            setIsOpen(false);
            setQuery('');
            setTriggerOffset(null);
          }
          return;
        }

        const anchor = selection.anchor;
        const node = anchor.getNode();

        if (!(node instanceof TextNode)) {
          if (isOpenRef.current) {
            setIsOpen(false);
            setQuery('');
            setTriggerOffset(null);
          }
          return;
        }

        const text = node.getTextContent();
        const cursorPos = anchor.offset;
        const textBeforeCursor = text.substring(0, cursorPos);

        // Look for & that is either at the start or after whitespace
        let triggerIndex = -1;
        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
          if (textBeforeCursor[i] === '&') {
            if (i === 0 || /\s/.test(textBeforeCursor[i - 1] ?? '')) {
              triggerIndex = i;
              break;
            }
          }
          if (/\s/.test(textBeforeCursor[i] ?? '')) {
            break;
          }
        }

        if (triggerIndex === -1) {
          if (isOpenRef.current) {
            setIsOpen(false);
            setQuery('');
            setTriggerOffset(null);
          }
          return;
        }

        const queryText = textBeforeCursor.substring(triggerIndex + 1);

        // If query contains whitespace, close dropdown
        if (/\s/.test(queryText)) {
          if (isOpenRef.current) {
            setIsOpen(false);
            setQuery('');
            setTriggerOffset(null);
          }
          return;
        }

        setQuery(queryText);
        setTriggerOffset(triggerIndex);

        if (!isOpenRef.current) {
          setIsOpen(true);
        }

        // Update anchor position
        const domSelection = window.getSelection();
        if (domSelection && domSelection.rangeCount > 0) {
          const range = domSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setAnchorRect({
            left: rect.left,
            top: rect.top,
            bottom: rect.bottom,
          });
        }
      });
    });
  }, [editor]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false;
          event?.preventDefault();
          setSelectedIndex((prev) => (prev < displayItems.length - 1 ? prev + 1 : 0));
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false;
          event?.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayItems.length - 1));
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false;
          if (displayItems[selectedIndex]) {
            event?.preventDefault();
            handleSelect(displayItems[selectedIndex]);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          if (!isOpenRef.current) return false;
          if (displayItems[selectedIndex]) {
            event?.preventDefault();
            handleSelect(displayItems[selectedIndex]);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (!isOpenRef.current) return false;
          setIsOpen(false);
          setQuery('');
          setTriggerOffset(null);
          return true;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, isOpen, displayItems, selectedIndex, handleSelect]);

  // Update anchor position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setAnchorRect({
          left: rect.left,
          top: rect.top,
          bottom: rect.bottom,
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Don't render if no current user and no search function
  if (!currentUser && !searchUsers) return null;

  return isOpen ? (
    <AutocompleteDropdown
      anchorRect={anchorRect}
      items={searchResults}
      selectedIndex={selectedIndex}
      onSelect={handleSelect}
      query={query}
      isLoading={isLoading}
      currentUser={currentUser}
    />
  ) : null;
}

export default SignaturePlugin;
