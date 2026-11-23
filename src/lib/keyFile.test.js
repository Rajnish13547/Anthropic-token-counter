import { describe, expect, it } from 'vitest'
import { MAX_KEY_FILE_BYTES, extractKey, readKeyFile } from './keyFile.js'

const ANT = 'sk-ant-api03-AbC_123-xyzABCDEFGH'
const OAI = 'sk-proj-AbC_123-xyzABCDEFGHIJKLMNOP'
const GEM = 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz012345678'
const GEM_NEW = 'AQ.Ab8RN6K-fakeKeyValue_123.abcDEF456-xyz'
const file = (content, name = 'k.env') => new File([content], name)

describe('extractKey (per provider)', () => {
  it('finds each provider key in a multi-key .env file', () => {
    const env = `# keys\nANTHROPIC_API_KEY="${ANT}"\nOPENAI_API_KEY=${OAI}\nGEMINI_API_KEY=${GEM}\n`
    expect(extractKey(env, 'anthropic')).toBe(ANT)
    expect(extractKey(env, 'openai')).toBe(OAI)
    expect(extractKey(env, 'gemini')).toBe(GEM)
  })

  it('recognises Google\u2019s newer AQ. key format (with dots)', () => {
    expect(extractKey(`GEMINI_API_KEY=${GEM_NEW}`, 'gemini')).toBe(GEM_NEW)
    expect(extractKey(GEM_NEW, 'openai')).toBeNull()
  })

  it('never takes an Anthropic key for OpenAI', () => {
    expect(extractKey(ANT, 'openai')).toBeNull()
  })

  it('handles a bare key with whitespace and CRLF', () => {
    expect(extractKey(`  ${GEM}\r\n`, 'gemini')).toBe(GEM)
  })

  it('falls back to a single custom value, but not another provider’s key', () => {
    expect(extractKey('API_KEY="custom-token-123"', 'openai')).toBe('custom-token-123')
    expect(extractKey(GEM, 'openai')).toBeNull()
  })

  it('returns null for prose, multi-line files without a key, and empty input', () => {
    expect(extractKey('hello world this is not a key', 'anthropic')).toBeNull()
    expect(extractKey('A=1\nB=2', 'gemini')).toBeNull()
    expect(extractKey('', 'openai')).toBeNull()
  })
})

describe('readKeyFile', () => {
  it('reads the right provider key from a File', async () => {
    expect(await readKeyFile(file(`OPENAI_API_KEY=${OAI}\nANTHROPIC_API_KEY=${ANT}`), 'openai')).toEqual({ key: OAI })
  })
  it('refuses oversized files', async () => {
    const r = await readKeyFile(file('a'.repeat(MAX_KEY_FILE_BYTES + 1)), 'gemini')
    expect(r.error).toMatch(/too large/)
  })
  it('names the provider when no key is found', async () => {
    expect((await readKeyFile(file('just some notes'), 'gemini')).error).toMatch(/No Google Gemini key found/)
  })
})
