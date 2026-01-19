/**
 * OAuth Client Admin Procedures (Phase 19.8)
 *
 * tRPC procedures for managing OAuth clients.
 * Requires admin access for all procedures.
 *
 * Used for:
 * - Listing registered OAuth clients
 * - Creating static clients (e.g., for ChatGPT)
 * - Managing client credentials
 * - Revoking client access
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { randomBytes, createHash } from 'crypto';
import { router, adminProcedure } from '../router';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a secure client ID
 */
function generateClientId(): string {
  return `kanbu_${randomBytes(16).toString('hex')}`;
}

/**
 * Generate a secure client secret
 */
function generateClientSecret(): string {
  return `kcs_${randomBytes(32).toString('hex')}`;
}

/**
 * Hash a secret using SHA-256
 */
function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

// =============================================================================
// Input Schemas
// =============================================================================

const listClientsSchema = z.object({
  includeInactive: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const createClientSchema = z.object({
  clientName: z.string().min(1).max(255),
  redirectUris: z.array(z.string().url()).min(1),
  grantTypes: z
    .array(z.enum(['authorization_code', 'refresh_token']))
    .default(['authorization_code', 'refresh_token']),
  responseTypes: z.array(z.enum(['code'])).default(['code']),
  tokenEndpointAuthMethod: z
    .enum(['none', 'client_secret_basic', 'client_secret_post'])
    .default('client_secret_basic'),
  scope: z.string().default('read write'),
  clientUri: z.string().url().nullable().optional(),
  logoUri: z.string().url().nullable().optional(),
  contacts: z.array(z.string().email()).optional(),
});

const updateClientSchema = z.object({
  id: z.number(),
  clientName: z.string().min(1).max(255).optional(),
  redirectUris: z.array(z.string().url()).min(1).optional(),
  scope: z.string().optional(),
  clientUri: z.string().url().nullable().optional(),
  logoUri: z.string().url().nullable().optional(),
  contacts: z.array(z.string().email()).optional(),
  isActive: z.boolean().optional(),
});

const regenerateSecretSchema = z.object({
  id: z.number(),
});

// =============================================================================
// OAuth Client Router
// =============================================================================

export const oauthClientRouter = router({
  /**
   * List all OAuth clients
   */
  list: adminProcedure.input(listClientsSchema).query(async ({ ctx, input }) => {
    const { includeInactive, limit, offset } = input;

    const where = includeInactive ? {} : { isActive: true };

    const [clients, total] = await Promise.all([
      ctx.prisma.oAuthClient.findMany({
        where,
        select: {
          id: true,
          clientId: true,
          clientName: true,
          clientUri: true,
          logoUri: true,
          redirectUris: true,
          grantTypes: true,
          responseTypes: true,
          tokenEndpointAuthMethod: true,
          scope: true,
          contacts: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              tokens: {
                where: {
                  revokedAt: null,
                  expiresAt: { gt: new Date() },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      ctx.prisma.oAuthClient.count({ where }),
    ]);

    return {
      clients: clients.map((client) => ({
        ...client,
        activeTokenCount: client._count.tokens,
        hasSecret: client.tokenEndpointAuthMethod !== 'none',
      })),
      total,
      limit,
      offset,
      hasMore: offset + clients.length < total,
    };
  }),

  /**
   * Get a single OAuth client by ID
   */
  get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const client = await ctx.prisma.oAuthClient.findUnique({
      where: { id: input.id },
      include: {
        _count: {
          select: {
            tokens: true,
            authorizationCodes: true,
          },
        },
      },
    });

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'OAuth client not found',
      });
    }

    // Get recent token activity
    const recentTokens = await ctx.prisma.oAuthToken.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tokenType: true,
        tokenPrefix: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    return {
      ...client,
      // Never expose the secret hash
      clientSecretHash: undefined,
      totalTokens: client._count.tokens,
      totalAuthCodes: client._count.authorizationCodes,
      recentTokens,
      hasSecret: client.tokenEndpointAuthMethod !== 'none',
    };
  }),

  /**
   * Create a new OAuth client (static registration)
   *
   * Returns the client_secret only once - it cannot be retrieved later!
   */
  create: adminProcedure.input(createClientSchema).mutation(async ({ ctx, input }) => {
    const clientId = generateClientId();
    let clientSecret: string | null = null;
    let clientSecretHash: string | null = null;

    // Generate secret for confidential clients
    if (input.tokenEndpointAuthMethod !== 'none') {
      clientSecret = generateClientSecret();
      clientSecretHash = hashSecret(clientSecret);
    }

    const client = await ctx.prisma.oAuthClient.create({
      data: {
        clientId,
        clientSecretHash,
        clientName: input.clientName,
        redirectUris: input.redirectUris,
        grantTypes: input.grantTypes,
        responseTypes: input.responseTypes,
        tokenEndpointAuthMethod: input.tokenEndpointAuthMethod,
        scope: input.scope,
        clientUri: input.clientUri ?? null,
        logoUri: input.logoUri ?? null,
        contacts: input.contacts ?? [],
      },
      select: {
        id: true,
        clientId: true,
        clientName: true,
        redirectUris: true,
        grantTypes: true,
        responseTypes: true,
        tokenEndpointAuthMethod: true,
        scope: true,
        clientUri: true,
        logoUri: true,
        contacts: true,
        createdAt: true,
      },
    });

    ctx.req.log.info(
      `[OAuth] Client created: ${client.clientName} (${client.clientId}) by user ${ctx.user!.id}`
    );

    return {
      ...client,
      // Return secret only on creation - cannot be retrieved later!
      clientSecret,
      secretWarning: clientSecret
        ? 'Save this client_secret securely. It will not be shown again!'
        : null,
    };
  }),

  /**
   * Update an OAuth client
   */
  update: adminProcedure.input(updateClientSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.prisma.oAuthClient.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'OAuth client not found',
      });
    }

    const client = await ctx.prisma.oAuthClient.update({
      where: { id },
      data,
      select: {
        id: true,
        clientId: true,
        clientName: true,
        redirectUris: true,
        scope: true,
        clientUri: true,
        logoUri: true,
        contacts: true,
        isActive: true,
        updatedAt: true,
      },
    });

    ctx.req.log.info(`[OAuth] Client updated: ${client.clientName} by user ${ctx.user!.id}`);

    return client;
  }),

  /**
   * Regenerate client secret
   *
   * Returns the new secret only once - save it securely!
   * This will invalidate the old secret immediately.
   */
  regenerateSecret: adminProcedure
    .input(regenerateSecretSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.oAuthClient.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'OAuth client not found',
        });
      }

      if (existing.tokenEndpointAuthMethod === 'none') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot regenerate secret for public clients (tokenEndpointAuthMethod=none)',
        });
      }

      // Generate new secret
      const clientSecret = generateClientSecret();
      const clientSecretHash = hashSecret(clientSecret);

      await ctx.prisma.oAuthClient.update({
        where: { id: input.id },
        data: { clientSecretHash },
      });

      ctx.req.log.info(
        `[OAuth] Client secret regenerated: ${existing.clientName} by user ${ctx.user!.id}`
      );

      return {
        clientId: existing.clientId,
        clientSecret,
        secretWarning: 'Save this client_secret securely. It will not be shown again!',
      };
    }),

  /**
   * Deactivate an OAuth client (soft delete)
   *
   * This revokes all active tokens for the client.
   */
  deactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.oAuthClient.findUnique({
        where: { id: input.id },
      });

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'OAuth client not found',
        });
      }

      // Deactivate client and revoke all tokens
      await ctx.prisma.$transaction([
        ctx.prisma.oAuthClient.update({
          where: { id: input.id },
          data: { isActive: false },
        }),
        ctx.prisma.oAuthToken.updateMany({
          where: {
            clientId: input.id,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        }),
      ]);

      ctx.req.log.info(`[OAuth] Client deactivated: ${client.clientName} by user ${ctx.user!.id}`);

      return { success: true, message: 'Client deactivated and all tokens revoked' };
    }),

  /**
   * Reactivate an OAuth client
   */
  reactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.oAuthClient.findUnique({
        where: { id: input.id },
      });

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'OAuth client not found',
        });
      }

      await ctx.prisma.oAuthClient.update({
        where: { id: input.id },
        data: { isActive: true },
      });

      ctx.req.log.info(`[OAuth] Client reactivated: ${client.clientName} by user ${ctx.user!.id}`);

      return { success: true, message: 'Client reactivated' };
    }),

  /**
   * Revoke all tokens for a client
   */
  revokeAllTokens: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.oAuthClient.findUnique({
        where: { id: input.id },
      });

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'OAuth client not found',
        });
      }

      const result = await ctx.prisma.oAuthToken.updateMany({
        where: {
          clientId: input.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      ctx.req.log.info(
        `[OAuth] Revoked ${result.count} tokens for client ${client.clientName} by user ${ctx.user!.id}`
      );

      return { success: true, revokedCount: result.count };
    }),

  /**
   * Delete an OAuth client permanently
   *
   * WARNING: This permanently removes the client and all associated data.
   * Use deactivate for soft delete.
   */
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const client = await ctx.prisma.oAuthClient.findUnique({
      where: { id: input.id },
    });

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'OAuth client not found',
      });
    }

    // Delete all related data in order
    await ctx.prisma.$transaction([
      // Delete tokens
      ctx.prisma.oAuthToken.deleteMany({
        where: { clientId: input.id },
      }),
      // Delete authorization codes
      ctx.prisma.oAuthAuthorizationCode.deleteMany({
        where: { clientId: input.id },
      }),
      // Delete client
      ctx.prisma.oAuthClient.delete({
        where: { id: input.id },
      }),
    ]);

    ctx.req.log.info(
      `[OAuth] Client permanently deleted: ${client.clientName} by user ${ctx.user!.id}`
    );

    return { success: true, message: 'Client permanently deleted' };
  }),
});
