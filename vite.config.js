import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cspMeta } from './server/security.js'

// The CSP (shared with the production server) is injected only into production
// builds: the dev server needs inline scripts and a websocket for hot reload.
const injectCsp = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<!--csp-->',
      `<meta http-equiv="Content-Security-Policy" content="${cspMeta}" />`,
    ),
})

export default defineConfig({
  plugins: [react(), injectCsp()],
  test: { environment: 'node' },
})
