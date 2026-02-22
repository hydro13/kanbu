/**
 * User OAuth Procedures (Phase 19.8)
 *
 * tRPC procedures for users to manage their own OAuth connections.
 * Allows users to see and revoke their OAuth tokens from external services
 * like Claude.ai and ChatGPT.
 *
 * Note: Admin procedures for OAuth clients are in oauthClient.ts
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../router';

// =============================================================================
// User OAuth Router
// =============================================================================

export const userOAuthRouter = router({
  /**
   * List user's own OAuth tokens (connections to external services)
   * Shows which services the user has authorized and when
   */
  listMyTokens: protectedProcedure
    .input(
      z.object({
        includeRevoked: z.boolean().default(false),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { includeRevoked, limit, offset } = input;

      const where = {
        userId: ctx.user.id,
        ...(includeRevoked ? {} : { revokedAt: null }),
      };

      const [tokens, total] = await Promise.all([
        ctx.prisma.oAuthToken.findMany({
          where,
          select: {
            id: true,
            tokenType: true,
            tokenPrefix: true,
            scope: true,
            createdAt: true,
            expiresAt: true,
            lastUsedAt: true,
            revokedAt: true,
            client: {
              select: {
                id: true,
                clientId: true,
                clientName: true,
                clientUri: true,
                logoUri: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        ctx.prisma.oAuthToken.count({ where }),
      ]);

      return {
        tokens: tokens.map((token) => ({
          id: token.id,
          tokenType: token.tokenType,
          tokenPrefix: token.tokenPrefix,
          scope: token.scope,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
          lastUsedAt: token.lastUsedAt,
          revokedAt: token.revokedAt,
          isActive: !token.revokedAt && token.expiresAt > new Date(),
          isExpired: token.expiresAt <= new Date(),
          client: {
            id: token.client.id,
            clientId: token.client.clientId,
            name: token.client.clientName,
            uri: token.client.clientUri,
            logoUri: token.client.logoUri,
          },
        })),
        total,
        limit,
        offset,
        hasMore: offset + tokens.length < total,
      };
    }),

  /**
   * Get summary of user's OAuth connections
   * Quick overview of how many services are connected
   */
  getConnectionsSummary: protectedProcedure.query(async ({ ctx }) => {
    // Get all active tokens grouped by client
    const tokens = await ctx.prisma.oAuthToken.findMany({
      where: {
        userId: ctx.user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        tokenType: 'access_token', // Only count access tokens, not refresh tokens
      },
      select: {
        clientId: true,
        client: {
          select: {
            clientName: true,
            clientUri: true,
            logoUri: true,
          },
        },
      },
    });

    // Group by client
    const clientMap = new Map<
      number,
      { name: string; uri: string | null; logoUri: string | null; tokenCount: number }
    >();
    for (const token of tokens) {
      const existing = clientMap.get(token.clientId);
      if (existing) {
        existing.tokenCount++;
      } else {
        clientMap.set(token.clientId, {
          name: token.client.clientName,
          uri: token.client.clientUri,
          logoUri: token.client.logoUri,
          tokenCount: 1,
        });
      }
    }

    return {
      totalConnections: clientMap.size,
      connections: Array.from(clientMap.entries()).map(([clientId, data]) => ({
        clientId,
        ...data,
      })),
    };
  }),

  /**
   * Revoke a specific OAuth token
   * User can revoke their own tokens only
   */
  revokeToken: protectedProcedure
    .input(z.object({ tokenId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Find the token and verify ownership
      const token = await ctx.prisma.oAuthToken.findFirst({
        where: {
          id: input.tokenId,
          userId: ctx.user.id,
        },
        include: {
          client: {
            select: {
              clientName: true,
            },
          },
        },
      });

      if (!token) {
        return { success: false, error: 'Token not found' };
      }

      if (token.revokedAt) {
        return { success: false, error: 'Token already revoked' };
      }

      // Revoke the token
      await ctx.prisma.oAuthToken.update({
        where: { id: input.tokenId },
        data: { revokedAt: new Date() },
      });

      ctx.req.log.info(
        `[OAuth] User ${ctx.user.id} revoked token ${token.tokenPrefix}... for ${token.client.clientName}`
      );

      return { success: true };
    }),

  /**
   * Revoke all tokens for a specific client (service)
   * Disconnects the user from a specific service entirely
   */
  revokeAllForClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the client exists
      const client = await ctx.prisma.oAuthClient.findUnique({
        where: { id: input.clientId },
        select: { clientName: true },
      });

      if (!client) {
        return { success: false, error: 'Client not found', revokedCount: 0 };
      }

      // Revoke all non-revoked tokens for this user and client
      const result = await ctx.prisma.oAuthToken.updateMany({
        where: {
          userId: ctx.user.id,
          clientId: input.clientId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      ctx.req.log.info(
        `[OAuth] User ${ctx.user.id} revoked ${result.count} tokens for ${client.clientName}`
      );

      return { success: true, revokedCount: result.count };
    }),
});
