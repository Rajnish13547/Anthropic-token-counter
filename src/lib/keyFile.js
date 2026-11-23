// Pull an Anthropic API key out of a pasted value or the text of an uploaded file
// (a .env file, a plain .txt, etc.). Pure functions: nothing is stored or logged.

export const MAX_KEY_FILE_BYTES = 10 * 1024 // a key file is tiny; refuse anything big

const KEY_PATTERN = /sk-ant-[A-Za-z0-9_-]{10,}/
const VISIBLE_ASCII = /^[\x21-\x7e]+$/

/** @returns {string|null} the key found in `text`, or null */
export function extractKey(text) {
  const match = text.match(KEY_PATTERN)
  if (match) return match[0]
  // Fallback: a file containing just one token, optionally quoted or "KEY=value".
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  if (lines.length !== 1) return null
  const value = lines[0].replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '').replace(/^["']|["']$/g, '').trim()
  return VISIBLE_ASCII.test(value) ? value : null
}

/**
 * Read a File object locally (it is never uploaded anywhere).
 * @returns {Promise<{key: string} | {error: string}>}
 */
export async function readKeyFile(file) {
  if (file.size > MAX_KEY_FILE_BYTES) return { error: 'That file is too large to be a key file.' }
  let text
  try {
    text = await file.text()
  } catch {
    return { error: 'Could not read that file.' }
  }
  const key = extractKey(text)
  return key ? { key } : { error: 'No API key found in that file. It should contain a key starting with sk-ant-.' }
}
