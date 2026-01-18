/**
 * Socket Context
 *
 * Provides Socket.io connection state and methods to the React component tree.
 * Automatically connects when user is authenticated and disconnects on logout.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, connectSocket, disconnectSocket, isSocketConnected } from '@/lib/socket';

// =============================================================================
// Types
// =============================================================================

export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

// =============================================================================
// Context
// =============================================================================

const SocketContext = createContext<SocketContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Connect handler
  const connect = useCallback(() => {
    const newSocket = connectSocket();
    setSocket(newSocket);
  }, []);

  // Disconnect handler
  const disconnect = useCallback(() => {
    disconnectSocket();
    setSocket(null);
    setIsConnected(false);
  }, []);

  // Initialize socket and listen for connection changes
  useEffect(() => {
    const socketInstance = getSocket();

    if (!socketInstance) {
      return;
    }

    setSocket(socketInstance);
    setIsConnected(socketInstance.connected);

    // Connection event handlers
    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    // Auto-connect if we have a socket
    if (!socketInstance.connected) {
      socketInstance.connect();
    }

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
    };
  }, []);

  // Sync connection status periodically (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(isSocketConnected());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const value: SocketContextValue = {
    socket,
    isConnected,
    connect,
    disconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Use Socket.io connection
 * Must be used within SocketProvider
 */
export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
}
