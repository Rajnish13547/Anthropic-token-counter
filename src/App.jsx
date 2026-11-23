import { useEffect, useMemo, useRef, useState } from 'react'
import ApiKeyInput from './components/ApiKeyInput.jsx'
import Footer from './components/Footer.jsx'
import CustomTextCard from './components/CustomTextCard.jsx'
import SampleRow from './components/SampleRow.jsx'
import { ApiError, countTokens, isFatal } from './lib/anthropic.js'
import { DOCS_URL } from './lib/links.js'
import { DEFAULT_MODEL, MODELS } from './lib/models.js'
import { runPool } from './lib/pool.js'
import { SAMPLES } from './lib/samples.js'

const CONCURRENCY = 3

export default function App() {
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [apiKey, setApiKey] = useState('') // memory only: never persisted
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(false)
  const [banner, setBanner] = useState(null)
  const abortRef = useRef(null)

  // Cancel any in-flight requests if the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), [])


  const setResult = (id, value) => setResults((r) => ({ ...r, [id]: value }))

  const total = useMemo(
    () => Object.values(results).reduce((sum, r) => sum + (r.status === 'done' ? r.tokens : 0), 0),
    [results],
  )
  const doneCount = Object.values(results).filter((r) => r.status === 'done').length

  async function handleCount() {
    const key = apiKey.trim()
    if (!key) return setBanner({ type: 'error', text: 'Enter your Anthropic API key first.' })

    const controller = new AbortController()
    abortRef.current = controller
    setBanner(null)
    setRunning(true)
    setResults(Object.fromEntries(SAMPLES.map((s) => [s.id, { status: 'loading' }])))

    let fatal = null
    await runPool(
      SAMPLES,
      CONCURRENCY,
      async (sample) => {
        try {
          const tokens = await countTokens({ apiKey: key, text: sample.text, model, signal: controller.signal })
          setResult(sample.id, { status: 'done', tokens })
        } catch (err) {
          if (isFatal(err)) {
            fatal ??= err
            controller.abort()
          }
          if (err instanceof ApiError && err.kind === 'aborted') return
          setResult(sample.id, {
            status: 'error',
            error: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
          })
        }
      },
      controller.signal,
    )

    // Anything that never ran (cancelled / stopped after a fatal error) goes back to idle.
    setResults((r) =>
      Object.fromEntries(Object.entries(r).map(([id, v]) => [id, v.status === 'loading' ? { status: 'idle' } : v])),
    )
    if (fatal && fatal.kind !== 'aborted') setBanner({ type: 'error', text: fatal.message })
    else if (controller.signal.aborted) setBanner({ type: 'info', text: 'Counting cancelled.' })
    setRunning(false)
    abortRef.current = null
  }

  return (
    <main className="container">
      <header>
        <h1>Anthropic Token Counter</h1>
        <p className="subtitle">
          See how many tokens Claude uses for different kinds of text, using Anthropic&rsquo;s official{' '}
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Token Counting API
          </a>
          .
        </p>
      </header>

      <ApiKeyInput value={apiKey} onChange={setApiKey} disabled={running} />

      <div className="toolbar">
        <label className="model">
          <span>Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={running}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <CustomTextCard apiKey={apiKey} model={model} />

      <section className="card" aria-labelledby="samples-heading">
        <h2 id="samples-heading">Predefined samples</h2>

        <ul className="samples">
          {SAMPLES.map((s) => (
            <SampleRow key={s.id} sample={s} result={results[s.id]} />
          ))}
        </ul>

        <div className="actions">
          {running ? (
            <button type="button" className="btn secondary" onClick={() => abortRef.current?.abort()}>
              Cancel
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={handleCount} disabled={!apiKey.trim()}>
              Count Tokens
            </button>
          )}
          {doneCount > 0 && (
            <span className="total">
              Total: <strong>{total.toLocaleString()}</strong> tokens across {doneCount} sample
              {doneCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {banner && (
          <div className={`banner ${banner.type}`} role={banner.type === 'error' ? 'alert' : 'status'}>
            {banner.text}
          </div>
        )}
        <p className="help">
          Counts reflect each sample sent as a single user message, so they include a few tokens of
          message-format overhead.
        </p>
      </section>
      <Footer />
    </main>
  )
}
