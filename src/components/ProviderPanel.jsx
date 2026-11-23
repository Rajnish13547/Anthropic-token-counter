import { useRef, useState } from 'react'
import { extractKey, readKeyFile } from '../lib/keyFile.js'

export default function ProviderPanel({ provider, value, onChange, model, onModelChange, disabled }) {
  const [visible, setVisible] = useState(false)
  const [notice, setNotice] = useState(null) // { type: 'ok' | 'error', text }
  const fileRef = useRef(null)
  const id = provider.id
  const trimmed = value.trim()
  const added = trimmed.length > 0
  const mismatch = added && !provider.looksLike(trimmed)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again; no reference is kept
    if (!file) return
    const result = await readKeyFile(file, provider.id)
    if ('key' in result) {
      onChange(result.key)
      setVisible(false) // a key loaded from a file always starts hidden
      setNotice({ type: 'ok', text: `Key loaded from ${file.name}. The file was read in your browser and not uploaded.` })
    } else {
      setNotice({ type: 'error', text: result.error })
    }
  }

  // Pasting a whole "NAME=sk-..." line keeps just the key.
  function handlePaste(e) {
    const key = extractKey(e.clipboardData.getData('text'), provider.id)
    if (!key) return
    e.preventDefault()
    onChange(key)
    setNotice(null)
  }

  return (
    <section className="card provider" aria-labelledby={`${id}-heading`}>
      <div className="provider-head">
        <h3 id={`${id}-heading`}>{provider.label}</h3>
        <span className={`pill ${added && !mismatch ? 'ok' : ''}`}>
          {!added ? 'No key' : mismatch ? 'Check key' : 'Key added'}
        </span>
      </div>

      <label className="field-label" htmlFor={`${id}-key`}>
        API key
      </label>
      <div className="key-row">
        <input
          id={`${id}-key`}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setNotice(null)
          }}
          onPaste={handlePaste}
          placeholder={provider.keyPlaceholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={mismatch ? 'true' : undefined}
        />
        <button type="button" className="btn secondary" onClick={() => setVisible((v) => !v)} aria-pressed={visible} aria-label={`${visible ? 'Hide' : 'Show'} ${provider.label} key`}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className="key-row key-actions">
        <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()} disabled={disabled}>
          Upload key file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.env,.key,text/plain"
          onChange={handleFile}
          hidden
          aria-label={`Upload a file containing your ${provider.label} key`}
        />
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            onChange('')
            setNotice(null)
          }}
          disabled={disabled || !added}
        >
          Clear
        </button>
      </div>

      {notice && (
        <p className={`help ${notice.type === 'error' ? 'err' : ''}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}
      {mismatch && (
        <p className="help warn" role="status">
          This doesn&rsquo;t look like a {provider.label} key (they start with <code>{provider.keyPrefixHint}</code>).
        </p>
      )}

      <label className="field-label" htmlFor={`${id}-model`}>
        Model
      </label>
      <select id={`${id}-model`} value={model} onChange={(e) => onModelChange(e.target.value)} disabled={disabled}>
        {provider.models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>

      <p className="help">
        <a href={provider.keysUrl} target="_blank" rel="noopener noreferrer">
          Get or manage keys
        </a>
      </p>
    </section>
  )
}
