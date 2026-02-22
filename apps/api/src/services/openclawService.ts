/**
 * OpenClaw Service
 *
 * Singleton wrapper around @kanbu/openclaw-bridge.
 * Returns null when OPENCLAW_GATEWAY_URL is not configured.
 *
 * Usage:
 *   const client = getOpenClawClient();
 *   if (!client) throw new Error('OpenClaw not configured');
 */

import { OpenClawHttpClient } from '@kanbu/openclaw-bridge';

let instance: OpenClawHttpClient | null = null;

export function getOpenClawClient(): OpenClawHttpClient | null {
  const url = process.env.OPENCLAW_GATEWAY_URL;
  if (!url) return null;

  if (!instance) {
    instance = new OpenClawHttpClient({
      gatewayUrl: url,
      token: process.env.OPENCLAW_GATEWAY_TOKEN ?? '',
    });
  }
  return instance;
}

export function isOpenClawEnabled(): boolean {
  return !!process.env.OPENCLAW_GATEWAY_URL;
}

/** Reset singleton (for testing) */
export function resetOpenClawClient(): void {
  instance = null;
}
