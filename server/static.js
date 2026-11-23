// Minimal static file server for the built React app (dist/). Zero dependencies.
// It never sees or handles API keys: the browser talks to Anthropic directly.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { securityHeaders } from './security.js'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}

export function createStaticServer(root) {
  const base = path.resolve(root)

  return createServer(async (req, res) => {
    const send = (status, body, extra = {}) => {
      res.writeHead(status, { ...securityHeaders, ...extra })
      res.end(req.method === 'HEAD' ? undefined : body)
    }

    if (req.method !== 'GET' && req.method !== 'HEAD')
      return send(405, 'Method Not Allowed', { Allow: 'GET, HEAD', 'Content-Type': 'text/plain' })

    let pathname
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    } catch {
      return send(400, 'Bad Request', { 'Content-Type': 'text/plain' })
    }
    if (pathname === '/healthz') return send(200, 'ok', { 'Content-Type': 'text/plain' })
    if (pathname.includes('\0')) return send(400, 'Bad Request', { 'Content-Type': 'text/plain' })

    // Resolve inside the dist directory only (blocks ../ traversal).
    let file = path.join(base, pathname === '/' ? 'index.html' : pathname)
    if (file !== base && !file.startsWith(base + path.sep))
      return send(403, 'Forbidden', { 'Content-Type': 'text/plain' })

    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
      const body = await readFile(file)
      const ext = path.extname(file).toLowerCase()
      const hashed = pathname.startsWith('/assets/')
      send(200, body, {
        'Content-Type': TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
      })
    } catch {
      send(404, 'Not Found', { 'Content-Type': 'text/plain' })
    }
  })
}

// Run directly: `npm start`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
  createStaticServer(dist).listen(port, '0.0.0.0', () => console.log(`Serving on port ${port}`))
}
