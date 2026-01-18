/*
 * useAclRealtimeSync Hook
 *
 * Synchronizes React Query cache with Socket.io ACL and Group events.
 * When an ACL entry is granted/denied/deleted or group membership changes,
 * the local cache is updated immediately without refetching.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient, type Query } from '@tanstack/react-query';
import { useSocketContext } from '@/contexts/SocketContext';
import {
  joinAdminRoom,
  leaveAdminRoom,
  type AclEventPayload,
  type AclDeletedEventPayload,
  type GroupEventPayload,
  type GroupMemberEventPayload,
} from '@/lib/socket';

// =============================================================================
// Types
// =============================================================================

// Helper type for tRPC query keys
type TrpcQueryKey = [[string, string], { input?: Record<string, unknown>; type?: string }?];

// Helper function to safely check query keys
function matchesQueryKey(
  query: Query,
  procedure: string,
  method: string,
  inputMatcher?: (input: Record<string, unknown> | undefined) => boolean
): boolean {
  const key = query.queryKey as TrpcQueryKey;
  if (!Array.isArray(key) || !Array.isArray(key[0])) return false;
  if (key[0][0] !== procedure || key[0][1] !== method) return false;
  if (inputMatcher) {
    const queryInput = key[1]?.input;
    return inputMatcher(queryInput);
  }
  return true;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for real-time synchronization of ACL data
 *
 * Joins the admin room and listens for ACL events (grant, deny, delete).
 * Invalidates relevant queries when events are received.
 *
 * @param currentUserId - Current user ID (to skip own events)
 *
 * @example
 * // In AclPage component
 * useAclRealtimeSync({ currentUserId: user.id });
 */
export function useAclRealtimeSync({ currentUserId }: { currentUserId: number }) {
  const { socket, isConnected } = useSocketContext();
  const queryClient = useQueryClient();

  // Skip events triggered by current user (they already have optimistic updates)
  const shouldProcess = useCallback(
    (triggeredBy: { id: number }) => {
      return triggeredBy.id !== currentUserId;
    },
    [currentUserId]
  );

  // Invalidate all ACL-related queries
  const invalidateAclQueries = useCallback(() => {
    // Invalidate ACL list queries
    void queryClient.invalidateQueries({
      predicate: (query) => matchesQueryKey(query, 'acl', 'list'),
    });

    // Invalidate permission check queries
    void queryClient.invalidateQueries({
      predicate: (query) => matchesQueryKey(query, 'acl', 'checkPermission'),
    });

    // Invalidate ACL stats
    void queryClient.invalidateQueries({
      predicate: (query) => matchesQueryKey(query, 'acl', 'getStats'),
    });
  }, [queryClient]);

  // Handle ACL granted
  const handleAclGranted = useCallback(
    (payload: AclEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      console.log('[ACL Realtime] ACL granted event received:', payload);
      invalidateAclQueries();
    },
    [shouldProcess, invalidateAclQueries]
  );

  // Handle ACL denied
  const handleAclDenied = useCallback(
    (payload: AclEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      console.log('[ACL Realtime] ACL denied event received:', payload);
      invalidateAclQueries();
    },
    [shouldProcess, invalidateAclQueries]
  );

  // Handle ACL deleted
  const handleAclDeleted = useCallback(
    (payload: AclDeletedEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      console.log('[ACL Realtime] ACL deleted event received:', payload);
      invalidateAclQueries();
    },
    [shouldProcess, invalidateAclQueries]
  );

  // Invalidate group member queries
  const invalidateGroupMemberQueries = useCallback(
    (groupId: number) => {
      // Invalidate group members query for this specific group
      void queryClient.invalidateQueries({
        predicate: (query) =>
          matchesQueryKey(query, 'group', 'getMembers', (input) => input?.groupId === groupId),
      });

      // Also invalidate the principals list (used in ACL dropdowns)
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'acl', 'getPrincipals'),
      });
    },
    [queryClient]
  );

  // Handle group member added
  const handleGroupMemberAdded = useCallback(
    (payload: GroupMemberEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      console.log('[ACL Realtime] Group member added event received:', payload);
      invalidateGroupMemberQueries(payload.groupId);
    },
    [shouldProcess, invalidateGroupMemberQueries]
  );

  // Handle group member removed
  const handleGroupMemberRemoved = useCallback(
    (payload: GroupMemberEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      console.log('[ACL Realtime] Group member removed event received:', payload);
      invalidateGroupMemberQueries(payload.groupId);
    },
    [shouldProcess, invalidateGroupMemberQueries]
  );

  // Invalidate group list queries (for tree updates)
  const invalidateGroupListQueries = useCallback(() => {
    // Invalidate the principals list (contains groups for ACL tree)
    void queryClient.invalidateQueries({
      predicate: (query) => matchesQueryKey(query, 'acl', 'getPrincipals'),
    });

    // Invalidate group list queries
    void queryClient.invalidateQueries({
      predicate: (query) => matchesQueryKey(query, 'group', 'list'),
    });
  }, [queryClient]);

  // Handle group created
  const handleGroupCreated = useCallback(
    (payload: GroupEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      console.log('[ACL Realtime] Group created event received:', payload);
      invalidateGroupListQueries();
    },
    [shouldProcess, invalidateGroupListQueries]
  );

  // Handle group updated
  const handleGroupUpdated = useCallback(
    (payload: GroupEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      console.log('[ACL Realtime] Group updated event received:', payload);
      invalidateGroupListQueries();
    },
    [shouldProcess, invalidateGroupListQueries]
  );

  // Handle group deleted
  const handleGroupDeleted = useCallback(
    (payload: GroupEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      console.log('[ACL Realtime] Group deleted event received:', payload);
      invalidateGroupListQueries();
    },
    [shouldProcess, invalidateGroupListQueries]
  );

  // Join admin room when connected
  useEffect(() => {
    if (!socket || !isConnected) return;

    void joinAdminRoom().then((success) => {
      if (success) {
        console.log('[ACL Realtime] Joined admin room for ACL updates');
      }
    });

    return () => {
      leaveAdminRoom();
    };
  }, [socket, isConnected]);

  // Set up event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // ACL events
    socket.on('acl:granted', handleAclGranted);
    socket.on('acl:denied', handleAclDenied);
    socket.on('acl:deleted', handleAclDeleted);

    // Group events
    socket.on('group:created', handleGroupCreated);
    socket.on('group:updated', handleGroupUpdated);
    socket.on('group:deleted', handleGroupDeleted);

    // Group member events
    socket.on('group:member:added', handleGroupMemberAdded);
    socket.on('group:member:removed', handleGroupMemberRemoved);

    return () => {
      socket.off('acl:granted', handleAclGranted);
      socket.off('acl:denied', handleAclDenied);
      socket.off('acl:deleted', handleAclDeleted);
      socket.off('group:created', handleGroupCreated);
      socket.off('group:updated', handleGroupUpdated);
      socket.off('group:deleted', handleGroupDeleted);
      socket.off('group:member:added', handleGroupMemberAdded);
      socket.off('group:member:removed', handleGroupMemberRemoved);
    };
  }, [
    socket,
    isConnected,
    handleAclGranted,
    handleAclDenied,
    handleAclDeleted,
    handleGroupCreated,
    handleGroupUpdated,
    handleGroupDeleted,
    handleGroupMemberAdded,
    handleGroupMemberRemoved,
  ]);

  return {
    isConnected,
  };
}
