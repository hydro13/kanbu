/**
 * Redis Client Configuration
 *
 * Provides Redis client for Socket.io adapter and other real-time features.
 * Supports horizontal scaling with multiple API instances.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { Redis } from 'ioredis';

// =============================================================================
// Configuration
// =============================================================================

const REDIS_URL = process.env.REDIS_URL;

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return Boolean(REDIS_URL);
}

// =============================================================================
// Redis Client Factory
// =============================================================================

/**
 * Create a new Redis client instance
 * Each caller gets its own connection (required for pub/sub)
 * Returns null if Redis is not configured
 */
export function createRedisClient(): Redis | null {
  if (!REDIS_URL) {
    return null;
  }

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for Socket.io adapter
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  client.on('connect', () => {
    console.log('[Redis] Connected to:', REDIS_URL.replace(/\/\/.*@/, '//<credentials>@'));
  });

  client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  return client;
}

// =============================================================================
// Singleton for General Use
// =============================================================================

let defaultClient: Redis | null = null;

/**
 * Get the default Redis client (singleton)
 * Use this for general Redis operations (caching, etc.)
 * For Socket.io adapter, use createRedisClient() to get separate pub/sub clients
 * Returns null if Redis is not configured
 */
export function getRedisClient(): Redis | null {
  if (!REDIS_URL) {
    return null;
  }
  if (!defaultClient) {
    defaultClient = createRedisClient();
  }
  return defaultClient;
}

/**
 * Close all Redis connections gracefully
 */
export async function closeRedisConnections(): Promise<void> {
  if (defaultClient) {
    await defaultClient.quit();
    defaultClient = null;
  }
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Check if Redis is available
 * Returns 'not_configured' if REDIS_URL is not set
 */
export async function isRedisHealthy(): Promise<'healthy' | 'unhealthy' | 'not_configured'> {
  if (!REDIS_URL) {
    return 'not_configured';
  }
  try {
    const client = getRedisClient();
    if (!client) return 'not_configured';
    const pong = await client.ping();
    return pong === 'PONG' ? 'healthy' : 'unhealthy';
  } catch {
    return 'unhealthy';
  }
}
