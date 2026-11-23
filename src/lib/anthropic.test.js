import { describe, expect, it, vi } from 'vitest'
import { API_URL, ApiError, countTokens, isFatal } from './anthropic.js'

const KEY = 'sk-ant-test-secret'
const base = { apiKey: KEY, model: 'claude-sonnet-5-5', text: 'Hello' }
const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

describe('countTokens (browser)', () => {
  it('calls the documented endpoint with the key only in headers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { input_tokens: 9 }))
    await expect(countTokens({ ...base, fetchImpl })).resolves.toBe(9)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(API_URL)
    expect(init.headers['x-api-key']).toBe(KEY)
    expect(init.headers['anthropic-version']).toBe('2023-06-01')
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(init.body).not.toContain(KEY)
    expect(JSON.parse(init.body)).toEqual({ model: base.model, messages: [{ role: 'user', content: 'Hello' }] })
  })

  it('maps 401 to a fatal auth error without leaking the key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(401, { error: { message: `bad ${KEY}` } }))
    const err = await countTokens({ ...base, fetchImpl }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.kind).toBe('auth')
    expect(isFatal(err)).toBe(true)
    expect(err.message).not.toContain(KEY)
  })

  it('maps 403 to a fatal permission error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(403, {}))
    const err = await countTokens({ ...base, fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('permission')
    expect(isFatal(err)).toBe(true)
  })

  it('reports network failures as non-fatal', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const err = await countTokens({ ...base, fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('network')
    expect(isFatal(err)).toBe(false)
  })

  it('surfaces the API message for 400s', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(400, { error: { message: 'model: unknown' } }))
    const err = await countTokens({ ...base, fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('invalid_request')
    expect(err.message).toContain('model: unknown')
  })

  it('retries once on 429 then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(429, {}, { 'retry-after': '0' }))
      .mockResolvedValueOnce(json(200, { input_tokens: 4 }))
    await expect(countTokens({ ...base, fetchImpl })).resolves.toBe(4)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('rejects a malformed success body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { nope: true }))
    await expect(countTokens({ ...base, fetchImpl })).rejects.toThrow(/token count/)
  })

  it('maps aborts to a fatal aborted error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }))
    const err = await countTokens({ ...base, fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('aborted')
    expect(isFatal(err)).toBe(true)
  })
})
