import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createStaticServer } from './static.js'
import { cspHeader } from './security.js'

let server, base
beforeAll(async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dist-'))
  await mkdir(path.join(root, 'assets'))
  await writeFile(path.join(root, 'index.html'), '<h1>app</h1>')
  await writeFile(path.join(root, 'assets', 'a.js'), 'x')
  await writeFile(path.join(path.dirname(root), 'secret.txt'), 'top secret') // outside root
  server = createStaticServer(root)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => new Promise((r) => server.close(r)))

describe('static server', () => {
  it('serves index.html with the Anthropic-only CSP and security headers', async () => {
    const res = await fetch(base + '/')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<h1>app</h1>')
    const csp = res.headers.get('content-security-policy')
    expect(csp).toBe(cspHeader)
    expect(csp).toContain('connect-src https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com;')
    expect(csp).toContain("frame-ancestors 'none'")
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('strict-transport-security')).toMatch(/max-age/)
    expect(res.headers.get('cache-control')).toBe('no-cache')
  })

  it('caches hashed assets and sets content types', async () => {
    const res = await fetch(base + '/assets/a.js')
    expect(res.headers.get('content-type')).toMatch(/javascript/)
    expect(res.headers.get('cache-control')).toMatch(/immutable/)
  })

  it('blocks path traversal (plain and encoded)', async () => {
    for (const p of ['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt']) {
      const res = await fetch(base + p)
      expect([403, 404]).toContain(res.status)
      expect(await res.text()).not.toContain('top secret')
    }
  })

  it('404s unknown files, rejects non-GET, and has a health check', async () => {
    expect((await fetch(base + '/nope.js')).status).toBe(404)
    expect((await fetch(base + '/', { method: 'POST' })).status).toBe(405)
    expect((await fetch(base + '/healthz')).status).toBe(200)
  })
})
