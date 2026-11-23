import { describe, expect, it, vi } from 'vitest'
import { runJobs } from './runner.js'

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('runJobs', () => {
  it('a rejected key stops only that provider; the others keep counting', async () => {
    const fetchImpl = vi.fn(async (url) =>
      url.includes('anthropic') ? json(401, { error: { message: 'nope' } }) : json(200, { input_tokens: 3, totalTokens: 3 }),
    )
    const jobs = [
      { rowId: 'a', text: 'x', providerId: 'anthropic', apiKey: 'sk-ant-bad-key-123456', model: 'claude-sonnet-5-5' },
      { rowId: 'b', text: 'x', providerId: 'openai', apiKey: 'sk-proj-good-key-1234567890', model: 'gpt-4o' },
      { rowId: 'c', text: 'x', providerId: 'anthropic', apiKey: 'sk-ant-bad-key-123456', model: 'claude-sonnet-5-5' },
    ]
    const seen = {}
    await runJobs({
      jobs,
      concurrency: 1, // deterministic order
      signal: new AbortController().signal,
      fetchImpl,
      onResult: (rowId, pid, res) => (seen[`${rowId}:${pid}`] = res),
    })
    expect(seen['a:anthropic'].status).toBe('error')
    expect(seen['b:openai']).toEqual({ status: 'done', tokens: 3 })
    expect(seen['c:anthropic'].status).toBe('error')
    expect(seen['c:anthropic'].error).toMatch(/Invalid Anthropic API key/)
    // The second Anthropic job was skipped: only three requests were not sent.
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
