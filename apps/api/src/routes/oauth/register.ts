/**
 * OAuth 2.1 Dynamic Client Registration (Phase 19.3)
 *
 * Implements RFC 7591 (OAuth 2.0 Dynamic Client Registration Protocol)
 * for Claude.ai and other OAuth clients to register themselves.
 *
 * Claude.ai requires anonymous DCR support for OAuth 2.1 integration.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';
import { randomBytes, createHash } from 'crypto';

// Rate limiting storage (in-memory, resets on server restart)
const registrationAttempts = new Map<string, { count: number; resetAt: number }>();

// Rate limit: 10 registrations per IP per hour
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Allowed redirect URI patterns for security
 * In production, these should be configurable via environment
 */
function getAllowedRedirectPatterns(): RegExp[] {
  const envPatterns = process.env.OAUTH_ALLOWED_REDIRECT_PATTERNS;
  if (envPatterns) {
    return envPatterns.split(',').map((pattern) => {
      // Convert glob-like patterns to regex
      const regexPattern = pattern
        .trim()
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
        .replace(/\*/g, '.*'); // Convert * to .*
      return new RegExp(`^${regexPattern}$`);
    });
  }

  // Default allowed patterns (Claude.ai, ChatGPT, localhost for dev)
  return [
    /^https:\/\/claude\.ai\/.*$/,
    /^https:\/\/chat\.openai\.com\/.*$/,
    /^https:\/\/chatgpt\.com\/.*$/,
    /^http:\/\/localhost(:\d+)?\/.*$/,
    /^https:\/\/localhost(:\d+)?\/.*$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?\/.*$/,
    /^https:\/\/127\.0\.0\.1(:\d+)?\/.*$/,
  ];
}

/**
 * Validate redirect URIs against allowed patterns
 */
function validateRedirectUris(uris: string[]): { valid: boolean; error?: string } {
  if (!uris || uris.length === 0) {
    return { valid: false, error: 'At least one redirect_uri is required' };
  }

  const patterns = getAllowedRedirectPatterns();

  for (const uri of uris) {
    // Basic URL validation
    try {
      new URL(uri);
    } catch {
      return { valid: false, error: `Invalid URL format: ${uri}` };
    }

    // Check against allowed patterns
    const isAllowed = patterns.some((pattern) => pattern.test(uri));
    if (!isAllowed) {
      return {
        valid: false,
        error: `Redirect URI not allowed: ${uri}. Allowed patterns: claude.ai, chat.openai.com, chatgpt.com, localhost`,
      };
    }
  }

  return { valid: true };
}

/**
 * Generate a secure client ID with kanbu_ prefix
 */
function generateClientId(): string {
  return `kanbu_${randomBytes(24).toString('hex')}`;
}

/**
 * Generate a secure registration access token
 */
function generateRegistrationToken(): string {
  return `rat_${randomBytes(32).toString('hex')}`;
}

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Get client IP from request (handles proxies)
 */
function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    if (ips) {
      return ips.trim();
    }
  }
  return request.ip;
}

/**
 * Check rate limit for client registration
 */
function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = registrationAttempts.get(ip);

  if (!record || now > record.resetAt) {
    // New window
    registrationAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

/**
 * Get the base URL for the OAuth server
 */
function getIssuer(request: FastifyRequest): string {
  if (process.env.OAUTH_ISSUER) {
    return process.env.OAUTH_ISSUER;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : request.protocol;
  return `${protocol}://${request.hostname}`;
}

// ============================================
// Request/Response Types
// ============================================

interface ClientRegistrationRequest {
  client_name: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  client_uri?: string;
  logo_uri?: string;
}

interface ClientRegistrationResponse {
  client_id: string;
  client_secret?: string | null;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope?: string;
  client_uri?: string;
  logo_uri?: string;
  registration_access_token?: string;
  registration_client_uri?: string;
  client_id_issued_at?: number;
}

interface ClientInfoResponse {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope?: string;
  client_uri?: string;
  logo_uri?: string;
  registration_client_uri?: string;
  client_id_issued_at?: number;
}

interface ErrorResponse {
  error: string;
  error_description?: string;
}

// ============================================
// Route Handlers
// ============================================

/**
 * Register OAuth Dynamic Client Registration routes
 */
export async function registerOAuthRegisterRoutes(server: FastifyInstance): Promise<void> {
  /**
   * POST /oauth/register - Register a new OAuth client
   *
   * RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol
   *
   * Anonymous registration allowed (required by Claude.ai).
   * Rate limited to prevent abuse.
   */
  server.post<{
    Body: ClientRegistrationRequest;
    Reply: ClientRegistrationResponse | ErrorResponse;
  }>('/oauth/register', async (request, reply) => {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      reply.header('Retry-After', rateLimit.retryAfter?.toString() ?? '3600');
      return reply.status(429).send({
        error: 'too_many_requests',
        error_description: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
      });
    }

    const body = request.body;

    // Validate required fields
    if (!body.client_name) {
      return reply.status(400).send({
        error: 'invalid_client_metadata',
        error_description: 'client_name is required',
      });
    }

    if (!body.redirect_uris || !Array.isArray(body.redirect_uris)) {
      return reply.status(400).send({
        error: 'invalid_redirect_uri',
        error_description: 'redirect_uris is required and must be an array',
      });
    }

    // Validate redirect URIs
    const uriValidation = validateRedirectUris(body.redirect_uris);
    if (!uriValidation.valid) {
      return reply.status(400).send({
        error: 'invalid_redirect_uri',
        error_description: uriValidation.error,
      });
    }

    // Validate grant_types (if provided)
    const grantTypes = body.grant_types ?? ['authorization_code', 'refresh_token'];
    const allowedGrantTypes = ['authorization_code', 'refresh_token'];
    for (const gt of grantTypes) {
      if (!allowedGrantTypes.includes(gt)) {
        return reply.status(400).send({
          error: 'invalid_client_metadata',
          error_description: `Unsupported grant_type: ${gt}. Allowed: ${allowedGrantTypes.join(', ')}`,
        });
      }
    }

    // Validate response_types (if provided)
    const responseTypes = body.response_types ?? ['code'];
    const allowedResponseTypes = ['code'];
    for (const rt of responseTypes) {
      if (!allowedResponseTypes.includes(rt)) {
        return reply.status(400).send({
          error: 'invalid_client_metadata',
          error_description: `Unsupported response_type: ${rt}. Allowed: ${allowedResponseTypes.join(', ')}`,
        });
      }
    }

    // Validate token_endpoint_auth_method
    const authMethod = body.token_endpoint_auth_method ?? 'none';
    const allowedAuthMethods = ['none', 'client_secret_basic', 'client_secret_post'];
    if (!allowedAuthMethods.includes(authMethod)) {
      return reply.status(400).send({
        error: 'invalid_client_metadata',
        error_description: `Unsupported token_endpoint_auth_method: ${authMethod}`,
      });
    }

    // Generate client credentials
    const clientId = generateClientId();
    const registrationToken = generateRegistrationToken();
    const registrationTokenHash = hashToken(registrationToken);

    // Create client in database
    try {
      const client = await prisma.oAuthClient.create({
        data: {
          clientId,
          clientName: body.client_name,
          clientUri: body.client_uri,
          logoUri: body.logo_uri,
          redirectUris: body.redirect_uris,
          grantTypes,
          responseTypes,
          tokenEndpointAuthMethod: authMethod,
          scope: body.scope,
          registrationTokenHash,
          isActive: true,
        },
      });

      const issuer = getIssuer(request);

      const response: ClientRegistrationResponse = {
        client_id: client.clientId,
        client_secret: null, // Public client (PKCE used instead)
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        grant_types: client.grantTypes,
        response_types: client.responseTypes,
        token_endpoint_auth_method: client.tokenEndpointAuthMethod,
        scope: client.scope ?? undefined,
        client_uri: client.clientUri ?? undefined,
        logo_uri: client.logoUri ?? undefined,
        registration_access_token: registrationToken,
        registration_client_uri: `${issuer}/oauth/register/${client.clientId}`,
        client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      };

      server.log.info(`[OAuth] Client registered: ${clientId} (${body.client_name})`);
      return reply.status(201).send(response);
    } catch (error) {
      server.log.error({ err: error }, '[OAuth] Client registration failed');
      return reply.status(500).send({
        error: 'server_error',
        error_description: 'Failed to register client',
      });
    }
  });

  /**
   * GET /oauth/register/:clientId - Get client information
   *
   * RFC 7592 - OAuth 2.0 Dynamic Client Registration Management Protocol
   *
   * Requires registration_access_token in Authorization header.
   */
  server.get<{
    Params: { clientId: string };
    Reply: ClientInfoResponse | ErrorResponse;
  }>('/oauth/register/:clientId', async (request, reply) => {
    const { clientId } = request.params;

    // Validate registration access token
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'invalid_token',
        error_description: 'Registration access token required',
      });
    }

    const token = authHeader.substring(7);
    const tokenHash = hashToken(token);

    // Find client and verify token
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client || !client.isActive) {
      return reply.status(404).send({
        error: 'invalid_client',
        error_description: 'Client not found',
      });
    }

    if (client.registrationTokenHash !== tokenHash) {
      return reply.status(401).send({
        error: 'invalid_token',
        error_description: 'Invalid registration access token',
      });
    }

    const issuer = getIssuer(request);

    const response: ClientInfoResponse = {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      scope: client.scope ?? undefined,
      client_uri: client.clientUri ?? undefined,
      logo_uri: client.logoUri ?? undefined,
      registration_client_uri: `${issuer}/oauth/register/${client.clientId}`,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    };

    return response;
  });

  /**
   * PUT /oauth/register/:clientId - Update client information
   *
   * RFC 7592 - OAuth 2.0 Dynamic Client Registration Management Protocol
   *
   * Requires registration_access_token in Authorization header.
   */
  server.put<{
    Params: { clientId: string };
    Body: Partial<ClientRegistrationRequest>;
    Reply: ClientInfoResponse | ErrorResponse;
  }>('/oauth/register/:clientId', async (request, reply) => {
    const { clientId } = request.params;
    const body = request.body;

    // Validate registration access token
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'invalid_token',
        error_description: 'Registration access token required',
      });
    }

    const token = authHeader.substring(7);
    const tokenHash = hashToken(token);

    // Find client and verify token
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client || !client.isActive) {
      return reply.status(404).send({
        error: 'invalid_client',
        error_description: 'Client not found',
      });
    }

    if (client.registrationTokenHash !== tokenHash) {
      return reply.status(401).send({
        error: 'invalid_token',
        error_description: 'Invalid registration access token',
      });
    }

    // Validate redirect URIs if provided
    if (body.redirect_uris) {
      const uriValidation = validateRedirectUris(body.redirect_uris);
      if (!uriValidation.valid) {
        return reply.status(400).send({
          error: 'invalid_redirect_uri',
          error_description: uriValidation.error,
        });
      }
    }

    // Update client
    try {
      const updatedClient = await prisma.oAuthClient.update({
        where: { clientId },
        data: {
          clientName: body.client_name ?? client.clientName,
          clientUri: body.client_uri !== undefined ? body.client_uri : client.clientUri,
          logoUri: body.logo_uri !== undefined ? body.logo_uri : client.logoUri,
          redirectUris: body.redirect_uris ?? client.redirectUris,
          scope: body.scope !== undefined ? body.scope : client.scope,
        },
      });

      const issuer = getIssuer(request);

      const response: ClientInfoResponse = {
        client_id: updatedClient.clientId,
        client_name: updatedClient.clientName,
        redirect_uris: updatedClient.redirectUris,
        grant_types: updatedClient.grantTypes,
        response_types: updatedClient.responseTypes,
        token_endpoint_auth_method: updatedClient.tokenEndpointAuthMethod,
        scope: updatedClient.scope ?? undefined,
        client_uri: updatedClient.clientUri ?? undefined,
        logo_uri: updatedClient.logoUri ?? undefined,
        registration_client_uri: `${issuer}/oauth/register/${updatedClient.clientId}`,
        client_id_issued_at: Math.floor(updatedClient.createdAt.getTime() / 1000),
      };

      server.log.info(`[OAuth] Client updated: ${clientId}`);
      return response;
    } catch (error) {
      server.log.error({ err: error }, '[OAuth] Client update failed');
      return reply.status(500).send({
        error: 'server_error',
        error_description: 'Failed to update client',
      });
    }
  });

  /**
   * DELETE /oauth/register/:clientId - Delete client
   *
   * RFC 7592 - OAuth 2.0 Dynamic Client Registration Management Protocol
   *
   * Requires registration_access_token in Authorization header.
   * Soft-deletes the client (sets isActive to false).
   */
  server.delete<{
    Params: { clientId: string };
    Reply: void | ErrorResponse;
  }>('/oauth/register/:clientId', async (request, reply) => {
    const { clientId } = request.params;

    // Validate registration access token
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'invalid_token',
        error_description: 'Registration access token required',
      });
    }

    const token = authHeader.substring(7);
    const tokenHash = hashToken(token);

    // Find client and verify token
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client || !client.isActive) {
      return reply.status(404).send({
        error: 'invalid_client',
        error_description: 'Client not found',
      });
    }

    if (client.registrationTokenHash !== tokenHash) {
      return reply.status(401).send({
        error: 'invalid_token',
        error_description: 'Invalid registration access token',
      });
    }

    // Soft-delete client
    try {
      await prisma.oAuthClient.update({
        where: { clientId },
        data: { isActive: false },
      });

      server.log.info(`[OAuth] Client deleted: ${clientId}`);
      return reply.status(204).send();
    } catch (error) {
      server.log.error({ err: error }, '[OAuth] Client deletion failed');
      return reply.status(500).send({
        error: 'server_error',
        error_description: 'Failed to delete client',
      });
    }
  });

  server.log.info('[OAuth] Dynamic Client Registration endpoints registered');
}
