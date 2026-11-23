import { DOCS_URL, REPO_URL } from '../lib/links.js'

export default function Footer() {
  return (
    <footer className="footer">
      <span>
        Powered by Anthropic&rsquo;s{' '}
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
          Token Counting API
        </a>
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
