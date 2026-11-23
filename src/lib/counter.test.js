import { describe, expect, it, vi } from 'vitest'
import { ApiError, countTokens, isFatal } from './counter.js'
import { PROVIDERS, getProvider } from './providers.js'

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

const KEYS = {
  anthropic: 'sk-ant-api03-test-secret-value',
  openai: 'sk-proj-test-secret-value-123456',
  gemini: 'AIzaSyTestSecretValue0000000000000000000',
}
const MODEL = { anthropic: 'claude-sonnet-5-5', openai: 'gpt-4o', gemini: 'gemini-2.5-flash' }

describe('provider request shapes', () => {
  it('Anthropic: count_tokens endpoint, x-api-key header, input_tokens', () => {
    const { url, headers, body } = getProvider('anthropic').buildRequest({ apiKey: KEYS.anthropic, model: MODEL.anthropic, text: 'Hi' })
    expect(url).toBe('https://api.anthropic.com/v1/messages/count_tokens')
    expect(headers['x-api-key']).toBe(KEYS.anthropic)
    expect(headers['anthropic-version']).toBe('2023-06-01')
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(body).toEqual({ model: MODEL.anthropic, messages: [{ role: 'user', content: 'Hi' }] })
    expect(getProvider('anthropic').parseTokens({ input_tokens: 7 })).toBe(7)
  })

  it('OpenAI: responses/input_tokens endpoint, bearer auth, input_tokens', () => {
    const { url, headers, body } = getProvider('openai').buildRequest({ apiKey: KEYS.openai, model: MODEL.openai, text: 'Hi' })
    expect(url).toBe('https://api.openai.com/v1/responses/input_tokens')
    expect(headers.authorization).toBe(`Bearer ${KEYS.openai}`)
    expect(body).toEqual({ model: 'gpt-4o', input: 'Hi' })
    expect(getProvider('openai').parseTokens({ input_tokens: 9 })).toBe(9)
  })

  it('Gemini: countTokens endpoint with the model in the path, x-goog-api-key, totalTokens', () => {
    const { url, headers, body } = getProvider('gemini').buildRequest({ apiKey: KEYS.gemini, model: MODEL.gemini, text: 'Hi' })
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:countTokens')
    expect(headers['x-goog-api-key']).toBe(KEYS.gemini)
    expect(body).toEqual({ contents: [{ parts: [{ text: 'Hi' }] }] })
    expect(getProvider('gemini').parseTokens({ totalTokens: 5 })).toBe(5)
  })

  it('no request body ever contains a key', () => {
    for (const p of PROVIDERS) {
      const { body, url } = p.buildRequest({ apiKey: KEYS[p.id], model: MODEL[p.id], text: 'Hi' })
      expect(JSON.stringify(body)).not.toContain(KEYS[p.id])
      expect(url).not.toContain(KEYS[p.id])
    }
  })
})

describe('countTokens', () => {
  for (const p of PROVIDERS) {
    it(`${p.label}: returns the parsed count`, async () => {
      const reply = p.id === 'gemini' ? { totalTokens: 11 } : { input_tokens: 11 }
      const fetchImpl = vi.fn().mockResolvedValue(json(200, reply))
      await expect(countTokens({ providerId: p.id, apiKey: KEYS[p.id], model: MODEL[p.id], text: 'Hi', fetchImpl })).resolves.toBe(11)
      expect(fetchImpl.mock.calls[0][0]).toMatch(new RegExp('^' + p.origin))
    })
  }

  it('maps 401 to a fatal auth error that never contains the key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(401, { error: { message: `bad ${KEYS.openai}` } }))
    const err = await countTokens({ providerId: 'openai', apiKey: KEYS.openai, model: 'gpt-4o', text: 'x', fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('auth')
    expect(isFatal(err)).toBe(true)
    expect(err.message).toMatch(/Invalid OpenAI API key/)
    expect(err.message).not.toContain(KEYS.openai)
  })

  it('treats Gemini "API key not valid" (HTTP 400) as an auth error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }))
    const err = await countTokens({ providerId: 'gemini', apiKey: KEYS.gemini, model: 'gemini-2.5-flash', text: 'x', fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('auth')
    expect(err.message).toMatch(/Invalid Google Gemini API key/)
  })

  it('still reports other Gemini 400s as invalid requests', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(400, { error: { message: 'bad contents' } }))
    const err = await countTokens({ providerId: 'gemini', apiKey: KEYS.gemini, model: 'gemini-2.5-flash', text: 'x', fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('invalid_request')
    expect(isFatal(err)).toBe(false)
  })

  it('keeps the provider\u2019s explanation when a model is unavailable (404)', async () => {
    const msg = 'This model models/gemini-2.5-pro is no longer available to new users.'
    const fetchImpl = vi.fn().mockResolvedValue(json(404, { error: { message: msg } }))
    const err = await countTokens({ providerId: 'gemini', apiKey: KEYS.gemini, model: 'gemini-2.5-pro', text: 'x', fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('invalid_request')
    expect(err.message).toContain('no longer available to new users')
    expect(isFatal(err)).toBe(false)
  })

  it('maps 403 to a fatal permission error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(403, {}))
    const err = await countTokens({ providerId: 'anthropic', apiKey: KEYS.anthropic, model: 'claude-sonnet-5-5', text: 'x', fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('permission')
    expect(isFatal(err)).toBe(true)
  })

  it('reports network failures as non-fatal', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const err = await countTokens({ providerId: 'openai', apiKey: KEYS.openai, model: 'gpt-4o', text: 'x', fetchImpl }).catch((e) => e)
    expect(err.kind).toBe('network')
    expect(isFatal(err)).toBe(false)
  })

  it('retries once on 429, then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(429, {}, { 'retry-after': '0' }))
      .mockResolvedValueOnce(json(200, { input_tokens: 4 }))
    await expect(countTokens({ providerId: 'openai', apiKey: KEYS.openai, model: 'gpt-4o', text: 'x', fetchImpl })).resolves.toBe(4)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('rejects a malformed success body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { nope: true }))
    await expect(countTokens({ providerId: 'gemini', apiKey: KEYS.gemini, model: 'gemini-2.5-flash', text: 'x', fetchImpl })).rejects.toThrow(/token count/)
  })

  it('maps aborts to a fatal aborted error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }))
    const err = await countTokens({ providerId: 'anthropic', apiKey: KEYS.anthropic, model: 'claude-sonnet-5-5', text: 'x', fetchImpl }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.kind).toBe('aborted')
    expect(isFatal(err)).toBe(true)
  })
})
