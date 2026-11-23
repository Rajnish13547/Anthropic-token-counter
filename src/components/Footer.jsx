import { PROVIDERS } from '../lib/providers.js'
import { REPO_URL } from '../lib/links.js'

export default function Footer() {
  return (
    <footer className="footer">
      <span>
        Token counts come from the official APIs:{' '}
        {PROVIDERS.map((p, i) => (
          <span key={p.id}>
            {i > 0 && ', '}
            <a href={p.docsUrl} target="_blank" rel="noopener noreferrer">
              {p.label}
            </a>
          </span>
        ))}
      </span>
      {REPO_URL && (
        <>
          <span aria-hidden="true">&middot;</span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            View source on GitHub
          </a>
        </>
      )}
    </footer>
  )
}
