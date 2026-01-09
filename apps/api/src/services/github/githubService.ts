/*
 * GitHub Service
 * Version: 1.0.0
 *
 * Core service for GitHub App integration.
 * Handles authentication, token management, and API calls.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 2 - GitHub App & OAuth
 * =============================================================================
 */

import { App } from '@octokit/app'
import { Octokit } from '@octokit/rest'
import { readFileSync } from 'fs'
import { prisma } from '../../lib/prisma'

// Type is now just Octokit from @octokit/rest which has .rest property built-in

// =============================================================================
// Configuration
// =============================================================================

export interface GitHubConfig {
  appId: string
  appName: string
  clientId: string
  clientSecret: string
  privateKey: string
  webhookSecret: string
  callbackUrl: string
}

function getConfig(): GitHubConfig {
  const appId = process.env.GITHUB_APP_ID
  const appName = process.env.GITHUB_APP_NAME || 'kanbu-github'
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/github/callback'

  // Get private key from env or file
  let privateKey = process.env.GITHUB_PRIVATE_KEY || ''
  const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH

  if (privateKeyPath && !privateKey) {
    try {
      privateKey = readFileSync(privateKeyPath, 'utf8')
    } catch {
      // Will be validated below
    }
  }

  // Decode base64 if needed
  if (privateKey && !privateKey.includes('-----BEGIN')) {
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf8')
    } catch {
      // Keep as-is
    }
  }

  return {
    appId: appId || '',
    appName,
    clientId: clientId || '',
    clientSecret: clientSecret || '',
    privateKey,
    webhookSecret: webhookSecret || '',
    callbackUrl,
  }
}

/**
 * Check if GitHub App is configured
 */
export function isGitHubConfigured(): boolean {
  const config = getConfig()
  return !!(config.appId && config.clientId && config.privateKey)
}

// =============================================================================
// GitHub App Instance
// =============================================================================

let _app: App | null = null

/**
 * Get GitHub App instance (singleton)
 */
export function getGitHubApp(): App {
  if (!_app) {
    const config = getConfig()

    if (!config.appId || !config.privateKey) {
      throw new Error('GitHub App not configured. Set GITHUB_APP_ID and GITHUB_PRIVATE_KEY.')
    }

    _app = new App({
      appId: config.appId,
      privateKey: config.privateKey,
      Octokit: Octokit, // Use @octokit/rest for full .rest namespace support
      webhooks: {
        secret: config.webhookSecret,
      },
      oauth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      },
    })
  }

  return _app
}

// =============================================================================
// Installation Token Management
// =============================================================================

/**
 * Get Octokit instance for a specific installation
 * Uses the App's built-in method which now uses @octokit/rest
 */
export async function getInstallationOctokit(installationId: number | bigint): Promise<Octokit> {
  const app = getGitHubApp()
  // The App is configured to use @octokit/rest, so this returns an instance with .rest
  return await app.getInstallationOctokit(Number(installationId)) as unknown as Octokit
}

/**
 * Get or refresh installation access token
 * Stores the token in the database for reuse
 */
export async function getInstallationToken(installationDbId: number): Promise<string> {
  const installation = await prisma.gitHubInstallation.findUnique({
    where: { id: installationDbId },
  })

  if (!installation) {
    throw new Error(`GitHub installation ${installationDbId} not found`)
  }

  // Check if existing token is still valid (with 5 min buffer)
  if (installation.accessToken && installation.tokenExpiresAt) {
    const expiresAt = new Date(installation.tokenExpiresAt)
    const bufferTime = 5 * 60 * 1000 // 5 minutes

    if (expiresAt.getTime() - bufferTime > Date.now()) {
      return installation.accessToken
    }
  }

  // Generate new token via App instance
  const app = getGitHubApp()
  const response = await app.octokit.request('POST /app/installations/{installation_id}/access_tokens', {
    installation_id: Number(installation.installationId),
  })
  const token = response.data.token
  const expires_at = response.data.expires_at

  // Store new token
  await prisma.gitHubInstallation.update({
    where: { id: installationDbId },
    data: {
      accessToken: token,
      tokenExpiresAt: expires_at ? new Date(expires_at) : null,
    },
  })

  return token
}

// =============================================================================
// Installation URL Generation
// =============================================================================

/**
 * Generate GitHub App installation URL
 * User is redirected here to install the app on their org/account
 */
export function getInstallationUrl(state?: string): string {
  const config = getConfig()
  let url = `https://github.com/apps/${config.appName}/installations/new`

  if (state) {
    url += `?state=${encodeURIComponent(state)}`
  }

  return url
}

/**
 * Generate OAuth authorization URL
 */
export function getOAuthUrl(state: string): string {
  const config = getConfig()
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    state,
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

// =============================================================================
// OAuth Callback Handling
// =============================================================================

interface OAuthTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeOAuthCode(code: string): Promise<OAuthTokenResponse> {
  const config = getConfig()

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub OAuth error: ${response.statusText}`)
  }

  const data = await response.json() as OAuthTokenResponse & { error?: string }

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error}`)
  }

  return data
}

// =============================================================================
// Installation Management
// =============================================================================

export interface InstallationInfo {
  id: number
  account: {
    login: string
    id: number
    type: 'User' | 'Organization'
    avatar_url: string
  }
  permissions: Record<string, string>
  events: string[]
  suspended_at: string | null
}

/**
 * Get installation details from GitHub
 */
export async function getInstallationInfo(installationId: number | bigint): Promise<InstallationInfo> {
  const octokit = await getInstallationOctokit(installationId)

  const { data } = await octokit.rest.apps.getInstallation({
    installation_id: Number(installationId),
  })

  // Handle account which could be User or Organization
  const account = data.account as { login?: string; id: number; type?: string; avatar_url: string } | undefined

  return {
    id: data.id,
    account: {
      login: account?.login || (account as { name?: string })?.name || '',
      id: account?.id || 0,
      type: (account?.type as 'User' | 'Organization') || 'User',
      avatar_url: account?.avatar_url || '',
    },
    permissions: data.permissions as Record<string, string>,
    events: data.events || [],
    suspended_at: data.suspended_at || null,
  }
}

/**
 * List repositories accessible to an installation
 */
export async function listInstallationRepositories(installationId: number | bigint): Promise<Array<{
  id: number
  name: string
  full_name: string
  private: boolean
  default_branch: string
  owner: {
    login: string
  }
}>> {
  const octokit = await getInstallationOctokit(installationId)

  const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
    per_page: 100,
  })

  return data.repositories.map((repo: {
    id: number
    name: string
    full_name: string
    private: boolean
    default_branch?: string
    owner: { login: string }
  }) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    default_branch: repo.default_branch || 'main',
    owner: {
      login: repo.owner.login,
    },
  }))
}

// =============================================================================
// User Information
// =============================================================================

/**
 * Get GitHub user info using OAuth token
 */
export async function getGitHubUser(accessToken: string): Promise<{
  id: number
  login: string
  email: string | null
  name: string | null
  avatar_url: string
}> {
  const octokit = new Octokit({ auth: accessToken })

  const { data } = await octokit.rest.users.getAuthenticated()

  return {
    id: data.id,
    login: data.login,
    email: data.email,
    name: data.name,
    avatar_url: data.avatar_url,
  }
}

// =============================================================================
// Export Singleton
// =============================================================================

export const githubService = {
  isConfigured: isGitHubConfigured,
  getApp: getGitHubApp,
  getInstallationOctokit,
  getInstallationToken,
  getInstallationUrl,
  getOAuthUrl,
  exchangeOAuthCode,
  getInstallationInfo,
  listInstallationRepositories,
  getGitHubUser,
}
