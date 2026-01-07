/*
 * Calendar View Page
 * Version: 1.0.0
 *
 * Calendar view showing tasks organized by due date.
 * Supports month, week, and day views.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: de75c403-118c-4293-8d05-c2e3147fd7c8
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:20 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { ViewSwitcher } from '@/components/layout/ViewSwitcher'
import { LiveCursors } from '@/components/board/LiveCursors'
import { trpc } from '@/lib/trpc'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'
import { PriorityBadge } from '@/components/task/PriorityBadge'
import { TaskDetailModal } from '@/components/task/TaskDetailModal'
import { UndoRedoButtons } from '@/components/ui/UndoRedoButtons'

// =============================================================================
// Types
// =============================================================================

type ViewMode = 'month' | 'week' | 'day'

interface CalendarTask {
  id: number
  title: string
  priority: number
  dateDue: string
  isActive: boolean
  column?: { title: string } | null
}

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

function ChevronLeftIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

// =============================================================================
// Loading / Error States
// =============================================================================

function CalendarLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading calendar...</p>
      </div>
    </div>
  )
}

function CalendarError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load calendar</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          Try Again
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []

  // Add days from previous month to fill the week
  const startDayOfWeek = firstDay.getDay()
  const mondayOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 // Monday = 0
  for (let i = mondayOffset; i > 0; i--) {
    days.push(new Date(year, month, 1 - i))
  }

  // Add all days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // Add days from next month to complete the grid
  const remainingDays = 42 - days.length // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i))
  }

  return days
}

function getWeekDays(date: Date): Date[] {
  const days: Date[] = []
  const dayOfWeek = date.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  for (let i = 0; i < 7; i++) {
    const d = new Date(date)
    d.setDate(date.getDate() - mondayOffset + i)
    days.push(d)
  }

  return days
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// =============================================================================
// Calendar Toolbar (Navigation + View Mode)
// =============================================================================

interface CalendarToolbarProps {
  currentDate: Date
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

function CalendarToolbar({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrevious,
  onNext,
  onToday,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeftIcon />
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
          {formatMonthYear(currentDate)}
        </span>
        <button
          onClick={onNext}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <button
        onClick={onToday}
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        Today
      </button>

      {/* View Mode Toggle */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`px-3 py-1.5 text-sm ${
              viewMode === mode
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Task Chip
// =============================================================================

function TaskChip({ task, onClick }: { task: CalendarTask; onClick: () => void }) {
  const priorityColors = ['bg-gray-100 dark:bg-gray-700', 'bg-blue-100 dark:bg-blue-900/30', 'bg-yellow-100 dark:bg-yellow-900/30', 'bg-red-100 dark:bg-red-900/30']

  return (
    <button
      data-task-chip
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`w-full text-left px-2 py-1 rounded text-xs truncate ${priorityColors[task.priority]} ${
        !task.isActive ? 'opacity-50 line-through' : ''
      } hover:ring-2 hover:ring-blue-400`}
    >
      {task.title}
    </button>
  )
}

// =============================================================================
// Month View
// =============================================================================

interface MonthViewProps {
  days: Date[]
  currentDate: Date
  tasksByDate: Map<string, CalendarTask[]>
  onTaskClick: (taskId: number) => void
  onDayClick: (date: Date) => void
  onNavigate: (direction: 'prev' | 'next') => void
  onZoom: (direction: 'in' | 'out', targetDate?: Date) => void
}

function MonthView({ days, currentDate, tasksByDate, onTaskClick, onDayClick, onNavigate, onZoom }: MonthViewProps) {
  const today = new Date()
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Refs for drag-to-pan
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const hasDragged = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Get day under mouse cursor from grid position
  const getDayFromMousePosition = useCallback((e: React.MouseEvent): Date | undefined => {
    const grid = contentRef.current
    if (!grid) return undefined

    const rect = grid.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate column and row (7 columns, 6 rows)
    const cellWidth = rect.width / 7
    const cellHeight = rect.height / 6
    const col = Math.floor(x / cellWidth)
    const row = Math.floor(y / cellHeight)

    // Get day index
    const dayIndex = row * 7 + col
    if (dayIndex >= 0 && dayIndex < days.length) {
      return days[dayIndex]
    }
    return undefined
  }, [days])

  // Handle mouse wheel for zoom (no Ctrl needed)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Mouse wheel = zoom
    if (Math.abs(e.deltaY) > 30) {
      e.preventDefault()
      const targetDate = getDayFromMousePosition(e)
      onZoom(e.deltaY > 0 ? 'out' : 'in', targetDate)
    }
  }, [onZoom, getDayFromMousePosition])

  // Drag-to-pan handlers with visual feedback
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on background, not on tasks
    if ((e.target as HTMLElement).closest('[data-task-chip]')) return
    if (isAnimating) return

    isDragging.current = true
    dragStartX.current = e.clientX
    hasDragged.current = false
    setDragOffset(0)
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing'
    }
  }, [isAnimating])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return

    const deltaX = e.clientX - dragStartX.current
    setDragOffset(deltaX)

    if (Math.abs(deltaX) > 30) {
      hasDragged.current = true
    }
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return

    const deltaX = e.clientX - dragStartX.current
    isDragging.current = false

    if (containerRef.current) {
      containerRef.current.style.cursor = 'default'
    }

    // If dragged far enough, animate slide and navigate
    if (Math.abs(deltaX) > 80) {
      const direction = deltaX > 0 ? 'prev' : 'next'
      const targetOffset = deltaX > 0 ? window.innerWidth : -window.innerWidth

      // Animate to edge
      setIsAnimating(true)
      setDragOffset(targetOffset)

      // After animation, navigate and reset
      setTimeout(() => {
        onNavigate(direction)
        setDragOffset(0)
        setIsAnimating(false)
        hasDragged.current = false
      }, 200)
    } else {
      // Snap back
      setIsAnimating(true)
      setDragOffset(0)
      setTimeout(() => {
        setIsAnimating(false)
        hasDragged.current = false
      }, 200)
    }
  }, [onNavigate])

  const handleMouseLeave = useCallback(() => {
    if (!isDragging.current) return

    isDragging.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = 'default'
    }

    // Snap back on mouse leave
    setIsAnimating(true)
    setDragOffset(0)
    setTimeout(() => {
      setIsAnimating(false)
      hasDragged.current = false
    }, 200)
  }, [])

  const handleDayClickInternal = useCallback((day: Date) => {
    // Don't trigger day click if we were dragging
    if (hasDragged.current) return
    onDayClick(day)
  }, [onDayClick])

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full select-none overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {weekDays.map((day) => (
          <div key={day} className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid with visual drag offset */}
      <div
        ref={contentRef}
        className="flex-1 grid grid-cols-7 grid-rows-6"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isAnimating ? 'transform 200ms ease-out' : 'none',
        }}
      >
        {days.map((day, index) => {
          const dateKey = day.toISOString().split('T')[0] ?? ''
          const dayTasks = tasksByDate.get(dateKey) ?? []
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = isSameDay(day, today)

          return (
            <div
              key={index}
              className={`border-b border-r border-gray-200 dark:border-gray-700 p-1 min-h-[100px] ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''
              } cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30`}
              onClick={() => handleDayClickInternal(day)}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center' : isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map((task) => (
                  <TaskChip key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2">+{dayTasks.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Week View
// =============================================================================

interface WeekViewProps {
  days: Date[]
  tasksByDate: Map<string, CalendarTask[]>
  onTaskClick: (taskId: number) => void
  onNavigate: (direction: 'prev' | 'next') => void
  onZoom: (direction: 'in' | 'out', targetDate?: Date) => void
}

function WeekView({ days, tasksByDate, onTaskClick, onNavigate, onZoom }: WeekViewProps) {
  const today = new Date()

  // Refs for drag-to-pan
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const hasDragged = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Get day under mouse cursor from grid position
  const getDayFromMousePosition = useCallback((e: React.MouseEvent): Date | undefined => {
    const grid = contentRef.current
    if (!grid) return undefined

    const rect = grid.getBoundingClientRect()
    const x = e.clientX - rect.left

    // Calculate column (7 columns for week view)
    const cellWidth = rect.width / 7
    const col = Math.floor(x / cellWidth)

    if (col >= 0 && col < days.length) {
      return days[col]
    }
    return undefined
  }, [days])

  // Handle mouse wheel for zoom (no Ctrl needed)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Mouse wheel = zoom
    if (Math.abs(e.deltaY) > 30) {
      e.preventDefault()
      const targetDate = getDayFromMousePosition(e)
      onZoom(e.deltaY > 0 ? 'out' : 'in', targetDate)
    }
  }, [onZoom, getDayFromMousePosition])

  // Drag-to-pan handlers with visual feedback
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-task-card]')) return
    if (isAnimating) return

    isDragging.current = true
    dragStartX.current = e.clientX
    hasDragged.current = false
    setDragOffset(0)
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing'
    }
  }, [isAnimating])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return

    const deltaX = e.clientX - dragStartX.current
    setDragOffset(deltaX)

    if (Math.abs(deltaX) > 30) {
      hasDragged.current = true
    }
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return

    const deltaX = e.clientX - dragStartX.current
    isDragging.current = false

    if (containerRef.current) {
      containerRef.current.style.cursor = 'default'
    }

    // If dragged far enough, animate slide and navigate
    if (Math.abs(deltaX) > 80) {
      const direction = deltaX > 0 ? 'prev' : 'next'
      const targetOffset = deltaX > 0 ? window.innerWidth : -window.innerWidth

      setIsAnimating(true)
      setDragOffset(targetOffset)

      setTimeout(() => {
        onNavigate(direction)
        setDragOffset(0)
        setIsAnimating(false)
        hasDragged.current = false
      }, 200)
    } else {
      // Snap back
      setIsAnimating(true)
      setDragOffset(0)
      setTimeout(() => {
        setIsAnimating(false)
        hasDragged.current = false
      }, 200)
    }
  }, [onNavigate])

  const handleMouseLeave = useCallback(() => {
    if (!isDragging.current) return

    isDragging.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = 'default'
    }

    // Snap back on mouse leave
    setIsAnimating(true)
    setDragOffset(0)
    setTimeout(() => {
      setIsAnimating(false)
      hasDragged.current = false
    }, 200)
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full select-none overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={contentRef}
        className="grid grid-cols-7 flex-1"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isAnimating ? 'transform 200ms ease-out' : 'none',
        }}
      >
        {days.map((day, index) => {
          const dateKey = day.toISOString().split('T')[0] ?? ''
          const dayTasks = tasksByDate.get(dateKey) ?? []
          const isToday = isSameDay(day, today)

          return (
            <div key={index} className="border-r border-gray-200 dark:border-gray-700 flex flex-col">
              {/* Day header */}
              <div className={`p-2 text-center border-b border-gray-200 dark:border-gray-700 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {day.getDate()}
                </div>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 space-y-1 overflow-auto">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    data-task-card
                    onClick={() => onTaskClick(task.id)}
                    className={`p-2 rounded border-l-4 bg-white dark:bg-gray-800 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                      task.priority === 3 ? 'border-red-500' : task.priority === 2 ? 'border-yellow-500' : task.priority === 1 ? 'border-blue-500' : 'border-gray-300'
                    } ${!task.isActive ? 'opacity-50' : ''}`}
                  >
                    <div className={`text-sm font-medium text-gray-900 dark:text-white ${!task.isActive ? 'line-through' : ''}`}>
                      {task.title}
                    </div>
                    {task.column && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.column.title}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Day View
// =============================================================================

interface DayViewProps {
  date: Date
  tasks: CalendarTask[]
  onTaskClick: (taskId: number) => void
  onNavigate: (direction: 'prev' | 'next') => void
  onZoom: (direction: 'in' | 'out', targetDate?: Date) => void
}

function DayView({ date, tasks, onTaskClick, onNavigate, onZoom }: DayViewProps) {
  const today = new Date()
  const isToday = isSameDay(date, today)

  // Refs for drag-to-pan
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const hasDragged = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle mouse wheel for zoom (no Ctrl needed)
  // In day view, the target date is always the current date
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Mouse wheel = zoom
    if (Math.abs(e.deltaY) > 30) {
      e.preventDefault()
      onZoom(e.deltaY > 0 ? 'out' : 'in', date)
    }
  }, [onZoom, date])

  // Drag-to-pan handlers with visual feedback
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-task-card]')) return
    if (isAnimating) return

    isDragging.current = true
    dragStartX.current = e.clientX
    hasDragged.current = false
    setDragOffset(0)
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing'
    }
  }, [isAnimating])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return

    const deltaX = e.clientX - dragStartX.current
    setDragOffset(deltaX)

    if (Math.abs(deltaX) > 30) {
      hasDragged.current = true
    }
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return

    const deltaX = e.clientX - dragStartX.current
    isDragging.current = false

    if (containerRef.current) {
      containerRef.current.style.cursor = 'default'
    }

    // If dragged far enough, animate slide and navigate
    if (Math.abs(deltaX) > 80) {
      const direction = deltaX > 0 ? 'prev' : 'next'
      const targetOffset = deltaX > 0 ? window.innerWidth : -window.innerWidth

      setIsAnimating(true)
      setDragOffset(targetOffset)

      setTimeout(() => {
        onNavigate(direction)
        setDragOffset(0)
        setIsAnimating(false)
        hasDragged.current = false
      }, 200)
    } else {
      // Snap back
      setIsAnimating(true)
      setDragOffset(0)
      setTimeout(() => {
        setIsAnimating(false)
        hasDragged.current = false
      }, 200)
    }
  }, [onNavigate])

  const handleMouseLeave = useCallback(() => {
    if (!isDragging.current) return

    isDragging.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = 'default'
    }

    // Snap back on mouse leave
    setIsAnimating(true)
    setDragOffset(0)
    setTimeout(() => {
      setIsAnimating(false)
      hasDragged.current = false
    }, 200)
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full p-4 select-none overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={contentRef}
        className="flex flex-col h-full"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isAnimating ? 'transform 200ms ease-out' : 'none',
        }}
      >
        {/* Day header */}
        <div className={`text-center mb-4 p-4 rounded-lg ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {date.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className={`text-3xl font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
            {date.getDate()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Tasks */}
        <div className="flex-1 space-y-2 overflow-auto">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">No tasks due on this day</div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                data-task-card
                onClick={() => onTaskClick(task.id)}
                className={`p-4 rounded-lg border bg-white dark:bg-gray-800 cursor-pointer hover:shadow-md transition-shadow ${
                  !task.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <PriorityBadge priority={task.priority} />
                  <div className="flex-1">
                    <div className={`font-medium text-gray-900 dark:text-white ${!task.isActive ? 'line-through' : ''}`}>
                      {task.title}
                    </div>
                    {task.column && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">{task.column.title}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main Calendar View Page
// =============================================================================

export function CalendarViewPage() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>()
  const navigate = useNavigate()
  const currentUser = useAppSelector(selectUser)
  const calendarContainerRef = useRef<HTMLDivElement>(null)

  // State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )

  // Get project ID from fetched data
  const projectIdNum = projectQuery.data?.id ?? null

  // Real-time collaboration sync
  useRealtimeSync({
    projectId: projectIdNum ?? 0,
    currentUserId: currentUser?.id ?? 0,
  })

  // Queries
  const tasksQuery = trpc.task.list.useQuery({ projectId: projectIdNum!, limit: 500 }, { enabled: !!projectIdNum })

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>()
    const tasks = tasksQuery.data ?? []

    tasks.forEach((task) => {
      if (task.dateDue) {
        const dateKey = new Date(task.dateDue).toISOString().split('T')[0] ?? ''
        const existing = map.get(dateKey) ?? []
        existing.push({
          id: task.id,
          title: task.title,
          priority: task.priority,
          dateDue: task.dateDue,
          isActive: task.isActive,
          column: task.column,
        })
        map.set(dateKey, existing)
      }
    })

    // Sort tasks within each day by priority (highest first)
    map.forEach((tasks) => tasks.sort((a, b) => b.priority - a.priority))

    return map
  }, [tasksQuery.data])

  // Navigation handlers
  const handlePrevious = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      if (viewMode === 'month') next.setMonth(prev.getMonth() - 1)
      else if (viewMode === 'week') next.setDate(prev.getDate() - 7)
      else next.setDate(prev.getDate() - 1)
      return next
    })
  }

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      if (viewMode === 'month') next.setMonth(prev.getMonth() + 1)
      else if (viewMode === 'week') next.setDate(prev.getDate() + 7)
      else next.setDate(prev.getDate() + 1)
      return next
    })
  }

  const handleToday = () => setCurrentDate(new Date())

  const handleDayClick = (date: Date) => {
    setCurrentDate(date)
    setViewMode('day')
  }

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId)
  }

  // Navigation handler for views (used by mouse gestures)
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      handlePrevious()
    } else {
      handleNext()
    }
  }, [viewMode])

  // Zoom handler (switch between view modes)
  // When zooming in, navigate to the target date under the mouse cursor
  const handleZoom = useCallback((direction: 'in' | 'out', targetDate?: Date) => {
    const modes: ViewMode[] = ['month', 'week', 'day']
    const currentIndex = modes.indexOf(viewMode)

    if (direction === 'in' && currentIndex < modes.length - 1) {
      // Zoom in: month -> week -> day
      const nextMode = modes[currentIndex + 1]
      if (nextMode) {
        // When zooming in, focus on the date under the cursor
        if (targetDate) {
          setCurrentDate(targetDate)
        }
        setViewMode(nextMode)
      }
    } else if (direction === 'out' && currentIndex > 0) {
      // Zoom out: day -> week -> month
      const prevMode = modes[currentIndex - 1]
      if (prevMode) {
        // When zooming out, keep the current date context
        if (targetDate) {
          setCurrentDate(targetDate)
        }
        setViewMode(prevMode)
      }
    }
  }, [viewMode])

  // Get days for current view
  const days = useMemo(() => {
    if (viewMode === 'month') return getMonthDays(currentDate.getFullYear(), currentDate.getMonth())
    if (viewMode === 'week') return getWeekDays(currentDate)
    return [currentDate]
  }, [currentDate, viewMode])

  // Handle invalid project identifier
  if (!projectIdentifier) {
    return (
      <ProjectLayout>
        <CalendarError message="Invalid project identifier" onRetry={() => navigate('/workspaces')} />
      </ProjectLayout>
    )
  }

  // Loading state
  if (projectQuery.isLoading || tasksQuery.isLoading) {
    return (
      <ProjectLayout>
        <CalendarLoading />
      </ProjectLayout>
    )
  }

  // Error state
  if (projectQuery.error) {
    return (
      <ProjectLayout>
        <CalendarError message={projectQuery.error.message} onRetry={() => projectQuery.refetch()} />
      </ProjectLayout>
    )
  }

  if (!projectQuery.data) {
    return (
      <ProjectLayout>
        <CalendarError message="Project not found" onRetry={() => navigate('/workspaces')} />
      </ProjectLayout>
    )
  }

  const project = projectQuery.data
  const dateKey = currentDate.toISOString().split('T')[0] ?? ''
  const dayTasks = tasksByDate.get(dateKey) ?? []

  return (
    <ProjectLayout>
      <div className="flex flex-col h-full" ref={calendarContainerRef}>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center">
            <ViewSwitcher projectIdentifier={project.identifier ?? ''} className="border-b-0" />
            <UndoRedoButtons projectId={project.id} className="ml-2" />
          </div>
          <div className="flex items-center gap-4 pr-4">
            <CalendarToolbar
              currentDate={currentDate}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onToday={handleToday}
            />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {viewMode === 'month' && (
            <MonthView
              days={days}
              currentDate={currentDate}
              tasksByDate={tasksByDate}
              onTaskClick={handleTaskClick}
              onDayClick={handleDayClick}
              onNavigate={handleNavigate}
              onZoom={handleZoom}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              days={days}
              tasksByDate={tasksByDate}
              onTaskClick={handleTaskClick}
              onNavigate={handleNavigate}
              onZoom={handleZoom}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              date={currentDate}
              tasks={dayTasks}
              onTaskClick={handleTaskClick}
              onNavigate={handleNavigate}
              onZoom={handleZoom}
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
          containerRef={calendarContainerRef}
        />
      )}
    </ProjectLayout>
  )
}

export default CalendarViewPage
