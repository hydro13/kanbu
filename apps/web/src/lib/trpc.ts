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
 * Get API host - uses Vite proxy in development, direct API URL in production
 * In dev mode, we use relative URLs so Vite's proxy handles the request
 * This avoids HTTPS/HTTP mismatch issues when using HTTPS dev server
 */
export function getApiHost(): string {
  // If explicitly set, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, use empty string (relative URL) to use Vite proxy
  // This ensures HTTPS frontend -> Vite proxy -> HTTP API works correctly
  if (import.meta.env.DEV) {
    return '';
  }
  // In production, use empty string (same origin or proxy)
  return '';
}

/**
 * Get API URL - uses Vite proxy in development
 * Relative path lets Vite handle proxying to the API server
 */
function getApiUrl(): string {
  // Always use relative URL - Vite proxy or production reverse proxy handles it
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
