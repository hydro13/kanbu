import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenClawHttpClient } from '../src/client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('OpenClawHttpClient', () => {
  let client: OpenClawHttpClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new OpenClawHttpClient({
      gatewayUrl: 'http://localhost:18789',
      token: 'test-token',
    });
  });

  describe('send()', () => {
    it('returns the assistant message content', async () => {
      mockFetch.mockResolvedValue(
        makeResponse({ choices: [{ message: { role: 'assistant', content: 'Hello from agent' } }] })
      );
      const result = await client.send('Hello');
      expect(result).toBe('Hello from agent');
    });

    it('uses the default session key when none provided', async () => {
      mockFetch.mockResolvedValue(
        makeResponse({ choices: [{ message: { role: 'assistant', content: 'ok' } }] })
      );
      await client.send('test');
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)['x-openclaw-session-key']).toBe(
        'agent:main:main'
      );
    });

    it('uses the provided session key override', async () => {
      mockFetch.mockResolvedValue(
        makeResponse({ choices: [{ message: { role: 'assistant', content: 'ok' } }] })
      );
      await client.send('test', 'agent:main:developer');
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)['x-openclaw-session-key']).toBe(
        'agent:main:developer'
      );
    });

    it('sends to the correct endpoint', async () => {
      mockFetch.mockResolvedValue(
        makeResponse({ choices: [{ message: { role: 'assistant', content: 'ok' } }] })
      );
      await client.send('test');
      expect(mockFetch.mock.calls[0]?.[0]).toBe('http://localhost:18789/v1/chat/completions');
    });

    it('strips trailing slash from gatewayUrl', async () => {
      const c = new OpenClawHttpClient({ gatewayUrl: 'http://localhost:18789/', token: 'tok' });
      mockFetch.mockResolvedValue(
        makeResponse({ choices: [{ message: { role: 'assistant', content: 'ok' } }] })
      );
      await c.send('test');
      expect(mockFetch.mock.calls[0]?.[0]).toBe('http://localhost:18789/v1/chat/completions');
    });

    it('throws on 401 with clear message', async () => {
      mockFetch.mockResolvedValue(makeResponse({}, 401));
      await expect(client.send('test')).rejects.toThrow('authentication failed');
    });

    it('throws on non-ok status', async () => {
      mockFetch.mockResolvedValue(makeResponse({}, 500));
      await expect(client.send('test')).rejects.toThrow('OpenClaw gateway error: 500');
    });

    it('throws when choices array is empty', async () => {
      mockFetch.mockResolvedValue(makeResponse({ choices: [] }));
      await expect(client.send('test')).rejects.toThrow('empty response');
    });

    it('throws when network fails', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(client.send('test')).rejects.toThrow('OpenClaw gateway unreachable');
    });
  });

  describe('ping()', () => {
    it('returns true when gateway responds ok', async () => {
      mockFetch.mockResolvedValue(
        makeResponse({ choices: [{ message: { role: 'assistant', content: 'pong' } }] })
      );
      expect(await client.ping()).toBe(true);
    });

    it('returns false when network fails', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
      expect(await client.ping()).toBe(false);
    });

    it('returns false on 401', async () => {
      mockFetch.mockResolvedValue(makeResponse({}, 401));
      expect(await client.ping()).toBe(false);
    });
  });
});
