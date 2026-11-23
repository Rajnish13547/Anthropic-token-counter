import { describe, expect, it } from 'vitest'
import { MAX_KEY_FILE_BYTES, extractKey, readKeyFile } from './keyFile.js'

const KEY = 'sk-ant-api03-AbC_123-xyzABCDEFGH'
const file = (content) => new File([content], 'k.env')

describe('extractKey', () => {
  it('finds a key in a .env file with other lines, comments and quotes', () => {
    expect(extractKey(`# my keys\nOTHER=1\nANTHROPIC_API_KEY="${KEY}"\n`)).toBe(KEY)
  })
  it('handles a bare key with whitespace and CRLF', () => {
    expect(extractKey(`  ${KEY}\r\n`)).toBe(KEY)
  })
  it('falls back to a single-token file and strips NAME= and quotes', () => {
    expect(extractKey('API_KEY="custom-token-123"')).toBe('custom-token-123')
  })
  it('returns null for prose or multi-line files without a key', () => {
    expect(extractKey('hello world this is not a key')).toBeNull()
    expect(extractKey('A=1\nB=2')).toBeNull()
    expect(extractKey('')).toBeNull()
  })
})

describe('readKeyFile', () => {
  it('reads a key from a File', async () => {
    expect(await readKeyFile(file(`KEY=${KEY}`))).toEqual({ key: KEY })
  })
  it('refuses oversized files', async () => {
    const r = await readKeyFile(file('a'.repeat(MAX_KEY_FILE_BYTES + 1)))
    expect(r.error).toMatch(/too large/)
  })
  it('reports when no key is found', async () => {
    expect((await readKeyFile(file('just some notes here'))).error).toMatch(/No API key found/)
  })
})
