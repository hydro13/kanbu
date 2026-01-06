import { createTRPCReact, httpBatchLink, type CreateTRPCReact } from '@trpc/react-query'
import { QueryClient } from '@tanstack/react-query'
// Type-only import - uses relative path in monorepo
// tRPC types are shared at build time, not runtime
import type { AppRouter } from '../../../../apps/api/src/trpc'

const TOKEN_KEY = 'kanbu_token';

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
 * Get API host - uses same hostname as frontend but on port 3001
 * This allows the app to work from any hostname (localhost, Tailscale, etc.)
 * Use this for direct API calls like image URLs
 */
export function getApiHost(): string {
  // If explicitly set, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, use same hostname but port 3001
  if (import.meta.env.DEV) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3001`;
  }
  // In production, use empty string (same origin or proxy)
  return '';
}

/**
 * Get API URL - uses same hostname as frontend but on port 3001
 * This allows the app to work from any hostname (localhost, Tailscale, etc.)
 */
function getApiUrl(): string {
  const host = getApiHost();
  if (host) {
    return `${host}/trpc`;
  }
  // In production, use relative path (assumes same origin or proxy)
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
