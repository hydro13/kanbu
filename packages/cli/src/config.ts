/*
 * CLI Configuration
 * Version: 1.0.0
 *
 * Handles CLI configuration storage using conf package.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14 - Developer Experience
 * =============================================================================
 */

import Conf from 'conf';

export interface KanbuConfig {
  apiUrl?: string;
  token?: string;
  defaultProject?: string;
  userId?: number;
  userName?: string;
}

const store = new Conf<KanbuConfig>({
  projectName: 'kanbu-cli',
  defaults: {
    apiUrl: 'https://api.kanbu.app',
  },
});

export const config = {
  get<K extends keyof KanbuConfig>(key: K): KanbuConfig[K] {
    // Check environment variables first
    if (key === 'token' && process.env.KANBU_API_TOKEN) {
      return process.env.KANBU_API_TOKEN as KanbuConfig[K];
    }
    if (key === 'apiUrl' && process.env.KANBU_API_URL) {
      return process.env.KANBU_API_URL as KanbuConfig[K];
    }
    return store.get(key);
  },

  set<K extends keyof KanbuConfig>(key: K, value: KanbuConfig[K]): void {
    store.set(key, value);
  },

  delete(key: keyof KanbuConfig): void {
    store.delete(key);
  },

  clear(): void {
    store.clear();
  },

  getAll(): KanbuConfig {
    return {
      apiUrl: this.get('apiUrl'),
      token: this.get('token'),
      defaultProject: this.get('defaultProject'),
      userId: this.get('userId'),
      userName: this.get('userName'),
    };
  },

  isAuthenticated(): boolean {
    return !!this.get('token');
  },
};

export default config;
