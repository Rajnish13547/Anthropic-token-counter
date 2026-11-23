// Pull a provider's API key out of pasted text or an uploaded file (.env, .txt, ...).
// Pure functions: nothing is stored or logged.
import { PROVIDERS, getProvider } from './providers.js'

export const MAX_KEY_FILE_BYTES = 10 * 1024 // a key file is tiny; refuse anything big

const VISIBLE_ASCII = /^[\x21-\x7e]+$/

/**
 * Find the key for `providerId` in `text`. Works for a bare key, a KEY=value line
 * inside a .env file, or a quoted value.
 * @returns {string|null}
 */
export function extractKey(text, providerId) {
  const provider = getProvider(providerId)
  const match = provider.keyPattern.exec(text)
  if (match) return match[0]

  // Fallback: a file with exactly one value line, e.g. CUSTOM_KEY="abc123".
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  if (lines.length !== 1) return null
  const value = lines[0].replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '').replace(/^["']|["']$/g, '').trim()
  if (!VISIBLE_ASCII.test(value)) return null
  // Never accept another provider's key by mistake.
  if (PROVIDERS.some((p) => p.id !== providerId && p.keyPattern.test(value))) return null
  return value
}

/**
 * Read a File locally (it is never uploaded anywhere).
 * @returns {Promise<{key: string} | {error: string}>}
 */
export async function readKeyFile(file, providerId) {
  const label = getProvider(providerId).label
  if (file.size > MAX_KEY_FILE_BYTES) return { error: 'That file is too large to be a key file.' }
  let text
  try {
    text = await file.text()
  } catch {
    return { error: 'Could not read that file.' }
  }
  const key = extractKey(text, providerId)
  return key ? { key } : { error: `No ${label} key found in that file.` }
}
