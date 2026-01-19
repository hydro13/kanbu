/**
 * OAuth 2.1 Token Endpoint (Phase 19.5 + 19.8)
 *
 * Implements RFC 6749 (Token Exchange) with:
 * - RFC 7636 (PKCE) verification for public clients (Claude.ai)
 * - client_secret_basic/post authentication for confidential clients (ChatGPT)
 * - RFC 7009 (Token Revocation)
 * - RFC 7662 (Token Introspection)
 *
 * Token prefixes:
 * - kat_ : Kanbu Access Token (1 hour expiry)
 * - krt_ : Kanbu Refresh Token (30 days expiry)
 *
 * Authentication methods:
 * - none: Public client with PKCE (Claude.ai)
 * - client_secret_basic: HTTP Basic Auth header (ChatGPT)
 * - client_secret_post: client_secret in request body
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// Token expiry times (configurable via environment)
// OAUTH_ACCESS_TOKEN_EXPIRY: seconds (default: 3600 = 1 hour)
// OAUTH_REFRESH_TOKEN_EXPIRY: seconds (default: 2592000 = 30 days)
const ACCESS_TOKEN_EXPIRY_MS = parseInt(process.env.OAUTH_ACCESS_TOKEN_EXPIRY ?? '3600', 10) * 1000;
const REFRESH_TOKEN_EXPIRY_MS =
  parseInt(process.env.OAUTH_REFRESH_TOKEN_EXPIRY ?? '2592000', 10) * 1000;

/**
 * Generate a secure access token with kat_ prefix
 */
function generateAccessToken(): string {
  return `kat_${randomBytes(32).toString('hex')}`;
}

/**
 * Generate a secure refresh token with krt_ prefix
 */
function generateRefreshToken(): string {
  return `krt_${randomBytes(32).toString('hex')}`;
}

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Get token prefix (first 12 characters including prefix)
 */
function getTokenPrefix(token: string): string {
  return token.substring(0, 12);
}

/**
 * Verify PKCE code_verifier against stored code_challenge
 * S256: BASE64URL(SHA256(code_verifier)) == code_challenge
 */
function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
  const hash = createHash('sha256').update(codeVerifier).digest();
  // Base64URL encode (replace + with -, / with _, remove =)
  const computed = hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return computed === codeChallenge;
}

/**
 * Parse URL-encoded form data
 */
function parseFormData(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!body) return result;

  const pairs = body.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      result[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return result;
}

/**
 * Parse client credentials from HTTP Basic Authorization header
 * Format: "Basic base64(client_id:client_secret)"
 */
function parseBasicAuth(
  authHeader: string | undefined
): { clientId: string; clientSecret: string } | null {
  if (!authHeader?.startsWith('Basic ')) {
    return null;
  }

  try {
    const base64 = authHeader.substring(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');

    if (colonIndex === -1) {
      return null;
    }

    return {
      clientId: decodeURIComponent(decoded.substring(0, colonIndex)),
      clientSecret: decodeURIComponent(decoded.substring(colonIndex + 1)),
    };
  } catch {
    return null;
  }
}

/**
 * Verify client_secret against stored hash using timing-safe comparison
 */
function verifyClientSecret(providedSecret: string, storedHash: string): boolean {
  const providedHash = hashToken(providedSecret);
  try {
    return timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

/**
 * Authenticate client based on its tokenEndpointAuthMethod
 * Returns client_id if authentication succeeds, null otherwise
 */
async function authenticateClient(
  request: FastifyRequest,
  params: Record<string, string>
): Promise<{ clientId: string; authMethod: string } | { error: string; errorDescription: string }> {
  // Try client_secret_basic first (Authorization header)
  const basicAuth = parseBasicAuth(request.headers.authorization);
  if (basicAuth) {
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId: basicAuth.clientId },
      select: {
        clientId: true,
        clientSecretHash: true,
        tokenEndpointAuthMethod: true,
        isActive: true,
      },
    });

    if (!client || !client.isActive) {
      return { error: 'invalid_client', errorDescription: 'Client not found or inactive' };
    }

    if (client.tokenEndpointAuthMethod !== 'client_secret_basic') {
      return {
        error: 'invalid_client',
        errorDescription: 'Client does not support client_secret_basic authentication',
      };
    }

    if (!client.clientSecretHash) {
      return { error: 'invalid_client', errorDescription: 'Client has no secret configured' };
    }

    if (!verifyClientSecret(basicAuth.clientSecret, client.clientSecretHash)) {
      return { error: 'invalid_client', errorDescription: 'Invalid client credentials' };
    }

    return { clientId: client.clientId, authMethod: 'client_secret_basic' };
  }

  // Try client_secret_post (credentials in request body)
  if (params.client_id && params.client_secret) {
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId: params.client_id },
      select: {
        clientId: true,
        clientSecretHash: true,
        tokenEndpointAuthMethod: true,
        isActive: true,
      },
    });

    if (!client || !client.isActive) {
      return { error: 'invalid_client', errorDescription: 'Client not found or inactive' };
    }

    if (client.tokenEndpointAuthMethod !== 'client_secret_post') {
      return {
        error: 'invalid_client',
        errorDescription: 'Client does not support client_secret_post authentication',
      };
    }

    if (!client.clientSecretHash) {
      return { error: 'invalid_client', errorDescription: 'Client has no secret configured' };
    }

    if (!verifyClientSecret(params.client_secret, client.clientSecretHash)) {
      return { error: 'invalid_client', errorDescription: 'Invalid client credentials' };
    }

    return { clientId: client.clientId, authMethod: 'client_secret_post' };
  }

  // Public client (no authentication, relies on PKCE)
  if (params.client_id) {
    return { clientId: params.client_id, authMethod: 'none' };
  }

  return { error: 'invalid_request', errorDescription: 'client_id is required' };
}

// ============================================
// Response Types
// ============================================

interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface IntrospectionResponse {
  active: boolean;
  client_id?: string;
  username?: string;
  scope?: string;
  exp?: number;
  iat?: number;
  token_type?: string;
}

interface ErrorResponse {
  error: string;
  error_description?: string;
}

// ============================================
// Route Handlers
// ============================================

/**
 * Register OAuth token endpoints
 */
export async function registerOAuthTokenRoutes(server: FastifyInstance): Promise<void> {
  // Add content type parser for application/x-www-form-urlencoded (OAuth 2.0 requirement)
  server.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req, body, done) => {
      done(null, body);
    }
  );

  /**
   * POST /oauth/token - Token exchange endpoint
   *
   * Supports:
   * - grant_type=authorization_code (with PKCE)
   * - grant_type=refresh_token (with rotation)
   */
  server.post<{
    Body: string;
    Reply: TokenResponse | ErrorResponse;
  }>(
    '/oauth/token',
    {
      config: {
        // Accept application/x-www-form-urlencoded
        rawBody: true,
      },
    },
    async (request, reply) => {
      // Parse form data
      const contentType = request.headers['content-type'] || '';
      let params: Record<string, string>;

      if (contentType.includes('application/x-www-form-urlencoded')) {
        params = parseFormData(request.body as string);
      } else if (contentType.includes('application/json')) {
        params = request.body as unknown as Record<string, string>;
      } else {
        return reply.status(400).send({
          error: 'invalid_request',
          error_description:
            'Content-Type must be application/x-www-form-urlencoded or application/json',
        });
      }

      const grantType = params.grant_type;

      // ========================================
      // Authorization Code Grant
      // ========================================
      if (grantType === 'authorization_code') {
        const { code, redirect_uri, code_verifier } = params;

        // Validate required parameters
        if (!code) {
          return reply.status(400).send({
            error: 'invalid_request',
            error_description: 'code is required',
          });
        }

        // Authenticate client (supports none, client_secret_basic, client_secret_post)
        const authResult = await authenticateClient(request, params);
        if ('error' in authResult) {
          return reply.status(401).send({
            error: authResult.error,
            error_description: authResult.errorDescription,
          });
        }

        const { clientId: authenticatedClientId, authMethod } = authResult;

        // Find authorization code
        const authCode = await prisma.oAuthAuthorizationCode.findUnique({
          where: { code },
          include: {
            client: true,
            user: {
              select: { id: true, username: true, isActive: true },
            },
          },
        });

        if (!authCode) {
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'Authorization code not found',
          });
        }

        // Check if code is expired
        if (authCode.expiresAt < new Date()) {
          // Clean up expired code
          await prisma.oAuthAuthorizationCode.delete({ where: { id: authCode.id } });
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'Authorization code has expired',
          });
        }

        // Check if code has already been used
        if (authCode.consumedAt) {
          // Possible replay attack - revoke all tokens for this authorization
          await prisma.oAuthToken.updateMany({
            where: { clientId: authCode.clientId, userId: authCode.userId },
            data: { revokedAt: new Date() },
          });
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'Authorization code has already been used',
          });
        }

        // Verify client_id matches the authorization code
        if (authCode.client.clientId !== authenticatedClientId) {
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'client_id does not match',
          });
        }

        // Verify redirect_uri matches (if provided)
        if (redirect_uri && authCode.redirectUri !== redirect_uri) {
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'redirect_uri does not match',
          });
        }

        // PKCE verification:
        // - Required for public clients (authMethod = 'none')
        // - Optional for confidential clients (client_secret_basic/post)
        if (authMethod === 'none') {
          // Public client - PKCE is required
          if (!code_verifier) {
            return reply.status(400).send({
              error: 'invalid_request',
              error_description: 'code_verifier is required for public clients (PKCE)',
            });
          }

          if (!authCode.codeChallenge) {
            return reply.status(400).send({
              error: 'invalid_grant',
              error_description: 'No code_challenge found for this authorization',
            });
          }

          if (!verifyPKCE(code_verifier, authCode.codeChallenge)) {
            return reply.status(400).send({
              error: 'invalid_grant',
              error_description: 'Invalid code_verifier',
            });
          }
        } else {
          // Confidential client - PKCE is optional but verify if provided
          if (code_verifier && authCode.codeChallenge) {
            if (!verifyPKCE(code_verifier, authCode.codeChallenge)) {
              return reply.status(400).send({
                error: 'invalid_grant',
                error_description: 'Invalid code_verifier',
              });
            }
          }
        }

        // Check if user is still active
        if (!authCode.user.isActive) {
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'User account is inactive',
          });
        }

        // Mark authorization code as consumed
        await prisma.oAuthAuthorizationCode.update({
          where: { id: authCode.id },
          data: { consumedAt: new Date() },
        });

        // Generate tokens
        const accessToken = generateAccessToken();
        const refreshToken = generateRefreshToken();
        const accessTokenExpiry = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MS);
        const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

        // Store tokens
        try {
          await prisma.$transaction([
            prisma.oAuthToken.create({
              data: {
                tokenType: 'access',
                tokenHash: hashToken(accessToken),
                tokenPrefix: getTokenPrefix(accessToken),
                clientId: authCode.clientId,
                userId: authCode.userId,
                scope: authCode.scope,
                expiresAt: accessTokenExpiry,
              },
            }),
            prisma.oAuthToken.create({
              data: {
                tokenType: 'refresh',
                tokenHash: hashToken(refreshToken),
                tokenPrefix: getTokenPrefix(refreshToken),
                clientId: authCode.clientId,
                userId: authCode.userId,
                scope: authCode.scope,
                expiresAt: refreshTokenExpiry,
              },
            }),
          ]);

          server.log.info(
            `[OAuth] Tokens issued for client ${authenticatedClientId}, user ${authCode.user.username} (auth: ${authMethod})`
          );

          return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
            refresh_token: refreshToken,
            scope: authCode.scope || undefined,
          };
        } catch (error) {
          server.log.error({ err: error }, '[OAuth] Token creation failed');
          return reply.status(500).send({
            error: 'server_error',
            error_description: 'Failed to create tokens',
          });
        }
      }

      // ========================================
      // Refresh Token Grant
      // ========================================
      if (grantType === 'refresh_token') {
        const { refresh_token } = params;

        if (!refresh_token) {
          return reply.status(400).send({
            error: 'invalid_request',
            error_description: 'refresh_token is required',
          });
        }

        // Authenticate client (supports none, client_secret_basic, client_secret_post)
        const authResult = await authenticateClient(request, params);
        if ('error' in authResult) {
          return reply.status(401).send({
            error: authResult.error,
            error_description: authResult.errorDescription,
          });
        }

        const { clientId: authenticatedClientId, authMethod } = authResult;

        // Find refresh token by hash
        const tokenHash = hashToken(refresh_token);
        const storedToken = await prisma.oAuthToken.findUnique({
          where: { tokenHash },
          include: {
            client: true,
            user: {
              select: { id: true, username: true, isActive: true },
            },
          },
        });

        if (!storedToken || storedToken.tokenType !== 'refresh') {
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'Invalid refresh token',
          });
        }

        // Check if token is revoked
        if (storedToken.revokedAt) {
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'Refresh token has been revoked',
          });
        }

        // Check if token is expired
        if (storedToken.expiresAt < new Date()) {
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'Refresh token has expired',
          });
        }

        // Verify client_id matches the token
        if (storedToken.client.clientId !== authenticatedClientId) {
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'client_id does not match',
          });
        }

        // Check if user is still active
        if (!storedToken.user.isActive) {
          return reply.status(400).send({
            error: 'invalid_grant',
            error_description: 'User account is inactive',
          });
        }

        // Revoke old refresh token (rotation)
        await prisma.oAuthToken.update({
          where: { id: storedToken.id },
          data: { revokedAt: new Date() },
        });

        server.log.info(
          `[OAuth] Refresh token rotated for client ${authenticatedClientId} (auth: ${authMethod})`
        );

        // Generate new tokens
        const newAccessToken = generateAccessToken();
        const newRefreshToken = generateRefreshToken();
        const accessTokenExpiry = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MS);
        const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

        try {
          await prisma.$transaction([
            prisma.oAuthToken.create({
              data: {
                tokenType: 'access',
                tokenHash: hashToken(newAccessToken),
                tokenPrefix: getTokenPrefix(newAccessToken),
                clientId: storedToken.clientId,
                userId: storedToken.userId,
                scope: storedToken.scope,
                expiresAt: accessTokenExpiry,
              },
            }),
            prisma.oAuthToken.create({
              data: {
                tokenType: 'refresh',
                tokenHash: hashToken(newRefreshToken),
                tokenPrefix: getTokenPrefix(newRefreshToken),
                clientId: storedToken.clientId,
                userId: storedToken.userId,
                scope: storedToken.scope,
                expiresAt: refreshTokenExpiry,
                parentTokenId: storedToken.id,
              },
            }),
          ]);

          server.log.info(
            `[OAuth] Tokens refreshed for client ${authenticatedClientId}, user ${storedToken.user.username}`
          );

          return {
            access_token: newAccessToken,
            token_type: 'Bearer',
            expires_in: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
            refresh_token: newRefreshToken,
            scope: storedToken.scope || undefined,
          };
        } catch (error) {
          server.log.error({ err: error }, '[OAuth] Token refresh failed');
          return reply.status(500).send({
            error: 'server_error',
            error_description: 'Failed to refresh tokens',
          });
        }
      }

      // Unknown grant type
      return reply.status(400).send({
        error: 'unsupported_grant_type',
        error_description: `Grant type "${grantType}" is not supported`,
      });
    }
  );

  /**
   * POST /oauth/token/introspect - Token introspection (RFC 7662)
   *
   * Returns information about a token's validity and metadata.
   */
  server.post<{
    Body: { token: string; token_type_hint?: string };
    Reply: IntrospectionResponse;
  }>('/oauth/token/introspect', async (request) => {
    const { token } = request.body;

    if (!token) {
      return { active: false };
    }

    // Find token by hash
    const tokenHash = hashToken(token);
    const storedToken = await prisma.oAuthToken.findUnique({
      where: { tokenHash },
      include: {
        client: true,
        user: {
          select: { username: true },
        },
      },
    });

    // Token not found or revoked
    if (!storedToken || storedToken.revokedAt) {
      return { active: false };
    }

    // Token expired
    if (storedToken.expiresAt < new Date()) {
      return { active: false };
    }

    // Update last used timestamp
    await prisma.oAuthToken
      .update({
        where: { id: storedToken.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Ignore errors - just for tracking
      });

    return {
      active: true,
      client_id: storedToken.client.clientId,
      username: storedToken.user.username,
      scope: storedToken.scope || undefined,
      exp: Math.floor(storedToken.expiresAt.getTime() / 1000),
      iat: Math.floor(storedToken.createdAt.getTime() / 1000),
      token_type: storedToken.tokenType === 'access' ? 'Bearer' : 'refresh_token',
    };
  });

  /**
   * POST /oauth/token/revoke - Token revocation (RFC 7009)
   *
   * Revokes a token (access or refresh).
   * Always returns 200 OK (per RFC 7009).
   */
  server.post<{
    Body: { token: string; token_type_hint?: string };
    Reply: Record<string, never>;
  }>('/oauth/token/revoke', async (request) => {
    const { token } = request.body;

    if (!token) {
      // Per RFC 7009, always return 200 OK
      return {};
    }

    // Find and revoke token by hash
    const tokenHash = hashToken(token);
    const storedToken = await prisma.oAuthToken.findUnique({
      where: { tokenHash },
    });

    if (storedToken && !storedToken.revokedAt) {
      await prisma.oAuthToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      server.log.info(`[OAuth] Token revoked: ${storedToken.tokenPrefix}...`);

      // If revoking a refresh token, also revoke associated access tokens
      if (storedToken.tokenType === 'refresh') {
        await prisma.oAuthToken.updateMany({
          where: {
            clientId: storedToken.clientId,
            userId: storedToken.userId,
            tokenType: 'access',
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }
    }

    // Per RFC 7009, always return 200 OK
    return {};
  });

  server.log.info('[OAuth] Token endpoints registered');
}
