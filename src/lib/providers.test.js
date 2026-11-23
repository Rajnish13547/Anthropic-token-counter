import { describe, expect, it } from 'vitest'
import { MAX_MODELS, PROVIDERS, defaultModelId, getProvider } from './providers.js'

describe('model lists', () => {
  it('each provider has a small, de-duplicated, labelled list with the latest model first', () => {
    for (const p of PROVIDERS) {
      expect(p.models.length).toBeGreaterThan(0)
      expect(p.models.length).toBeLessThanOrEqual(MAX_MODELS)
      expect(new Set(p.models.map((m) => m.id)).size).toBe(p.models.length)
      for (const m of p.models) {
        expect(m.id).toBeTruthy()
        expect(m.label).toBeTruthy()
      }
      expect(defaultModelId(p)).toBe(p.models[0].id)
    }
  })

  it('shows plain model names, not aliases like "latest"', () => {
    for (const p of PROVIDERS) for (const m of p.models) expect(`${m.id} ${m.label}`.toLowerCase()).not.toContain('latest')
  })
})

describe('Gemini key formats', () => {
  it('accepts both the classic AIza and the newer AQ. formats', () => {
    const gem = getProvider('gemini')
    expect(gem.looksLike('AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz012345678')).toBe(true)
    expect(gem.looksLike('AQ.Ab8RN6K-fakeKeyValue_123.abcDEF456-xyz')).toBe(true)
    expect(gem.keyPattern.test('AQ.Ab8RN6K-fakeKeyValue_123.abcDEF456-xyz')).toBe(true)
    expect(gem.looksLike('sk-ant-api03-whatever')).toBe(false)
  })
})
