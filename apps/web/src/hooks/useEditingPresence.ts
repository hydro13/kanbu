/*
 * useEditingPresence Hook
 * Version: 1.0.0
 *
 * Tracks which users are editing which fields on a task.
 * Used to show visual feedback when another user is editing.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: realtime-editing-presence
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2026-01-04T00:00 CET
 *
 * Modified by:
 * Session: realtime-editing-presence
 * Signed: 2026-01-04T00:00 CET
 * Change: Added automatic timeout for stale editing locks (5 minutes)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSocketContext } from '@/contexts/SocketContext'
import type { EditingPayload } from '@/lib/socket'

// =============================================================================
// Constants
// =============================================================================

/** Auto-release stale editing locks after 2 minutes without heartbeat */
const STALE_LOCK_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes

/** Interval for checking stale locks */
const STALE_CHECK_INTERVAL_MS = 30 * 1000 // 30 seconds

/** Heartbeat interval to keep lock alive */
const HEARTBEAT_INTERVAL_MS = 30 * 1000 // 30 seconds

// =============================================================================
// Types
// =============================================================================

export interface EditingUser {
  id: number
  username: string
  name: string | null
  field: string
  since: Date
}

export interface UseEditingPresenceOptions {
  taskId: number
  currentUserId: number
}

export interface UseEditingPresenceReturn {
  /** Map of field -> user who is editing it */
  editingUsers: Map<string, EditingUser>
  /** Check if a specific field is being edited by someone else */
  isFieldBeingEdited: (field: string) => boolean
  /** Get the user editing a specific field (if any) */
  getFieldEditor: (field: string) => EditingUser | undefined
  /** Start editing a field (broadcasts to other users) */
  startEditing: (field: string) => void
  /** Stop editing a field (broadcasts to other users) */
  stopEditing: (field: string) => void
  /** Stop all editing (call on unmount/close) */
  stopAllEditing: () => void
}

// =============================================================================
// Hook
// =============================================================================

export function useEditingPresence({
  taskId,
  currentUserId,
}: UseEditingPresenceOptions): UseEditingPresenceReturn {
  const { socket, isConnected } = useSocketContext()
  const [editingUsers, setEditingUsers] = useState<Map<string, EditingUser>>(new Map())

  // Track which fields we're currently editing (for cleanup)
  const myEditingFieldsRef = useRef<Set<string>>(new Set())

  // Track last heartbeat time for each editing user (for stale detection)
  const lastHeartbeatRef = useRef<Map<string, number>>(new Map())

  // Handle editing:start from other users
  const handleEditingStart = useCallback(
    (payload: EditingPayload) => {
      // Skip our own events
      if (payload.user.id === currentUserId) return
      // Only handle events for this task
      if (payload.taskId !== taskId) return

      // Update heartbeat timestamp
      const fieldKey = `${payload.user.id}:${payload.field}`
      lastHeartbeatRef.current.set(fieldKey, Date.now())

      setEditingUsers((prev) => {
        const next = new Map(prev)
        next.set(payload.field, {
          id: payload.user.id,
          username: payload.user.username,
          name: payload.user.name,
          field: payload.field,
          since: new Date(payload.timestamp),
        })
        return next
      })
    },
    [currentUserId, taskId]
  )

  // Handle editing:stop from other users
  const handleEditingStop = useCallback(
    (payload: EditingPayload) => {
      // Skip our own events
      if (payload.user.id === currentUserId) return
      // Only handle events for this task
      if (payload.taskId !== taskId) return

      // Clear heartbeat timestamp
      const fieldKey = `${payload.user.id}:${payload.field}`
      lastHeartbeatRef.current.delete(fieldKey)

      setEditingUsers((prev) => {
        const next = new Map(prev)
        // Only remove if the same user stopped editing
        const current = next.get(payload.field)
        if (current && current.id === payload.user.id) {
          next.delete(payload.field)
        }
        return next
      })
    },
    [currentUserId, taskId]
  )

  // Handle heartbeat from other users (keeps lock alive)
  const handleEditingHeartbeat = useCallback(
    (payload: EditingPayload) => {
      // Skip our own events
      if (payload.user.id === currentUserId) return
      // Only handle events for this task
      if (payload.taskId !== taskId) return

      // Update heartbeat timestamp
      const fieldKey = `${payload.user.id}:${payload.field}`
      lastHeartbeatRef.current.set(fieldKey, Date.now())
    },
    [currentUserId, taskId]
  )

  // Set up socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return

    socket.on('editing:start', handleEditingStart)
    socket.on('editing:stop', handleEditingStop)
    socket.on('editing:heartbeat', handleEditingHeartbeat)

    return () => {
      socket.off('editing:start', handleEditingStart)
      socket.off('editing:stop', handleEditingStop)
      socket.off('editing:heartbeat', handleEditingHeartbeat)
    }
  }, [socket, isConnected, handleEditingStart, handleEditingStop, handleEditingHeartbeat])

  // Clear editing users when task changes
  useEffect(() => {
    setEditingUsers(new Map())
    lastHeartbeatRef.current.clear()
  }, [taskId])

  // Stale lock cleanup - remove locks that haven't received heartbeat in STALE_LOCK_TIMEOUT_MS
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      let hasStale = false

      setEditingUsers((prev) => {
        const next = new Map(prev)

        for (const [field, user] of prev) {
          const fieldKey = `${user.id}:${field}`
          const lastHeartbeat = lastHeartbeatRef.current.get(fieldKey)

          // If no heartbeat recorded, use the 'since' time
          const lastActivity = lastHeartbeat ?? user.since.getTime()

          if (now - lastActivity > STALE_LOCK_TIMEOUT_MS) {
            console.log(
              `[EditingPresence] Releasing stale lock on field "${field}" from user ${user.username} (no heartbeat for ${Math.round((now - lastActivity) / 1000)}s)`
            )
            next.delete(field)
            lastHeartbeatRef.current.delete(fieldKey)
            hasStale = true
          }
        }

        return hasStale ? next : prev
      })
    }, STALE_CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  // Send heartbeat for our own editing fields
  useEffect(() => {
    if (!socket || !isConnected) return
    if (myEditingFieldsRef.current.size === 0) return

    const interval = setInterval(() => {
      for (const field of myEditingFieldsRef.current) {
        socket.emit('editing:heartbeat', { taskId, field })
      }
    }, HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [socket, isConnected, taskId])

  // Start editing a field
  const startEditing = useCallback(
    (field: string) => {
      if (!socket || !isConnected) return

      myEditingFieldsRef.current.add(field)
      socket.emit('editing:start', { taskId, field })
    },
    [socket, isConnected, taskId]
  )

  // Stop editing a field
  const stopEditing = useCallback(
    (field: string) => {
      if (!socket || !isConnected) return

      myEditingFieldsRef.current.delete(field)
      socket.emit('editing:stop', { taskId, field })
    },
    [socket, isConnected, taskId]
  )

  // Stop all editing (cleanup)
  const stopAllEditing = useCallback(() => {
    if (!socket || !isConnected) return

    for (const field of myEditingFieldsRef.current) {
      socket.emit('editing:stop', { taskId, field })
    }
    myEditingFieldsRef.current.clear()
  }, [socket, isConnected, taskId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Use the ref directly to avoid stale closure issues
      if (socket && socket.connected && myEditingFieldsRef.current.size > 0) {
        for (const field of myEditingFieldsRef.current) {
          socket.emit('editing:stop', { taskId, field })
        }
      }
    }
  }, [socket, taskId])

  // Check if a field is being edited
  const isFieldBeingEdited = useCallback(
    (field: string): boolean => {
      return editingUsers.has(field)
    },
    [editingUsers]
  )

  // Get the user editing a field
  const getFieldEditor = useCallback(
    (field: string): EditingUser | undefined => {
      return editingUsers.get(field)
    },
    [editingUsers]
  )

  return {
    editingUsers,
    isFieldBeingEdited,
    getFieldEditor,
    startEditing,
    stopEditing,
    stopAllEditing,
  }
}

export default useEditingPresence
