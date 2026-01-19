/**
 * OAuth 2.1 Authorization Endpoint (Phase 19.4)
 *
 * Implements RFC 6749 (Authorization Code Grant) and
 * RFC 7636 (PKCE) for secure authorization flow.
 *
 * Flow:
 * 1. Frontend receives GET /oauth/authorize request from client (Claude.ai)
 * 2. Frontend shows consent screen to authenticated user
 * 3. User approves -> Frontend calls POST /oauth/authorize with JWT
 * 4. Backend generates authorization code, returns redirect URL
 * 5. Frontend redirects to redirect_uri with code
 */

import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';
import { verifyToken, extractBearerToken } from '../../lib/auth';
import { randomBytes } from 'crypto';

// Authorization code expiry: 10 minutes (per RFC 6749)
const AUTH_CODE_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Generate a secure authorization code
 */
function generateAuthorizationCode(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate PKCE code_challenge_method
 * Only S256 is supported (plain is insecure)
 */
function validateCodeChallengeMethod(method: string | undefined): boolean {
  return method === 'S256';
}

/**
 * Validate state parameter (required for CSRF protection)
 */
function validateState(state: string | undefined): boolean {
  return !!state && state.length >= 8 && state.length <= 255;
}

/**
 * Validate scope against allowed scopes
 */
function validateScope(scope: string | undefined): { valid: boolean; scopes: string[] } {
  const allowedScopes = ['read', 'write', 'admin'];

  if (!scope) {
    // Default to read scope if not specified
    return { valid: true, scopes: ['read'] };
  }

  const requestedScopes = scope.split(' ').filter(Boolean);
  const invalidScopes = requestedScopes.filter((s) => !allowedScopes.includes(s));

  if (invalidScopes.length > 0) {
    return { valid: false, scopes: [] };
  }

  return { valid: true, scopes: requestedScopes };
}

// ============================================
// Request/Response Types
// ============================================

interface AuthorizeRequest {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  scope?: string;
}

interface AuthorizeResponse {
  redirect_url: string;
}

interface ErrorResponse {
  error: string;
  error_description?: string;
}

interface ClientInfoResponse {
  client_id: string;
  client_name: string;
  client_uri?: string;
  logo_uri?: string;
  scope: string[];
}

// ============================================
// Route Handlers
// ============================================

/**
 * Register OAuth authorization endpoint
 */
export async function registerOAuthAuthorizeRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /oauth/authorize - Redirect to frontend consent screen
   *
   * This is the entry point for OAuth clients (Claude.ai, ChatGPT).
   * It redirects to the frontend's consent page which handles:
   * - Checking if user is authenticated (redirects to login if not)
   * - Showing consent screen
   * - Calling POST /oauth/authorize after user approval
   */
  server.get<{
    Querystring: {
      client_id?: string;
      redirect_uri?: string;
      response_type?: string;
      state?: string;
      code_challenge?: string;
      code_challenge_method?: string;
      scope?: string;
      resource?: string;
    };
    Reply: ErrorResponse;
  }>('/oauth/authorize', async (request, reply) => {
    const {
      client_id,
      redirect_uri,
      response_type,
      state,
      code_challenge,
      code_challenge_method,
      scope,
    } = request.query;

    // Basic validation
    if (!client_id) {
      return reply.status(400).send({
        error: 'invalid_request',
        error_description: 'client_id is required',
      });
    }

    // Verify client exists
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId: client_id },
    });

    if (!client || !client.isActive) {
      return reply.status(400).send({
        error: 'invalid_client',
        error_description: 'Client not found or inactive',
      });
    }

    // Build redirect URL to frontend consent page
    // Frontend is on the same domain, just different port in dev or same in prod
    const appUrl = process.env.APP_URL || 'https://dev.kanbu.be';
    const frontendUrl = new URL('/oauth/authorize', appUrl);

    // Pass all query parameters to the frontend
    if (client_id) frontendUrl.searchParams.set('client_id', client_id);
    if (redirect_uri) frontendUrl.searchParams.set('redirect_uri', redirect_uri);
    if (response_type) frontendUrl.searchParams.set('response_type', response_type);
    if (state) frontendUrl.searchParams.set('state', state);
    if (code_challenge) frontendUrl.searchParams.set('code_challenge', code_challenge);
    if (code_challenge_method)
      frontendUrl.searchParams.set('code_challenge_method', code_challenge_method);
    if (scope) frontendUrl.searchParams.set('scope', scope);

    server.log.info(
      `[OAuth] Redirecting to consent screen for client ${client_id} -> ${frontendUrl.toString()}`
    );

    return reply.redirect(frontendUrl.toString());
  });

  /**
   * GET /oauth/authorize/client - Get client info for consent screen
   *
   * Called by frontend to get client details before showing consent screen.
   * Does not require authentication (info is public for registered clients).
   */
  server.get<{
    Querystring: { client_id: string; redirect_uri: string };
    Reply: ClientInfoResponse | ErrorResponse;
  }>('/oauth/authorize/client', async (request, reply) => {
    const { client_id, redirect_uri } = request.query;

    if (!client_id) {
      return reply.status(400).send({
        error: 'invalid_request',
        error_description: 'client_id is required',
      });
    }

    // Find client
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId: client_id },
    });

    if (!client || !client.isActive) {
      return reply.status(400).send({
        error: 'invalid_client',
        error_description: 'Client not found or inactive',
      });
    }

    // Validate redirect_uri matches registered URIs
    if (redirect_uri && !client.redirectUris.includes(redirect_uri)) {
      return reply.status(400).send({
        error: 'invalid_redirect_uri',
        error_description: 'redirect_uri does not match registered URIs',
      });
    }

    return {
      client_id: client.clientId,
      client_name: client.clientName,
      client_uri: client.clientUri ?? undefined,
      logo_uri: client.logoUri ?? undefined,
      scope: client.scope?.split(' ') ?? ['read'],
    };
  });

  /**
   * POST /oauth/authorize - Generate authorization code
   *
   * Called by frontend after user approves consent.
   * Requires valid JWT in Authorization header.
   */
  server.post<{
    Body: AuthorizeRequest;
    Reply: AuthorizeResponse | ErrorResponse;
  }>('/oauth/authorize', async (request, reply) => {
    // Verify user authentication
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return reply.status(401).send({
        error: 'unauthorized',
        error_description: 'Authentication required',
      });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return reply.status(401).send({
        error: 'unauthorized',
        error_description: 'Invalid or expired token',
      });
    }

    const userId = parseInt(payload.sub, 10);

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({
        error: 'unauthorized',
        error_description: 'User not found or inactive',
      });
    }

    const body = request.body;

    // Validate required parameters
    if (!body.client_id) {
      return reply.status(400).send({
        error: 'invalid_request',
        error_description: 'client_id is required',
      });
    }

    if (!body.redirect_uri) {
      return reply.status(400).send({
        error: 'invalid_request',
        error_description: 'redirect_uri is required',
      });
    }

    if (body.response_type !== 'code') {
      return reply.status(400).send({
        error: 'unsupported_response_type',
        error_description: 'Only response_type=code is supported',
      });
    }

    if (!validateState(body.state)) {
      return reply.status(400).send({
        error: 'invalid_request',
        error_description: 'state is required (8-255 characters)',
      });
    }

    if (!body.code_challenge) {
      return reply.status(400).send({
        error: 'invalid_request',
        error_description: 'code_challenge is required (PKCE)',
      });
    }

    if (!validateCodeChallengeMethod(body.code_challenge_method)) {
      return reply.status(400).send({
        error: 'invalid_request',
        error_description: 'code_challenge_method must be S256',
      });
    }

    // Find and validate client
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId: body.client_id },
    });

    if (!client || !client.isActive) {
      return reply.status(400).send({
        error: 'invalid_client',
        error_description: 'Client not found or inactive',
      });
    }

    // Validate redirect_uri matches registered URIs
    if (!client.redirectUris.includes(body.redirect_uri)) {
      return reply.status(400).send({
        error: 'invalid_redirect_uri',
        error_description: 'redirect_uri does not match registered URIs',
      });
    }

    // Validate scope
    const scopeValidation = validateScope(body.scope);
    if (!scopeValidation.valid) {
      return reply.status(400).send({
        error: 'invalid_scope',
        error_description: 'Invalid scope requested',
      });
    }

    // Generate authorization code
    const code = generateAuthorizationCode();
    const expiresAt = new Date(Date.now() + AUTH_CODE_EXPIRY_MS);

    // Store authorization code
    try {
      await prisma.oAuthAuthorizationCode.create({
        data: {
          code,
          clientId: client.id,
          userId: user.id,
          redirectUri: body.redirect_uri,
          scope: scopeValidation.scopes.join(' '),
          codeChallenge: body.code_challenge,
          codeChallengeMethod: body.code_challenge_method,
          state: body.state,
          expiresAt,
        },
      });

      // Build redirect URL with code and state
      const redirectUrl = new URL(body.redirect_uri);
      redirectUrl.searchParams.set('code', code);
      redirectUrl.searchParams.set('state', body.state);

      server.log.info(
        `[OAuth] Authorization code generated for client ${body.client_id}, user ${userId}`
      );

      return {
        redirect_url: redirectUrl.toString(),
      };
    } catch (error) {
      server.log.error({ err: error }, '[OAuth] Authorization code generation failed');
      return reply.status(500).send({
        error: 'server_error',
        error_description: 'Failed to generate authorization code',
      });
    }
  });

  /**
   * POST /oauth/authorize/deny - User denied authorization
   *
   * Called by frontend when user clicks "Deny" on consent screen.
   * Returns the redirect URL with error.
   */
  server.post<{
    Body: { redirect_uri: string; state: string };
    Reply: AuthorizeResponse | ErrorResponse;
  }>('/oauth/authorize/deny', async (request, reply) => {
    const { redirect_uri, state } = request.body;

    if (!redirect_uri) {
      return reply.status(400).send({
        error: 'invalid_request',
        error_description: 'redirect_uri is required',
      });
    }

    // Build redirect URL with error
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_description', 'User denied authorization');
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    return {
      redirect_url: redirectUrl.toString(),
    };
  });

  server.log.info('[OAuth] Authorization endpoints registered');
}
