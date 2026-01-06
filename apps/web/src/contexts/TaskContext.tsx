/*
 * TaskContext
 * Version: 1.0.0
 *
 * Provides task context for child components (e.g., for WhatsApp social links).
 * When a user clicks on a WhatsApp icon in a UserPopover, the message will
 * include the current task's information.
 */

import { createContext, useContext, type ReactNode } from 'react'

// =============================================================================
// Types
// =============================================================================

export interface TaskContextValue {
  taskId?: number
  taskTitle?: string
  taskReference?: string // e.g., "TEST-1"
  projectId?: number
}

// =============================================================================
// Context
// =============================================================================

const TaskContext = createContext<TaskContextValue | null>(null)

// =============================================================================
// Provider
// =============================================================================

interface TaskContextProviderProps {
  children: ReactNode
  taskId?: number
  taskTitle?: string
  taskReference?: string
  projectId?: number
}

export function TaskContextProvider({
  children,
  taskId,
  taskTitle,
  taskReference,
  projectId,
}: TaskContextProviderProps) {
  const value: TaskContextValue = {
    taskId,
    taskTitle,
    taskReference,
    projectId,
  }

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
}

// =============================================================================
// Hook
// =============================================================================

export function useTaskContext(): TaskContextValue | null {
  return useContext(TaskContext)
}

// =============================================================================
// Utility: Generate WhatsApp URL with task context
// =============================================================================

export function generateWhatsAppUrl(
  phoneNumber: string,
  taskContext: TaskContextValue | null
): string {
  // Clean phone number (remove all non-digits)
  const cleanPhone = phoneNumber.replace(/\D/g, '')

  if (!taskContext?.taskTitle || !taskContext?.taskReference) {
    // No task context, just open WhatsApp
    return `https://wa.me/${cleanPhone}`
  }

  const taskUrl = `${window.location.origin}/project/${taskContext.projectId}/task/${taskContext.taskReference}`
  const message = encodeURIComponent(
    `Hi! I'd like to discuss this task:\n${taskContext.taskTitle}\n${taskUrl}`
  )

  return `https://wa.me/${cleanPhone}?text=${message}`
}
