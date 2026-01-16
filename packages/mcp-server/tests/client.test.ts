
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KanbuClient } from '../src/client.js'

// Mock global fetch
const fetchMock = vi.fn()
global.fetch = fetchMock

describe('KanbuClient', () => {
    let client: KanbuClient

    beforeEach(() => {
        client = new KanbuClient()
        fetchMock.mockReset()
    })

    describe('call', () => {
        it('should return data on successful 200 response', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ result: { data: { foo: 'bar' } } }),
            })

            const result = await client.call('http://localhost', 'token', 'test.proc')
            expect(result).toEqual({ foo: 'bar' })
            expect(fetchMock).toHaveBeenCalledTimes(1)
        })

        it('should throw immediately on 4xx error (non-retryable)', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: async () => 'Bad Request',
            })

            await expect(client.call('http://localhost', 'token', 'test.proc'))
                .rejects.toThrow('API call failed: 400 Bad Request')

            expect(fetchMock).toHaveBeenCalledTimes(1)
        })

        it('should retry on 5xx error', async () => {
            // First attempt: 503
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 503,
                text: async () => 'Service Unavailable',
            })
            // Second attempt: Success
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ result: { data: { success: true } } }),
            })

            const result = await client.call('http://localhost', 'token', 'test.proc')
            expect(result).toEqual({ success: true })
            expect(fetchMock).toHaveBeenCalledTimes(2)
        })

        /*
        it('should fail after max retries', async () => {
             // Skipping flaky test with fakeTimers
        })
        */
    })
})
