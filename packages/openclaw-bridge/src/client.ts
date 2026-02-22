import type { OpenClawConfig, KanbuTaskContext, OpenClawChatResponse } from './types.js';
import { buildTaskMessage } from './context.js';

/**
 * HTTP client for the OpenClaw gateway.
 * Uses the OpenAI-compatible POST /v1/chat/completions endpoint.
 */
export class OpenClawHttpClient {
  private readonly gatewayUrl: string;
  private readonly token: string;
  private readonly defaultSessionKey: string;
  private readonly model: string;

  constructor(config: OpenClawConfig) {
    this.gatewayUrl = config.gatewayUrl.replace(/\/$/, '');
    this.token = config.token;
    this.defaultSessionKey = config.sessionKey ?? 'agent:main:main';
    this.model = config.model ?? 'openclaw:main';
  }

  /**
   * Send a message to an agent session and wait for the response.
   * @param message - The message to send
   * @param sessionKey - Session key override, e.g. "agent:main:myagent"
   */
  async send(message: string, sessionKey?: string): Promise<string> {
    const key = sessionKey ?? this.defaultSessionKey;

    let response: Response;
    try {
      response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'x-openclaw-session-key': key,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: message }],
        }),
      });
    } catch (err) {
      throw new Error(
        `OpenClaw gateway unreachable: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (response.status === 401) {
      throw new Error('OpenClaw gateway authentication failed: invalid token');
    }
    if (!response.ok) {
      throw new Error(`OpenClaw gateway error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OpenClawChatResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('OpenClaw gateway returned empty response');
    }

    return content;
  }

  /**
   * Dispatch a Kanbu task to an agent session.
   * Builds the context bundle and sends it as a structured prompt.
   * @param task - The task context to dispatch
   * @param sessionKey - Target agent session key, e.g. "agent:main:developer"
   */
  async dispatchTask(task: KanbuTaskContext, sessionKey: string): Promise<string> {
    const message = buildTaskMessage(task);
    return this.send(message, sessionKey);
  }

  /**
   * Test if the gateway is reachable and the token is valid.
   * Returns false on any error instead of throwing.
   */
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'x-openclaw-session-key': this.defaultSessionKey,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
