// Registry of supported token-counting providers. Everything provider-specific
// lives here: key format, models, request shapes and how to read responses.
// Every request is sent straight from the browser to that provider.
//
// HOW TO UPDATE THE MODEL LISTS
// Each provider's `models` array is maintained by hand. List the newest model first:
// the first entry is the default and the one marked as the latest. Keep each list to
// about MAX_MODELS entries. `id` is the exact API model ID; `label` is what people see.
// Before adding a model, confirm it works with that provider's token counting endpoint.

export const MAX_MODELS = 10

export const PROVIDERS = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    keyPlaceholder: 'sk-ant-...',
    keyPrefixHint: 'sk-ant-',
    keyPattern: /sk-ant-[A-Za-z0-9_-]{10,}/,
    looksLike: (k) => k.startsWith('sk-ant-'),
    keysUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com/en/docs/build-with-claude/token-counting',
    origin: 'https://api.anthropic.com',
    models: [
      { id: 'claude-fable-5-2', label: 'Claude Fable 5.2' },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
      { id: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5' },
      { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    ],
    buildRequest: ({ apiKey, model, text }) => ({
      url: 'https://api.anthropic.com/v1/messages/count_tokens',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Required by Anthropic for calls made directly from a browser.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: { model, messages: [{ role: 'user', content: text }] },
    }),
    parseTokens: (json) => json?.input_tokens,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyPlaceholder: 'sk-proj-...',
    keyPrefixHint: 'sk-',
    keyPattern: /sk-(?!ant-)[A-Za-z0-9_-]{20,}/,
    looksLike: (k) => k.startsWith('sk-') && !k.startsWith('sk-ant-'),
    keysUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs/api-reference/responses/input-tokens',
    origin: 'https://api.openai.com',
    models: [
      { id: 'gpt-6.2-sol', label: 'GPT-6.2 Sol' },
      { id: 'gpt-6.2-astra', label: 'GPT-6.2 Astra' },
      { id: 'gpt-5.5', label: 'GPT-5.5' },
      { id: 'gpt-5.4', label: 'GPT-5.4' },
      { id: 'gpt-5', label: 'GPT-5' },
      { id: 'gpt-5-mini', label: 'GPT-5 mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'o3', label: 'o3' },
    ],
    buildRequest: ({ apiKey, model, text }) => ({
      url: 'https://api.openai.com/v1/responses/input_tokens',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: { model, input: text },
    }),
    parseTokens: (json) => json?.input_tokens,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    // Google has two key formats: classic "AIza..." and the newer "AQ.…" (contains dots).
    keyPlaceholder: 'AIza... or AQ....',
    keyPrefixHint: 'AIza or AQ.',
    keyPattern: /(?:AIza[0-9A-Za-z_-]{35,}|AQ\.[0-9A-Za-z._-]{20,})/,
    looksLike: (k) => k.startsWith('AIza') || k.startsWith('AQ.'),
    keysUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/tokens',
    origin: 'https://generativelanguage.googleapis.com',
    // Note: the Gemini 2.5 models are rejected for new accounts, so they are not listed.
    models: [
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    ],
    buildRequest: ({ apiKey, model, text }) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:countTokens`,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: { contents: [{ parts: [{ text }] }] },
    }),
    parseTokens: (json) => json?.totalTokens,
  },
]

export const getProvider = (id) => PROVIDERS.find((p) => p.id === id)
export const defaultModelId = (provider) => provider.models[0].id // the latest model
