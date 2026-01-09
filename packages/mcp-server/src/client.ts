/*
 * Kanbu API Client
 * Version: 1.0.0
 *
 * HTTP client for communicating with Kanbu API.
 * Uses fetch to call tRPC endpoints.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * ═══════════════════════════════════════════════════════════════════
 */

// =============================================================================
// Types
// =============================================================================

export interface ExchangeResult {
  token: string
  user: {
    id: number
    email: string
    name: string
    role: string
  }
}

export interface UserInfo {
  userId: number
  email: string
  name: string
  role: string
  machineId: string
  machineName: string | null
}

interface TrpcResponse<T> {
  result?: {
    data: T
  }
  error?: {
    message: string
    code: string
  }
}

// =============================================================================
// Kanbu Client Class
// =============================================================================

export class KanbuClient {
  /**
   * Exchange a setup code for a permanent token
   */
  async exchangeSetupCode(
    baseUrl: string,
    code: string,
    machineId: string,
    machineName: string
  ): Promise<ExchangeResult> {
    const url = `${baseUrl}/trpc/assistant.exchangeSetupCode`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code.toUpperCase(),
        machineId,
        machineName,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Failed to exchange setup code: ${response.status} ${text}`)
    }

    const data = (await response.json()) as TrpcResponse<ExchangeResult>

    if (data.error) {
      throw new Error(data.error.message || 'Failed to exchange setup code')
    }

    if (!data.result?.data) {
      throw new Error('Invalid response from server')
    }

    return data.result.data
  }

  /**
   * Validate a token and get user info
   */
  async validateToken(baseUrl: string, token: string): Promise<UserInfo> {
    const url = `${baseUrl}/trpc/assistant.validateToken?input=${encodeURIComponent(
      JSON.stringify({ token })
    )}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Token validation failed: ${response.status}`)
    }

    const data = (await response.json()) as TrpcResponse<UserInfo>

    if (data.error) {
      throw new Error(data.error.message || 'Token validation failed')
    }

    if (!data.result?.data) {
      throw new Error('Invalid response from server')
    }

    return data.result.data
  }

  /**
   * Make an authenticated API call
   */
  async call<T>(
    baseUrl: string,
    token: string,
    procedure: string,
    input?: unknown,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<T> {
    let url = `${baseUrl}/trpc/${procedure}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }

    let body: string | undefined

    if (method === 'GET' && input) {
      url += `?input=${encodeURIComponent(JSON.stringify(input))}`
    } else if (method === 'POST' && input) {
      body = JSON.stringify(input)
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`API call failed: ${response.status} ${text}`)
    }

    const data = (await response.json()) as TrpcResponse<T>

    if (data.error) {
      throw new Error(data.error.message || 'API call failed')
    }

    if (!data.result?.data) {
      throw new Error('Invalid response from server')
    }

    return data.result.data
  }
}
