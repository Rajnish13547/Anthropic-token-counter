import { useEffect, useRef, useState } from 'react'
import CompareTable from './components/CompareTable.jsx'
import CustomTextCard from './components/CustomTextCard.jsx'
import Footer from './components/Footer.jsx'
import ProviderPanel from './components/ProviderPanel.jsx'
import { MAX_CUSTOM_CHARS } from './lib/limits.js'
import { REPO_URL } from './lib/links.js'
import { PROVIDERS, defaultModelId } from './lib/providers.js'
import { runJobs } from './lib/runner.js'
import { SAMPLES } from './lib/samples.js'

const CUSTOM = 'custom'
const CONCURRENCY = 4

const fromProviders = (fn) => Object.fromEntries(PROVIDERS.map((p) => [p.id, fn(p)]))
const mapCells = (results, fn) =>
  Object.fromEntries(
    Object.entries(results).map(([rowId, cells]) => [
      rowId,
      Object.fromEntries(Object.entries(cells).map(([pid, v]) => [pid, fn(v)])),
    ]),
  )
const withoutRow = (results, rowId) => {
  const { [rowId]: _removed, ...rest } = results
  return rest
}

export default function App() {
  const [keys, setKeys] = useState(() => fromProviders(() => '')) // memory only
  const [models, setModels] = useState(() => fromProviders(defaultModelId))
  const [customText, setCustomText] = useState('')
  const [results, setResults] = useState({}) // { [rowId]: { [providerId]: { status, tokens | error } } }
  const [running, setRunning] = useState(false)
  const [banner, setBanner] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), []) // cancel on unmount

  const configured = PROVIDERS.filter((p) => keys[p.id].trim())
  const activeIds = configured.map((p) => p.id)
  const modelLabels = fromProviders((p) => p.models.find((m) => m.id === models[p.id])?.label ?? models[p.id])
  const setCell = (rowId, pid, value) =>
    setResults((r) => ({ ...r, [rowId]: { ...r[rowId], [pid]: value } }))

  function changeKey(pid, value) {
    setKeys((k) => ({ ...k, [pid]: value }))
  }

  function changeModel(pid, model) {
    setModels((m) => ({ ...m, [pid]: model }))
    // Results for this provider were produced by the previous model, so drop them.
    setResults((r) =>
      Object.fromEntries(
        Object.entries(r).map(([rowId, cells]) => {
          const { [pid]: _gone, ...rest } = cells
          return [rowId, rest]
        }),
      ),
    )
  }

  async function countRows(rows) {
    const jobs = rows.flatMap((row) =>
      configured.map((p) => ({
        rowId: row.id,
        text: row.text,
        providerId: p.id,
        apiKey: keys[p.id].trim(),
        model: models[p.id],
      })),
    )
    if (configured.length === 0) {
      setBanner({ type: 'error', text: 'Enter at least one API key above, then try again.' })
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setBanner(null)
    setRunning(true)
    setResults((r) => {
      const next = { ...r }
      for (const j of jobs) next[j.rowId] = { ...next[j.rowId], [j.providerId]: { status: 'loading' } }
      return next
    })

    await runJobs({ jobs, concurrency: CONCURRENCY, signal: controller.signal, onResult: setCell })

    // Anything that never ran (cancelled) goes back to idle.
    setResults((r) => mapCells(r, (v) => (v.status === 'loading' ? { status: 'idle' } : v)))
    if (controller.signal.aborted) setBanner({ type: 'info', text: 'Counting cancelled.' })
    setRunning(false)
    abortRef.current = null
  }

  const canCountCustom = customText.trim().length > 0 && customText.length <= MAX_CUSTOM_CHARS && !running
  const hasCustomResults = Boolean(results[CUSTOM])

  return (
    <main className="container">
      <header>
        <h1>Multi-LLM Token Counter</h1>
        <p className="subtitle">
          Compare how many tokens Claude, GPT and Gemini use for the same text, using each provider&rsquo;s official
          token counting API.
          {REPO_URL && (
            <>
              {' '}
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                GitHub repository
              </a>
              .
            </>
          )}
        </p>
      </header>

      <section aria-labelledby="keys-heading">
        <h2 id="keys-heading" className="section-title">
          1. Enter your API keys
        </h2>
        <p className="section-note">
          Add a key for each provider you want to compare. Providers without a key show a dash in the results. Keys stay in
          this tab&rsquo;s memory and are sent only to that provider.
        </p>
        <div className="providers">
          {PROVIDERS.map((p) => (
            <ProviderPanel
              key={p.id}
              provider={p}
              value={keys[p.id]}
              onChange={(v) => changeKey(p.id, v)}
              model={models[p.id]}
              onModelChange={(m) => changeModel(p.id, m)}
              disabled={running}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="count-heading">
        <h2 id="count-heading" className="section-title">
          2. Count tokens
        </h2>

        {banner && (
          <div className={`banner ${banner.type}`} role={banner.type === 'error' ? 'alert' : 'status'}>
            {banner.text}
          </div>
        )}

        <CustomTextCard
          text={customText}
          onTextChange={(v) => {
            setCustomText(v)
            if (!running) setResults((r) => withoutRow(r, CUSTOM))
          }}
          onCount={() => countRows([{ id: CUSTOM, text: customText }])}
          onClear={() => {
            setCustomText('')
            setResults((r) => withoutRow(r, CUSTOM))
          }}
          canCount={canCountCustom}
          hasResults={hasCustomResults}
          providers={PROVIDERS}
          activeIds={activeIds}
          modelLabels={modelLabels}
          results={results}
          running={running}
        />

        <section className="card" aria-labelledby="samples-heading">
          <div className="card-head">
            <h3 id="samples-heading">Predefined samples</h3>
            {running ? (
              <button type="button" className="btn secondary" onClick={() => abortRef.current?.abort()}>
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className="btn primary"
                onClick={() => countRows(SAMPLES.map((s) => ({ id: s.id, text: s.text })))}
              >
                Count Tokens
              </button>
            )}
          </div>
          <CompareTable
            rows={SAMPLES.map((s) => ({ id: s.id, title: s.label, text: s.text }))}
            providers={PROVIDERS}
            activeIds={activeIds}
            modelLabels={modelLabels}
            results={results}
          />
        </section>
      </section>

      <Footer />
    </main>
  )
}
