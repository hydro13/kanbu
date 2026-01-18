/*
 * Rate Limit Service
 * Version: 1.0.0
 *
 * Centralized in-memory rate limiting service.
 * Supports different windows and limits per key.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Date: 2026-01-16
 * Fase: Hardening - Rate Limiting
 * ═══════════════════════════════════════════════════════════════════
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimitService {
  private store = new Map<string, RateLimitEntry>();

  /**
   * Check if a request is within the rate limit.
   * Increments the counter if within limit.
   *
   * @param key - Unique identifier (e.g., "user:123", "ip:1.2.3.4")
   * @param limit - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if allowed, false if limit exceeded
   */
  check(key: string | number, limit: number, windowMs: number = 60000): boolean {
    const storeKey = String(key);
    const now = Date.now();

    // Clean up expired entry if checking same key (lazy cleanup)
    const entry = this.store.get(storeKey);

    if (!entry || entry.resetAt < now) {
      // New window
      this.store.set(storeKey, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get current rate limit status headers.
   *
   * @param key - Unique identifier
   * @param limit - Maximum requests allowed
   * @param windowMs - Time window in milliseconds (default 1 min)
   */
  getHeaders(key: string | number, limit: number, windowMs: number = 60000) {
    const storeKey = String(key);
    const entry = this.store.get(storeKey);
    // If no entry (or expired), we assume full limit remaining
    // but usually getHeaders is called AFTER check, so entry exists.

    const now = Date.now();
    const isExpired = !entry || entry.resetAt < now;

    const remaining = isExpired ? limit : Math.max(0, limit - entry.count);
    const reset = isExpired ? Math.ceil(windowMs / 1000) : Math.ceil((entry.resetAt - now) / 1000);

    return {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    };
  }

  /**
   * Clear rate limit for a key (e.g. for testing)
   */
  reset(key: string | number) {
    this.store.delete(String(key));
  }
}

export const rateLimitService = new RateLimitService();
