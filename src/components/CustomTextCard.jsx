import { useEffect, useRef, useState } from 'react'
import { ApiError, countTokens } from '../lib/anthropic.js'
import { MAX_CUSTOM_CHARS, charCount } from '../lib/limits.js'

const fmt = new Intl.NumberFormat()

export default function CustomTextCard({ apiKey, model }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState({ status: 'idle' })
  const abortRef = useRef(null)
  const inputRef = useRef(null)

  const cancel = () => abortRef.current?.abort()
  useEffect(() => cancel, []) // abort on unmount

  // A result belongs to one (text, model) pair; drop it when either changes.
  const resetResult = () => {
    cancel()
    setResult({ status: 'idle' })
  }
  useEffect(resetResult, [model])

  const chars = charCount(text)
  const tooLong = chars > MAX_CUSTOM_CHARS
  const loading = result.status === 'loading'
  const canCount = apiKey.trim().length > 0 && text.trim().length > 0 && !tooLong && !loading

  async function handleCount() {
    if (!canCount) return
    cancel()
    const controller = new AbortController()
    abortRef.current = controller
    setResult({ status: 'loading' })
    try {
      const tokens = await countTokens({ apiKey: apiKey.trim(), text, model, signal: controller.signal })
      setResult({ status: 'done', tokens, chars: charCount(text) })
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'aborted') return
      setResult({
        status: 'error',
        error: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      })
    }
  }

  function handleClear() {
    resetResult()
    setText('')
    inputRef.current?.focus()
  }

  return (
    <section className="card" aria-labelledby="custom-heading">
      <h2 id="custom-heading">Try your own text</h2>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (result.status !== 'idle') resetResult()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCount()
        }}
        placeholder="Type or paste any text here…"
        rows={5}
        aria-label="Custom text to count tokens for"
        aria-describedby="custom-help"
        aria-invalid={tooLong ? 'true' : undefined}
      />
      <div className="custom-meta">
        <span id="custom-help" className={tooLong ? 'over' : undefined}>
          {fmt.format(chars)} / {fmt.format(MAX_CUSTOM_CHARS)} characters
        </span>
        <span className="muted">Ctrl/&#8984; + Enter to count</span>
      </div>

      <div className="actions">
        <button type="button" className="btn primary" onClick={handleCount} disabled={!canCount}>
          Count Tokens
        </button>
        <button type="button" className="btn secondary" onClick={handleClear} disabled={!text && result.status === 'idle'}>
          Clear
        </button>
        <div className="custom-result" aria-live="polite">
          {loading && (
            <span className="loading">
              <span className="spinner" aria-hidden="true" />
              Counting&hellip;
            </span>
          )}
          {result.status === 'done' && (
            <span className="tokens inline">
              <strong>{fmt.format(result.tokens)}</strong>
              <small>{result.tokens === 1 ? 'token' : 'tokens'}</small>
              <small>&middot; {fmt.format(result.chars)} {result.chars === 1 ? 'character' : 'characters'}</small>
            </span>
          )}
        </div>
      </div>

      {tooLong && (
        <div className="banner error" role="alert">
          That&rsquo;s {fmt.format(chars - MAX_CUSTOM_CHARS)} characters over the {fmt.format(MAX_CUSTOM_CHARS)}-character limit.
        </div>
      )}
      {result.status === 'error' && (
        <div className="banner error" role="alert">
          {result.error}
        </div>
      )}
    </section>
  )
}
