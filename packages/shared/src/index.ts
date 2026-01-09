/**
 * Kanbu Shared - Prisma schema and shared types
 *
 * @see SETUP-02 voor database schema
 */

export const KANBU_VERSION = '0.1.0';

// Note: Prisma client is imported directly in each app via @prisma/client
// The schema is defined in this package (prisma/schema.prisma)
// Run `pnpm db:generate` in packages/shared to regenerate the client

// GitHub Connector Types (Fase 1)
export * from './types/github'
