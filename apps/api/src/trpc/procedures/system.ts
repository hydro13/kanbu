/**
 * System Procedures
 *
 * Health check and system info endpoints
 */

import { z } from 'zod';
import { router, publicProcedure } from '../router';

export const systemRouter = router({
  /**
   * Health check endpoint
   * Returns OK if the server is running and database is connected
   */
  health: publicProcedure.query(async ({ ctx }) => {
    // Check database connection
    let dbStatus = 'disconnected';
    try {
      await ctx.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }),

  /**
   * System info endpoint
   * Returns version and environment info
   */
  info: publicProcedure.query(() => {
    return {
      name: 'Kanbu API',
      version: '0.1.0',
      environment: process.env.NODE_ENV ?? 'development',
      node: process.version,
    };
  }),

  /**
   * Echo endpoint for testing
   */
  echo: publicProcedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => {
      return {
        echo: input.message,
        timestamp: new Date().toISOString(),
      };
    }),
});
