// Browser client for Anthropic's Token Counting API.
// Docs: https://docs.anthropic.com/en/docs/build-with-claude/token-counting
//
// SECURITY: the key goes straight from the browser to api.anthropic.com. There is
// no backend in between. It is only ever placed in the request header: never logged,
// stored, or included in error messages.

export const API_URL = 'https://api.anthropic.com/v1/messages/count_tokens'
export const API_VERSION = '2023-06-01'

export class ApiError extends Error {
  constructor(message, { kind = 'unknown', status } = {}) {
    super(message)
    this.name = 'ApiError'
    // kind: auth | permission | rate_limit | invalid_request | server | network | aborted | unknown
    this.kind = kind
    this.status = status
  }
}

// Errors that would affect every request, so there is no point continuing.
export const isFatal = (err) => err instanceof ApiError && ['auth', 'permission', 'aborted'].includes(err.kind)

function classify(status, apiMessage) {
  switch (status) {
    case 401:
      return new ApiError('Invalid API key. Check the key and try again.', { kind: 'auth', status })
    case 403:
      return new ApiError('This API key is not permitted to use the token counting API.', { kind: 'permission', status })
    case 400:
      return new ApiError(`Request rejected: ${apiMessage || 'invalid request.'}`, { kind: 'invalid_request', status })
    case 404:
      return new ApiError('Model not found or not available to this API key.', { kind: 'invalid_request', status })
    case 413:
      return new ApiError('That text is too large to send.', { kind: 'invalid_request', status })
    case 429:
      return new ApiError('Rate limited by Anthropic. Wait a moment and try again.', { kind: 'rate_limit', status })
    default:
      if (status >= 500)
        return new ApiError('Anthropic API is temporarily unavailable. Try again shortly.', { kind: 'server', status })
      return new ApiError(`Unexpected response from Anthropic (HTTP ${status}).`, { kind: 'unknown', status })
  }
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new ApiError('Request cancelled.', { kind: 'aborted' }))
      },
      { once: true },
    )
  })

async function requestOnce({ apiKey, model, text, signal, fetchImpl }) {
  let res
  try {
    res = await fetchImpl(API_URL, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        // Required by Anthropic for calls made directly from a browser (CORS).
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: text }] }),
    })
  } catch (e) {
    if (e?.name === 'AbortError') throw new ApiError('Request cancelled.', { kind: 'aborted' })
    throw new ApiError('Network error. Check your internet connection and try again.', { kind: 'network' })
  }

  if (!res.ok) {
    let apiMessage
    try {
      apiMessage = (await res.json())?.error?.message
    } catch {
      /* body was not JSON */
    }
    const err = classify(res.status, apiMessage)
    err.retryAfter = Number(res.headers.get('retry-after')) || undefined
    throw err
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new ApiError('Received an unreadable response from Anthropic.')
  }
  if (!Number.isInteger(data?.input_tokens)) throw new ApiError('Response did not include a token count.')
  return data.input_tokens
}

/** Count input tokens for `text` as one user message. Retries once on 429/5xx. */
export async function countTokens({ apiKey, model, text, signal, fetchImpl = (...a) => fetch(...a) }) {
  try {
    return await requestOnce({ apiKey, model, text, signal, fetchImpl })
  } catch (err) {
    if (!(err instanceof ApiError) || !['rate_limit', 'server'].includes(err.kind)) throw err
    await sleep(Math.min((err.retryAfter ?? 1) * 1000, 5000), signal)
    return requestOnce({ apiKey, model, text, signal, fetchImpl })
  }
}
