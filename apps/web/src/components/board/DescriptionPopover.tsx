/*
 * DescriptionPopover Component
 * Version: 1.1.0
 *
 * Hover popover showing task description/notes.
 * Uses HoverPopover for consistent behavior.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: Opus 4.5
 * Host: linux-dev
 * Signed: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { HoverPopover, PopoverHeader, PopoverContent } from '@/components/ui/HoverPopover'
import DOMPurify from 'dompurify'

// =============================================================================
// Types
// =============================================================================

interface DescriptionPopoverProps {
  description: string | null
  children: React.ReactNode
}

// =============================================================================
// Description Content
// =============================================================================

function DescriptionContent({ description }: { description: string }) {
  // Check if description contains HTML (from GitHub sync)
  const containsHtml = /<[^>]+>/.test(description)

  // Sanitize HTML to prevent XSS, allow img tags with src/alt/width/height
  const sanitizeHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'img', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'width', 'height', 'class', 'target', 'rel'],
    })
  }

  // Format plain text description for preview
  const formatPlainText = (text: string) => {
    const lines = text.split('\n').slice(0, 20)
    return lines.map((line, i) => (
      <p key={i} className={`${line === '' ? 'h-3' : ''}`}>
        {line || '\u00A0'}
      </p>
    ))
  }

  return (
    <>
      <PopoverHeader
        icon={
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        title="Description"
      />
      <PopoverContent className="px-3 py-3 max-h-[340px]">
        {containsHtml ? (
          <div
            className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
          />
        ) : (
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {formatPlainText(description)}
          </div>
        )}
        {!containsHtml && description.split('\n').length > 20 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
            ... (click to see full description)
          </p>
        )}
      </PopoverContent>
    </>
  )
}

// =============================================================================
// DescriptionPopover Component
// =============================================================================

export function DescriptionPopover({ description, children }: DescriptionPopoverProps) {
  // If no description, just render children
  if (!description) {
    return <>{children}</>
  }

  return (
    <HoverPopover
      content={<DescriptionContent description={description} />}
      width={350}
      maxHeight={400}
      position="right"
    >
      {children}
    </HoverPopover>
  )
}

export default DescriptionPopover
