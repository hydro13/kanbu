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
  // Truncate and format description for preview
  const formatDescription = (text: string) => {
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
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
          {formatDescription(description)}
        </div>
        {description.split('\n').length > 20 && (
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
