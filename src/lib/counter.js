// Calls a provider's token-counting endpoint from the browser.
//
// SECURITY: the user's key is placed only in a request header. It is never logged,
// stored, put in the URL or body, or included in any message shown to the user.

import { getProvider } from './providers.js'

export class ApiError extends Error {
  constructor(message, { kind = 'unknown', status } = {}) {
    super(message)
    this.name = 'ApiError'
    // kind: auth | permission | rate_limit | invalid_request | server | network | aborted | unknown
    this.kind = kind
    this.status = status
  }
}

// Errors that would affect every request to that provider, so there is no point continuing.
export const isFatal = (err) => err instanceof ApiError && ['auth', 'permission', 'aborted'].includes(err.kind)

// Provider messages are shown to the user, so drop anything that echoes the key.
function safeMessage(message, apiKey) {
  if (typeof message !== 'string' || !message) return undefined
  const cleaned = apiKey ? message.split(apiKey).join('[key hidden]') : message
  return cleaned.slice(0, 300)
}

function classify(provider, status, apiMessage) {
  const name = provider.label
  // Gemini reports a bad key as HTTP 400 INVALID_ARGUMENT rather than 401.
  const badKey =
    status === 401 || (provider.id === 'gemini' && status === 400 && /api key not valid/i.test(apiMessage ?? ''))
  if (badKey) return new ApiError(`Invalid ${name} API key. Check the key and try again.`, { kind: 'auth', status })

  switch (status) {
    case 403:
      return new ApiError(`This ${name} key is not permitted to count tokens.`, { kind: 'permission', status })
    case 400:
      return new ApiError(`Request rejected: ${apiMessage || 'invalid request.'}`, { kind: 'invalid_request', status })
    case 404:
      return new ApiError(
        apiMessage ? `Model not available: ${apiMessage}` : `Model not found or not available to this ${name} key.`,
        { kind: 'invalid_request', status },
      )
    case 413:
      return new ApiError('That text is too large to send.', { kind: 'invalid_request', status })
    case 429:
      return new ApiError(`${name} rate limit or quota reached. Wait a moment and try again.`, { kind: 'rate_limit', status })
    default:
      if (status >= 500)
        return new ApiError(`${name} is temporarily unavailable. Try again shortly.`, { kind: 'server', status })
      return new ApiError(`Unexpected response from ${name} (HTTP ${status}).`, { kind: 'unknown', status })
  }
}

async function requestOnce({ provider, apiKey, model, text, signal, fetchImpl }) {
  const { url, headers, body } = provider.buildRequest({ apiKey, model, text })
  let res
  try {
    res = await fetchImpl(url, { method: 'POST', signal, headers, body: JSON.stringify(body) })
  } catch (e) {
    if (e?.name === 'AbortError') throw new ApiError('Request cancelled.', { kind: 'aborted' })
    throw new ApiError('Network error. Check your internet connection and try again.', { kind: 'network' })
  }

  if (!res.ok) {
    let apiMessage
    try {
      apiMessage = safeMessage((await res.json())?.error?.message, apiKey)
    } catch {
      /* body was not JSON */
    }
    const err = classify(provider, res.status, apiMessage)
    err.retryAfter = Number(res.headers.get('retry-after')) || undefined
    throw err
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new ApiError(`Received an unreadable response from ${provider.label}.`)
  }
  const tokens = provider.parseTokens(data)
  if (!Number.isInteger(tokens)) throw new ApiError(`${provider.label} response did not include a token count.`)
  return tokens
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

/**
 * Count the input tokens for `text` with one provider. Retries once on rate limit / 5xx.
 * @param {{providerId: string, apiKey: string, model: string, text: string,
 *          signal?: AbortSignal, fetchImpl?: typeof fetch}} args
 * @returns {Promise<number>}
 */
export async function countTokens({ providerId, apiKey, model, text, signal, fetchImpl = (...a) => fetch(...a) }) {
  const provider = getProvider(providerId)
  if (!provider) throw new ApiError('Unknown provider.', { kind: 'invalid_request' })
  const args = { provider, apiKey, model, text, signal, fetchImpl }
  try {
    return await requestOnce(args)
  } catch (err) {
    if (!(err instanceof ApiError) || !['rate_limit', 'server'].includes(err.kind)) throw err
    await sleep(Math.min((err.retryAfter ?? 1) * 1000, 5000), signal)
    return requestOnce(args)
  }
}
