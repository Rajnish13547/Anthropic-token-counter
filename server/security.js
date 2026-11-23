// Shared security policy. The only external origin the page may talk to is
// Anthropic's API, so even a compromised script can't send a key anywhere else.
export const ANTHROPIC_ORIGIN = 'https://api.anthropic.com'

const directives = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  `connect-src ${ANTHROPIC_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
]

// <meta> CSP cannot contain frame-ancestors, so the header version adds it.
export const cspMeta = directives.join('; ')
export const cspHeader = [...directives, "frame-ancestors 'none'"].join('; ')

export const securityHeaders = {
  'Content-Security-Policy': cspHeader,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}
