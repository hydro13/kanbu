/**
 * OAuth 2.1 Metadata Endpoints (Phase 19.2)
 *
 * Implements RFC 8414 (Authorization Server Metadata) and
 * RFC 9728 (Protected Resource Metadata) for OAuth discovery.
 *
 * These endpoints are required by Claude.ai for OAuth 2.1 integration.
 */

import type { FastifyInstance } from 'fastify';

/**
 * Get the base URL for the OAuth server from environment or request
 */
function getIssuer(request: { protocol: string; hostname: string }): string {
  // Use OAUTH_ISSUER if set, otherwise construct from APP_URL or request
  if (process.env.OAUTH_ISSUER) {
    return process.env.OAUTH_ISSUER;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  // Fallback to request-based URL (development)
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : request.protocol;
  return `${protocol}://${request.hostname}`;
}

/**
 * RFC 8414 - Authorization Server Metadata
 *
 * Describes the OAuth authorization server capabilities and endpoints.
 * Claude.ai uses this to discover how to authenticate.
 */
interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  token_endpoint_auth_methods_supported: string[];
  grant_types_supported: string[];
  response_types_supported: string[];
  code_challenge_methods_supported: string[];
  scopes_supported: string[];
  service_documentation?: string;
  revocation_endpoint?: string;
  introspection_endpoint?: string;
}

/**
 * RFC 9728 - Protected Resource Metadata
 *
 * Describes the protected resource (MCP endpoint) and its authorization requirements.
 * Claude.ai uses this to understand which auth server protects the MCP endpoint.
 */
interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
}

/**
 * Register OAuth metadata discovery endpoints
 */
export async function registerOAuthMetadataRoutes(server: FastifyInstance): Promise<void> {
  /**
   * RFC 8414 - OAuth 2.0 Authorization Server Metadata
   *
   * GET /.well-known/oauth-authorization-server
   *
   * Returns metadata about the authorization server including:
   * - Supported endpoints (authorize, token, register)
   * - Supported grant types and response types
   * - Supported PKCE methods
   * - Available scopes
   */
  server.get<{
    Reply: AuthorizationServerMetadata;
  }>('/.well-known/oauth-authorization-server', async (request) => {
    const issuer = getIssuer(request);

    const metadata: AuthorizationServerMetadata = {
      // The issuer identifier (must match token issuer)
      issuer,

      // Core OAuth endpoints
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,

      // Dynamic Client Registration (RFC 7591) - required by Claude.ai
      registration_endpoint: `${issuer}/oauth/register`,

      // Token endpoint authentication methods
      // "none" for public clients (Claude.ai uses PKCE instead of client_secret)
      token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],

      // Supported grant types
      grant_types_supported: ['authorization_code', 'refresh_token'],

      // Response types (only 'code' for authorization code flow)
      response_types_supported: ['code'],

      // PKCE support (required by Claude.ai for OAuth 2.1)
      // Only S256 is supported (plain is insecure)
      code_challenge_methods_supported: ['S256'],

      // Available scopes for Kanbu
      scopes_supported: ['read', 'write', 'admin'],

      // Optional: documentation link
      service_documentation: 'https://docs.kanbu.be/oauth',

      // Token revocation endpoint (RFC 7009)
      revocation_endpoint: `${issuer}/oauth/token/revoke`,

      // Token introspection endpoint (RFC 7662)
      introspection_endpoint: `${issuer}/oauth/token/introspect`,
    };

    return metadata;
  });

  /**
   * RFC 9728 - OAuth 2.0 Protected Resource Metadata
   *
   * GET /.well-known/oauth-protected-resource
   *
   * Returns metadata about the protected resource (MCP endpoint).
   * This tells clients which authorization server protects this resource.
   */
  server.get<{
    Reply: ProtectedResourceMetadata;
  }>('/.well-known/oauth-protected-resource', async (request) => {
    const issuer = getIssuer(request);

    const metadata: ProtectedResourceMetadata = {
      // The protected resource identifier (the MCP endpoint)
      resource: `${issuer}/mcp`,

      // Which authorization servers can issue tokens for this resource
      // For Kanbu, the auth server is the same as the API server
      authorization_servers: [issuer],

      // Scopes supported by this resource
      scopes_supported: ['read', 'write', 'admin'],

      // How bearer tokens can be provided
      // We only support the Authorization header
      bearer_methods_supported: ['header'],
    };

    return metadata;
  });

  server.log.info('[OAuth] Metadata discovery endpoints registered');
}
