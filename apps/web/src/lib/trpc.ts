import { createTRPCReact, httpBatchLink, type CreateTRPCReact } from '@trpc/react-query'
import { QueryClient } from '@tanstack/react-query'
// Type-only import - uses relative path in monorepo
// tRPC types are shared at build time, not runtime
import type { AppRouter } from '../../../../apps/api/src/trpc'

const TOKEN_KEY = 'kanbu_token';

/**
 * Get full URL for media/uploads (avatars, logos, attachments)
 * Prefixes relative paths with API host in development
 */
export function getMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  // If already absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const apiHost = getApiHost();
  // Avoid double-prefixing /api when VITE_API_URL is set to /api
  // and the path already starts with /api (e.g., /api/avatar/2)
  if (apiHost === '/api' && path.startsWith('/api')) {
    return path; // Path already has the /api prefix
  }
  // Prefix relative paths with API host
  return `${apiHost}${path}`;
}

/**
 * tRPC React client
 * Explicit type annotation to avoid fastify type inference issues
 */
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>()

/**
 * React Query client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

/**
 * Get API host - connects directly to API server in development
 * Both frontend and API use HTTPS via shared certificates
 */
export function getApiHost(): string {
  // If explicitly set, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, connect directly to the API server on port 3001
  // Bypasses Vite proxy which has issues with HTTPS WebSocket upgrade
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}:3001`;
  }
  // In production, use empty string (same origin or proxy)
  return '';
}

/**
 * Get API URL - connects directly to API server in development
 * Uses HTTPS when frontend is on HTTPS (shared certificates)
 */
function getApiUrl(): string {
  if (import.meta.env.DEV) {
    // Connect directly to API server, bypassing Vite proxy
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}:3001/trpc`;
  }
  // Production: relative URL for reverse proxy
  return '/trpc';
}

/**
 * tRPC client
 * Explicit type annotation to avoid cross-package type issues
 * Includes Authorization header with JWT token
 */
export const trpcClient: ReturnType<typeof trpc.createClient> = trpc.createClient({
  links: [
    httpBatchLink({
      url: getApiUrl(),
      headers() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          return {
            Authorization: `Bearer ${token}`,
          };
        }
        return {};
      },
    }),
  ],
})
