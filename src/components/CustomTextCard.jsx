import { useRef } from 'react'
import CompareTable from './CompareTable.jsx'
import { MAX_CUSTOM_CHARS, charCount } from '../lib/limits.js'

const fmt = new Intl.NumberFormat()

export default function CustomTextCard({ text, onTextChange, onCount, onClear, canCount, hasResults, providers, activeIds, modelLabels, results, running }) {
  const inputRef = useRef(null)
  const chars = charCount(text)
  const tooLong = chars > MAX_CUSTOM_CHARS

  return (
    <section className="card" aria-labelledby="custom-heading">
      <div className="card-head">
        <h3 id="custom-heading">Your own text</h3>
      </div>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canCount) onCount()
        }}
        placeholder="Type or paste any text here…"
        rows={4}
        aria-label="Custom text to count tokens for"
        aria-describedby="custom-count"
        aria-invalid={tooLong ? 'true' : undefined}
        disabled={running}
      />
      <div className="custom-meta">
        <span id="custom-count" className={tooLong ? 'over' : undefined}>
          {fmt.format(chars)} / {fmt.format(MAX_CUSTOM_CHARS)} characters
        </span>
        <span className="muted">Ctrl/&#8984; + Enter to count</span>
      </div>
      <div className="actions">
        <button type="button" className="btn primary" onClick={onCount} disabled={!canCount}>
          Count Tokens
        </button>
        <button type="button" className="btn secondary" onClick={onClear} disabled={running || (!text && !hasResults)}>
          Clear
        </button>
      </div>
      {tooLong && (
        <div className="banner error" role="alert">
          That&rsquo;s {fmt.format(chars - MAX_CUSTOM_CHARS)} characters over the {fmt.format(MAX_CUSTOM_CHARS)}-character limit.
        </div>
      )}
      {hasResults && (
        <div className="result-block">
          <CompareTable
            rows={[{ id: 'custom', title: 'Your text', text }]}
            providers={providers}
            activeIds={activeIds}
            modelLabels={modelLabels}
            results={results}
            clamp
          />
        </div>
      )}
    </section>
  )
}
