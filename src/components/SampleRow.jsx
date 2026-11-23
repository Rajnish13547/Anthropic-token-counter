import { charCount } from '../lib/limits.js'

const fmt = new Intl.NumberFormat()

export default function SampleRow({ sample, result }) {
  const { status = 'idle', tokens, error } = result ?? {}
  return (
    <li className="sample" data-status={status}>
      <div className="sample-main">
        <span className="sample-label">{sample.label}</span>
        <pre className="sample-text">{sample.text}</pre>
        <span className="sample-meta">{charCount(sample.text)} characters</span>
      </div>
      <div className="sample-result" aria-live="polite">
        {status === 'idle' && <span className="muted">&mdash;</span>}
        {status === 'loading' && (
          <span className="loading">
            <span className="spinner" aria-hidden="true" />
            Counting&hellip;
          </span>
        )}
        {status === 'done' && (
          <span className="tokens">
            <strong>{fmt.format(tokens)}</strong>
            <small>{tokens === 1 ? 'token' : 'tokens'}</small>
          </span>
        )}
        {status === 'error' && <span className="row-error">{error}</span>}
      </div>
    </li>
  )
}
