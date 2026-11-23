import { useRef, useState } from 'react'
import { extractKey, readKeyFile } from '../lib/keyFile.js'

const KEYS_URL = 'https://console.anthropic.com/settings/keys'

export default function ApiKeyInput({ value, onChange, disabled }) {
  const [visible, setVisible] = useState(false)
  const [notice, setNotice] = useState(null) // { type: 'ok' | 'error', text }
  const fileRef = useRef(null)
  const trimmed = value.trim()
  const warn = trimmed && !trimmed.startsWith('sk-ant-')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be picked again; we keep no reference to it
    if (!file) return
    const result = await readKeyFile(file)
    if ('key' in result) {
      onChange(result.key)
      setVisible(false) // a key loaded from a file always starts hidden
      setNotice({ type: 'ok', text: `Key loaded from ${file.name}. The file was read in your browser and not uploaded.` })
    } else {
      setNotice({ type: 'error', text: result.error })
    }
  }

  // Pasting a whole "ANTHROPIC_API_KEY=sk-ant-..." line (or quoted value) keeps just the key.
  function handlePaste(e) {
    const key = extractKey(e.clipboardData.getData('text'))
    if (!key) return
    e.preventDefault()
    onChange(key)
    setNotice(null)
  }

  return (
    <section className="card" aria-labelledby="key-heading">
      <h2 id="key-heading">Your Anthropic API key</h2>
      <div className="key-row">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setNotice(null)
          }}
          onPaste={handlePaste}
          placeholder="sk-ant-..."
          // Keep the key out of browser autofill/spellcheck/password-manager storage.
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
          aria-label="Anthropic API key"
          aria-describedby="key-help"
        />
        <button type="button" className="btn secondary" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>
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
          aria-label="Upload a file containing your API key"
        />
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            onChange('')
            setNotice(null)
          }}
          disabled={disabled || !value}
        >
          Clear key
        </button>
      </div>

      {notice && (
        <p className={`help ${notice.type === 'error' ? 'err' : ''}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}
      {warn && (
        <p className="help warn" role="status">
          This doesn&rsquo;t look like an Anthropic key (they start with <code>sk-ant-</code>).
        </p>
      )}
      <p id="key-help" className="help">
        Your key stays in this browser tab&rsquo;s memory and is sent only to <code>api.anthropic.com</code>. There is
        no server in between, and it is never stored or logged. It disappears when you refresh or close the tab.
      </p>
      <p className="help">
        <strong>Stay safe:</strong> use a dedicated key with a low spend limit, don&rsquo;t use a shared computer, and
        revoke the key when you&rsquo;re done in the{' '}
        <a href={KEYS_URL} target="_blank" rel="noopener noreferrer">
          Anthropic Console
        </a>
        .
      </p>
    </section>
  )
}
