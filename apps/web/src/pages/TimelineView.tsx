/*
 * Timeline View Page
 * Version: 1.0.0
 *
 * Gantt-style timeline view showing task duration as bars.
 * Tasks are displayed with start/due dates on a horizontal timeline.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: de75c403-118c-4293-8d05-c2e3147fd7c8
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:25 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { ViewSwitcher } from '@/components/layout/ViewSwitcher'
import { PresenceIndicator } from '@/components/board/PresenceIndicator'
import { LiveCursors } from '@/components/board/LiveCursors'
import { trpc } from '@/lib/trpc'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { PriorityBadge } from '@/components/task/PriorityBadge'
import { TaskDetailModal } from '@/components/task/TaskDetailModal'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'
import { pushUndoAction, updateLastActionSnapshot } from '@/store/undoSlice'
import { useProjectPermissions } from '@/hooks/useProjectPermissions'
import { UndoRedoButtons } from '@/components/ui/UndoRedoButtons'

// =============================================================================
// Types
// =============================================================================

interface TimelineTask {
  id: number
  title: string
  priority: number
  dateStarted: string | null
  dateDue: string | null
  isActive: boolean
  progress: number
  column?: { title: string } | null
}

type ZoomLevel = 'day' | 'week' | 'month'

// =============================================================================
// Icons
// =============================================================================

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

// =============================================================================
// Loading / Error States
// =============================================================================

function TimelineLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading timeline...</p>
      </div>
    </div>
  )
}

function TimelineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load timeline</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          Try Again
        </button>
      </div>
    </div>
  )
}

function TimelineEmpty() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No tasks with dates</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Add start or due dates to your tasks to see them on the timeline.</p>
      </div>
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getDateRange(tasks: TimelineTask[], weeksToShow: number): { start: Date; end: Date } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Default range: 2 weeks before and after today
  let start = new Date(today)
  start.setDate(start.getDate() - 7)
  let end = new Date(today)
  end.setDate(end.getDate() + weeksToShow * 7)

  // Extend range to include all tasks
  tasks.forEach((task) => {
    if (task.dateStarted) {
      const d = new Date(task.dateStarted)
      if (d < start) start = new Date(d)
    }
    if (task.dateDue) {
      const d = new Date(task.dateDue)
      if (d > end) end = new Date(d)
    }
  })

  // Add some padding
  start.setDate(start.getDate() - 3)
  end.setDate(end.getDate() + 7)

  return { start, end }
}

function getDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const current = new Date(start)

  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function getDayOffset(date: Date, startDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((date.getTime() - startDate.getTime()) / msPerDay)
}

// =============================================================================
// Timeline Toolbar (Zoom + Today)
// =============================================================================

interface TimelineToolbarProps {
  zoomLevel: ZoomLevel
  onZoomChange: (level: ZoomLevel) => void
  onScrollToToday: () => void
}

function TimelineToolbar({ zoomLevel, onZoomChange, onScrollToToday }: TimelineToolbarProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onScrollToToday}
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        Today
      </button>

      {/* Zoom Level Toggle */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {(['day', 'week', 'month'] as ZoomLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => onZoomChange(level)}
            className={`px-3 py-1.5 text-sm ${
              zoomLevel === level
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Timeline Grid
// =============================================================================

interface TimelineGridProps {
  days: Date[]
  tasks: TimelineTask[]
  startDate: Date
  cellWidth: number
  onTaskClick: (taskId: number) => void
  todayRef: React.RefObject<HTMLDivElement | null>
  onZoom: (delta: number) => void
  onTaskDateChange: (
    taskId: number,
    dateStarted: string | null,
    dateDue: string | null,
    previousDateStarted: string | null,
    previousDateDue: string | null
  ) => void
  canEdit: boolean
}

// Drag state type
type DragType = 'move' | 'resize-start' | 'resize-end' | null

interface DragState {
  taskId: number
  type: DragType
  initialX: number
  initialStartDate: Date | null
  initialEndDate: Date | null
}

function TimelineGrid({ days, tasks, startDate, cellWidth, onTaskClick, todayRef, onZoom, onTaskDateChange, canEdit }: TimelineGridProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Refs for drag-to-pan
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  // Drag-to-resize state
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragPreview, setDragPreview] = useState<{ startOffset: number; width: number } | null>(null)
  const taskHasDragged = useRef(false)

  // Handle mouse wheel zoom (scroll = zoom, shift+scroll = horizontal pan)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Horizontal scroll with shift is handled natively
    if (e.shiftKey) return

    // Vertical scroll = zoom in/out
    e.preventDefault()
    onZoom(e.deltaY > 0 ? -1 : 1)
  }, [onZoom])

  // Drag to pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left mouse button and not on a task bar
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-task-bar]')) return

    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing'
    }
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return

    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y

    containerRef.current.scrollLeft -= dx
    containerRef.current.scrollTop -= dy

    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
    }
  }, [])

  // Helper: Format date as ISO string (YYYY-MM-DD)
  const formatDateISO = (date: Date): string => {
    return date.toISOString().split('T')[0] ?? ''
  }

  // Start dragging a task bar
  const handleTaskDragStart = useCallback((
    e: React.MouseEvent,
    taskId: number,
    type: DragType,
    taskStartDate: Date | null,
    taskEndDate: Date | null
  ) => {
    // Only allow drag if user can edit
    if (!canEdit) return

    e.stopPropagation()
    e.preventDefault()

    taskHasDragged.current = false

    setDragState({
      taskId,
      type,
      initialX: e.clientX,
      initialStartDate: taskStartDate,
      initialEndDate: taskEndDate,
    })

    // Set initial preview
    if (taskStartDate && taskEndDate) {
      const startOffset = getDayOffset(taskStartDate, startDate) * cellWidth
      const width = Math.max(1, getDayOffset(taskEndDate, taskStartDate) + 1) * cellWidth
      setDragPreview({ startOffset, width })
    }
  }, [cellWidth, startDate, canEdit])

  // Handle mouse move during drag
  const handleTaskDragMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !dragState.type) return

    const deltaX = e.clientX - dragState.initialX
    const daysDelta = Math.round(deltaX / cellWidth)

    // Mark as dragged if movement exceeds threshold (5px)
    if (Math.abs(deltaX) > 5) {
      taskHasDragged.current = true
    }

    if (!dragState.initialStartDate && !dragState.initialEndDate) return

    let newStartDate = dragState.initialStartDate ? new Date(dragState.initialStartDate) : null
    let newEndDate = dragState.initialEndDate ? new Date(dragState.initialEndDate) : null

    if (dragState.type === 'move') {
      // Move entire bar
      if (newStartDate) newStartDate.setDate(newStartDate.getDate() + daysDelta)
      if (newEndDate) newEndDate.setDate(newEndDate.getDate() + daysDelta)
    } else if (dragState.type === 'resize-start') {
      // Resize from start (change or create start date)
      if (newStartDate) {
        newStartDate.setDate(newStartDate.getDate() + daysDelta)
      } else if (newEndDate && daysDelta < 0) {
        // Create new start date by dragging left from due-date-only task
        newStartDate = new Date(newEndDate)
        newStartDate.setDate(newStartDate.getDate() + daysDelta)
      }
      // Prevent start from going past end
      if (newEndDate && newStartDate && newStartDate > newEndDate) {
        newStartDate = new Date(newEndDate)
      }
    } else if (dragState.type === 'resize-end') {
      // Resize from end (change or create end date)
      if (newEndDate) {
        newEndDate.setDate(newEndDate.getDate() + daysDelta)
      } else if (newStartDate && daysDelta > 0) {
        // Create new end date by dragging right from start-date-only task
        newEndDate = new Date(newStartDate)
        newEndDate.setDate(newEndDate.getDate() + daysDelta)
      }
      // Prevent end from going before start
      if (newStartDate && newEndDate && newEndDate < newStartDate) {
        newEndDate = new Date(newStartDate)
      }
    }

    // Calculate preview position
    const effectiveStart = newStartDate ?? newEndDate
    const effectiveEnd = newEndDate ?? newStartDate

    if (effectiveStart && effectiveEnd) {
      const startOffset = getDayOffset(effectiveStart, startDate) * cellWidth
      const width = Math.max(1, getDayOffset(effectiveEnd, effectiveStart) + 1) * cellWidth
      setDragPreview({ startOffset, width })
    }
  }, [dragState, cellWidth, startDate])

  // End dragging
  const handleTaskDragEnd = useCallback((e: React.MouseEvent) => {
    if (!dragState || !dragState.type) {
      setDragState(null)
      setDragPreview(null)
      return
    }

    const deltaX = e.clientX - dragState.initialX
    const daysDelta = Math.round(deltaX / cellWidth)

    // Only update if actually moved
    if (daysDelta !== 0) {
      let newStartDate = dragState.initialStartDate ? new Date(dragState.initialStartDate) : null
      let newEndDate = dragState.initialEndDate ? new Date(dragState.initialEndDate) : null

      if (dragState.type === 'move') {
        if (newStartDate) newStartDate.setDate(newStartDate.getDate() + daysDelta)
        if (newEndDate) newEndDate.setDate(newEndDate.getDate() + daysDelta)
      } else if (dragState.type === 'resize-start') {
        // Resize from start (change or create start date)
        if (newStartDate) {
          newStartDate.setDate(newStartDate.getDate() + daysDelta)
        } else if (newEndDate && daysDelta < 0) {
          // Create new start date by dragging left from due-date-only task
          newStartDate = new Date(newEndDate)
          newStartDate.setDate(newStartDate.getDate() + daysDelta)
        }
        if (newEndDate && newStartDate && newStartDate > newEndDate) {
          newStartDate = new Date(newEndDate)
        }
      } else if (dragState.type === 'resize-end') {
        // Resize from end (change or create end date)
        if (newEndDate) {
          newEndDate.setDate(newEndDate.getDate() + daysDelta)
        } else if (newStartDate && daysDelta > 0) {
          // Create new end date by dragging right from start-date-only task
          newEndDate = new Date(newStartDate)
          newEndDate.setDate(newEndDate.getDate() + daysDelta)
        }
        if (newStartDate && newEndDate && newEndDate < newStartDate) {
          newEndDate = new Date(newStartDate)
        }
      }

      // Store previous dates for undo
      const previousDateStarted = dragState.initialStartDate ? formatDateISO(dragState.initialStartDate) : null
      const previousDateDue = dragState.initialEndDate ? formatDateISO(dragState.initialEndDate) : null

      // Call the update callback with previous dates for undo
      onTaskDateChange(
        dragState.taskId,
        newStartDate ? formatDateISO(newStartDate) : null,
        newEndDate ? formatDateISO(newEndDate) : null,
        previousDateStarted,
        previousDateDue
      )
    }

    setDragState(null)
    setDragPreview(null)
  }, [dragState, cellWidth, onTaskDateChange])

  // Group days by month for headers
  const months = useMemo(() => {
    const m: { month: string; days: number }[] = []
    let currentMonth = ''
    let count = 0

    days.forEach((day) => {
      const monthKey = day.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (monthKey !== currentMonth) {
        if (currentMonth) m.push({ month: currentMonth, days: count })
        currentMonth = monthKey
        count = 1
      } else {
        count++
      }
    })
    if (currentMonth) m.push({ month: currentMonth, days: count })

    return m
  }, [days])

  const priorityColors = ['bg-gray-400', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500']

  return (
    <div className="flex h-full">
      {/* Task labels column */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Header spacer */}
        <div className="h-16 border-b border-gray-200 dark:border-gray-700" />

        {/* Task rows */}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="h-12 px-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            onClick={() => onTaskClick(task.id)}
          >
            <PriorityBadge priority={task.priority} size="sm" />
            <span className={`text-sm truncate ${!task.isActive ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
              {task.title}
            </span>
          </div>
        ))}
      </div>

      {/* Timeline area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto select-none"
        style={{ cursor: dragState ? (dragState.type === 'move' ? 'grabbing' : 'ew-resize') : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          handleMouseMove(e)
          handleTaskDragMove(e)
        }}
        onMouseUp={(e) => {
          handleMouseUp()
          handleTaskDragEnd(e)
        }}
        onMouseLeave={(e) => {
          handleMouseLeave()
          if (dragState) {
            handleTaskDragEnd(e)
          }
        }}
      >
        <div style={{ width: days.length * cellWidth, minWidth: '100%' }}>
          {/* Month headers */}
          <div className="flex h-8 border-b border-gray-200 dark:border-gray-700">
            {months.map((m, i) => (
              <div
                key={i}
                style={{ width: m.days * cellWidth }}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1 border-r border-gray-200 dark:border-gray-700"
              >
                {m.month}
              </div>
            ))}
          </div>

          {/* Day headers */}
          <div className="flex h-8 border-b border-gray-200 dark:border-gray-700">
            {days.map((day, i) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const isToday = isSameDay(day, today)

              return (
                <div
                  key={i}
                  ref={isToday ? todayRef : undefined}
                  style={{ width: cellWidth }}
                  className={`text-xs text-center py-1 border-r border-gray-100 dark:border-gray-700 ${
                    isToday ? 'bg-blue-100 dark:bg-blue-900/30 font-bold text-blue-600' : isWeekend ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {day.getDate()}
                </div>
              )
            })}
          </div>

          {/* Task bars */}
          {tasks.map((task) => {
            // Calculate bar position and width
            let barStart = 0
            let barWidth = cellWidth // Default: 1 day
            let taskStartDate: Date | null = null
            let taskEndDate: Date | null = null

            if (task.dateStarted && task.dateDue) {
              const start = new Date(task.dateStarted)
              const end = new Date(task.dateDue)
              start.setHours(0, 0, 0, 0)
              end.setHours(0, 0, 0, 0)
              taskStartDate = start
              taskEndDate = end
              barStart = getDayOffset(start, startDate) * cellWidth
              barWidth = Math.max(1, getDayOffset(end, start) + 1) * cellWidth
            } else if (task.dateDue) {
              const due = new Date(task.dateDue)
              due.setHours(0, 0, 0, 0)
              taskEndDate = due
              barStart = getDayOffset(due, startDate) * cellWidth
              barWidth = cellWidth
            } else if (task.dateStarted) {
              const start = new Date(task.dateStarted)
              start.setHours(0, 0, 0, 0)
              taskStartDate = start
              barStart = getDayOffset(start, startDate) * cellWidth
              barWidth = cellWidth
            }

            const isDraggingThis = dragState?.taskId === task.id
            const displayStart = isDraggingThis && dragPreview ? dragPreview.startOffset : barStart
            const displayWidth = isDraggingThis && dragPreview ? dragPreview.width : barWidth
            const hasBothDates = task.dateStarted && task.dateDue

            return (
              <div key={task.id} className="h-12 relative border-b border-gray-100 dark:border-gray-700">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {days.map((day, i) => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6
                    const isToday = isSameDay(day, today)

                    return (
                      <div
                        key={i}
                        style={{ width: cellWidth }}
                        className={`border-r border-gray-100 dark:border-gray-700 ${
                          isToday ? 'bg-blue-50 dark:bg-blue-900/10' : isWeekend ? 'bg-gray-50 dark:bg-gray-800/30' : ''
                        }`}
                      />
                    )
                  })}
                </div>

                {/* Task bar */}
                {(task.dateStarted || task.dateDue) && (
                  <div
                    data-task-bar
                    className={`absolute top-2 h-8 rounded group ${priorityColors[task.priority]} ${
                      !task.isActive ? 'opacity-50' : ''
                    } ${isDraggingThis ? 'ring-2 ring-blue-400 opacity-80' : 'hover:ring-2 hover:ring-blue-400'} transition-all`}
                    style={{ left: displayStart, width: displayWidth, minWidth: 20 }}
                    title={task.title}
                  >
                    {/* Left resize handle (for start date, or to add start date to due-date-only tasks) */}
                    {canEdit && (taskStartDate || taskEndDate) && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l z-10"
                        onMouseDown={(e) => handleTaskDragStart(e, task.id, 'resize-start', taskStartDate, taskEndDate)}
                        title={taskStartDate ? "Drag to change start date" : "Drag left to add start date"}
                      />
                    )}

                    {/* Center area for moving (only if both dates exist and user can edit) */}
                    <div
                      className={`absolute inset-0 ${canEdit && hasBothDates ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} left-2 right-2`}
                      onMouseDown={(e) => {
                        if (canEdit && hasBothDates) {
                          handleTaskDragStart(e, task.id, 'move', taskStartDate, taskEndDate)
                        }
                      }}
                      onClick={(e) => {
                        // Only trigger click if not dragging (check hasDragged ref, not dragState which is already cleared)
                        if (!taskHasDragged.current) {
                          e.stopPropagation()
                          onTaskClick(task.id)
                        }
                      }}
                    />

                    {/* Right resize handle (for end date, or to add end date to start-date-only tasks) */}
                    {canEdit && (taskEndDate || taskStartDate) && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r z-10"
                        onMouseDown={(e) => handleTaskDragStart(e, task.id, 'resize-end', taskStartDate, taskEndDate)}
                        title={taskEndDate ? "Drag to change end date" : "Drag right to add end date"}
                      />
                    )}

                    {/* Progress overlay */}
                    {task.progress > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-black/20 rounded-l pointer-events-none"
                        style={{ width: `${task.progress}%` }}
                      />
                    )}

                    {/* Title (if bar is wide enough) */}
                    {displayWidth > 60 && (
                      <span className="absolute inset-0 flex items-center px-3 text-xs text-white truncate font-medium pointer-events-none">
                        {task.title}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main Timeline View Page
// =============================================================================

// Zoom level presets
const ZOOM_PRESETS = { day: 40, week: 20, month: 10 }
const MIN_CELL_WIDTH = 5
const MAX_CELL_WIDTH = 100

export function TimelineViewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const projectIdNum = projectId ? parseInt(projectId, 10) : null
  const currentUser = useAppSelector(selectUser)
  const todayRef = useRef<HTMLDivElement>(null)
  const timelineContainerRef = useRef<HTMLDivElement>(null)

  // Real-time collaboration sync
  useRealtimeSync({
    projectId: projectIdNum ?? 0,
    currentUserId: currentUser?.id ?? 0,
  })

  // Permissions
  const { canEdit } = useProjectPermissions(projectIdNum ?? 0)

  // State
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day')
  const [cellWidth, setCellWidth] = useState(ZOOM_PRESETS.day)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  // Queries
  const projectQuery = trpc.project.get.useQuery({ projectId: projectIdNum! }, { enabled: !!projectIdNum })
  const tasksQuery = trpc.task.list.useQuery({ projectId: projectIdNum!, limit: 500 }, { enabled: !!projectIdNum })

  // Mutations
  const utils = trpc.useUtils()
  const updateTaskMutation = trpc.task.update.useMutation({
    onSuccess: (data) => {
      console.log('[TIMELINE] mutation onSuccess:', {
        taskId: data.id,
        newUpdatedAt: data.updatedAt,
      })
      utils.task.list.invalidate({ projectId: projectIdNum! })
      // Update the undo action's snapshot with the new updatedAt
      if (data.updatedAt) {
        console.log('[TIMELINE] calling updateLastActionSnapshot...')
        dispatch(updateLastActionSnapshot({
          taskId: data.id,
          newUpdatedAt: data.updatedAt,
        }))
      }
    },
  })

  // Handle zoom level button change
  const handleZoomLevelChange = useCallback((level: ZoomLevel) => {
    setZoomLevel(level)
    setCellWidth(ZOOM_PRESETS[level])
  }, [])

  // Handle smooth zoom via mouse wheel
  const handleZoom = useCallback((delta: number) => {
    setCellWidth((prev) => {
      const newWidth = prev + delta * 5
      return Math.max(MIN_CELL_WIDTH, Math.min(MAX_CELL_WIDTH, newWidth))
    })
  }, [])

  // Filter tasks that have dates and prepare timeline data
  const timelineTasks = useMemo(() => {
    const tasks = tasksQuery.data ?? []
    return tasks
      .filter((task) => task.dateStarted || task.dateDue)
      .map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        dateStarted: task.dateStarted,
        dateDue: task.dateDue,
        isActive: task.isActive,
        progress: task.progress,
        column: task.column,
      }))
      .sort((a, b) => {
        // Sort by start date, then due date, then priority
        const aDate = a.dateStarted ?? a.dateDue ?? ''
        const bDate = b.dateStarted ?? b.dateDue ?? ''
        if (aDate !== bDate) return aDate.localeCompare(bDate)
        return b.priority - a.priority
      })
  }, [tasksQuery.data])

  // Calculate date range
  const { start: startDate, end: endDate } = useMemo(() => getDateRange(timelineTasks, 6), [timelineTasks])

  // Get all days in range
  const days = useMemo(() => getDaysBetween(startDate, endDate), [startDate, endDate])

  // Scroll to today on mount
  const handleScrollToToday = () => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  useEffect(() => {
    // Slight delay to ensure render is complete
    const timer = setTimeout(handleScrollToToday, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId)
  }

  // Helper to format date change description
  const formatDateDescription = (oldDate: string | null, newDate: string | null, label: string): string => {
    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : 'none'
    return `${label}: ${formatDate(oldDate)} → ${formatDate(newDate)}`
  }

  // Handle task date change from drag operations
  const handleTaskDateChange = useCallback((
    taskId: number,
    dateStarted: string | null,
    dateDue: string | null,
    previousDateStarted: string | null,
    previousDateDue: string | null
  ) => {
    // Find task to get current updatedAt for concurrency check
    const task = tasksQuery.data?.find(t => t.id === taskId)
    if (!task || !projectIdNum) return

    // Build description
    let description = 'Date change'
    if (previousDateDue !== dateDue) {
      description = formatDateDescription(previousDateDue, dateDue, 'Due date')
    } else if (previousDateStarted !== dateStarted) {
      description = formatDateDescription(previousDateStarted, dateStarted, 'Start date')
    }

    console.log('[TIMELINE] handleTaskDateChange:', {
      taskId,
      taskUpdatedAt: task.updatedAt,
      previousState: { dateStarted: previousDateStarted, dateDue: previousDateDue },
      newState: { dateStarted, dateDue },
      description,
    })

    // Push to undo stack
    dispatch(pushUndoAction({
      type: 'task.dateChange',
      taskId,
      projectId: projectIdNum,
      previousState: {
        dateStarted: previousDateStarted,
        dateDue: previousDateDue,
      },
      newState: {
        dateStarted,
        dateDue,
      },
      snapshotUpdatedAt: task.updatedAt,
      description,
    }))

    // Perform the update
    updateTaskMutation.mutate({
      taskId,
      dateStarted,
      dateDue,
    })
  }, [updateTaskMutation, tasksQuery.data, projectIdNum, dispatch])

  // Handle invalid project ID
  if (!projectIdNum || isNaN(projectIdNum)) {
    return (
      <ProjectLayout>
        <TimelineError message="Invalid project ID" onRetry={() => navigate('/workspaces')} />
      </ProjectLayout>
    )
  }

  // Loading state
  if (projectQuery.isLoading || tasksQuery.isLoading) {
    return (
      <ProjectLayout>
        <TimelineLoading />
      </ProjectLayout>
    )
  }

  // Error state
  if (projectQuery.error) {
    return (
      <ProjectLayout>
        <TimelineError message={projectQuery.error.message} onRetry={() => projectQuery.refetch()} />
      </ProjectLayout>
    )
  }

  if (!projectQuery.data) {
    return (
      <ProjectLayout>
        <TimelineError message="Project not found" onRetry={() => navigate('/workspaces')} />
      </ProjectLayout>
    )
  }

  const project = projectQuery.data

  return (
    <ProjectLayout>
      <div className="flex flex-col h-full" ref={timelineContainerRef}>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center">
            <ViewSwitcher projectId={project.id} className="border-b-0" />
            <UndoRedoButtons projectId={project.id} className="ml-2" />
          </div>
          <div className="flex items-center gap-4 pr-4">
            {/* Real-time presence indicator */}
            {currentUser && (
              <PresenceIndicator
                projectId={project.id}
                currentUserId={currentUser.id}
              />
            )}
            <TimelineToolbar
              zoomLevel={zoomLevel}
              onZoomChange={handleZoomLevelChange}
              onScrollToToday={handleScrollToToday}
            />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {timelineTasks.length === 0 ? (
            <TimelineEmpty />
          ) : (
            <TimelineGrid
              days={days}
              tasks={timelineTasks}
              startDate={startDate}
              cellWidth={cellWidth}
              onTaskClick={handleTaskClick}
              todayRef={todayRef}
              onZoom={handleZoom}
              onTaskDateChange={handleTaskDateChange}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        projectId={project.id}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />

      {/* Live cursors overlay */}
      {currentUser && (
        <LiveCursors
          projectId={project.id}
          currentUserId={currentUser.id}
          containerRef={timelineContainerRef}
        />
      )}
    </ProjectLayout>
  )
}

export default TimelineViewPage
