/*
 * GitHub Image Proxy Routes
 * Version: 1.0.0
 *
 * Proxies GitHub images through the backend to handle authentication
 * for private repository images that require GitHub App credentials.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-10
 * =============================================================================
 */

import { FastifyInstance } from 'fastify';
import { getInstallationOctokit } from '../services/github/githubService';
import { prisma } from '../lib/prisma';

// Allowed GitHub image domains
const ALLOWED_DOMAINS = [
  'user-images.githubusercontent.com',
  'raw.githubusercontent.com',
  'avatars.githubusercontent.com',
  'camo.githubusercontent.com',
  'github.com',
  'private-user-images.githubusercontent.com',
];

/**
 * Validate that a URL is a GitHub image URL
 */
function isValidGitHubImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Register GitHub image proxy routes
 */
export async function registerGitHubImageProxyRoutes(server: FastifyInstance) {
  /**
   * GET /api/github/image-proxy
   * Proxies GitHub images through the backend
   * Query params:
   *   - url: The GitHub image URL to proxy
   *   - projectId: The project ID (to get the installation token)
   */
  server.get<{
    Querystring: { url: string; projectId?: string };
  }>('/api/github/image-proxy', async (request, reply) => {
    const { url, projectId } = request.query;

    if (!url) {
      return reply.status(400).send({ error: 'Missing url parameter' });
    }

    // Validate the URL is a GitHub image URL (security check)
    if (!isValidGitHubImageUrl(url)) {
      return reply.status(400).send({ error: 'Invalid GitHub image URL' });
    }

    try {
      let fetchOptions: RequestInit = {
        redirect: 'follow', // Follow redirects (e.g., github.com/user-attachments -> S3)
        headers: {
          Accept: 'image/*',
          'User-Agent': 'Kanbu-Image-Proxy/1.0',
        },
      };

      // If projectId is provided, try to use the GitHub App token for authentication
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: parseInt(projectId, 10) },
          include: {
            githubRepositories: {
              include: {
                installation: true,
              },
            },
          },
        });

        // Find the primary repo or first available
        const githubRepo =
          project?.githubRepositories?.find((r) => r.isPrimary) ?? project?.githubRepositories?.[0];

        if (githubRepo?.installation) {
          try {
            const octokit = await getInstallationOctokit(githubRepo.installation.installationId);

            // Get the token from octokit
            const auth = (await octokit.auth({ type: 'installation' })) as { token: string };

            if (auth?.token) {
              fetchOptions = {
                headers: {
                  Accept: 'image/*',
                  'User-Agent': 'Kanbu-Image-Proxy/1.0',
                  Authorization: `Bearer ${auth.token}`,
                },
              };
            }
          } catch (authError) {
            // If we can't get the token, continue without auth
            console.warn('[GitHubImageProxy] Could not get installation token:', authError);
          }
        }
      }

      // Fetch the image
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        console.error(
          '[GitHubImageProxy] Failed to fetch image:',
          response.status,
          response.statusText
        );
        return reply.status(response.status).send({
          error: 'Failed to fetch image',
          status: response.status,
        });
      }

      // Get content type
      const contentType = response.headers.get('content-type') || 'image/png';

      // Get the image data
      const imageBuffer = await response.arrayBuffer();

      // Set caching headers (cache for 1 hour)
      reply.header('Cache-Control', 'public, max-age=3600');
      reply.header('Content-Type', contentType);

      return reply.send(Buffer.from(imageBuffer));
    } catch (error) {
      console.error('[GitHubImageProxy] Error:', error);
      return reply.status(500).send({ error: 'Failed to proxy image' });
    }
  });
}
