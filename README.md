# Anthropic Token Counter

A React app that shows how many tokens a set of predefined text samples (words, sentences, a paragraph, code, Japanese, emoji) uses, via Anthropic's official [Token Counting API](https://docs.anthropic.com/en/docs/build-with-claude/token-counting).

Each user enters **their own** Anthropic API key. The key goes straight from the browser to `api.anthropic.com`; there is **no backend**, so the app's host never sees it.

## How the key is handled

```
Browser (React)  --HTTPS, x-api-key header-->  api.anthropic.com
```

- **Two ways to enter it:** paste it, or click **Upload key file** and choose a `.env` / `.txt` file that contains it. The file is read locally in your browser (never uploaded), only the key is extracted, and no reference to the file is kept. Pasting a whole `ANTHROPIC_API_KEY=sk-ant-...` line works too.
- The key lives only in React state (memory). It is **not** written to `localStorage`, `sessionStorage`, cookies or IndexedDB, and is gone on refresh or tab close.
- It is **never hardcoded, never logged**, and never included in error messages. It is sent only in a request header, never in a URL or body.
- The production build's Content-Security-Policy only allows connections to `https://api.anthropic.com` (plus `no-referrer`), so scripts on the page can't send the key anywhere else.
- The key field is a password input with autocomplete/spellcheck off, plus Show/Hide and Clear.
- **Key hygiene (the UI reminds users):** use a dedicated key with a low spend limit, avoid shared computers, and revoke it in the [Anthropic Console](https://console.anthropic.com/settings/keys) when finished.
- **Honest limits:** a key typed into any web page can in principle be read by malicious browser extensions or compromised page scripts. That's why the hygiene steps matter. A production service for other people should keep the key on a backend instead.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:5173
```

Open the page and paste (or upload) a key from <https://console.anthropic.com/settings/keys>. No `.env` file is needed.

```bash
npm test         # unit tests (Anthropic is mocked; no key needed)
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

## Deploy to Render (Web Service)

1. Push to GitHub (`.env` is git-ignored; `git status` should not list it).
2. In your Render **Web Service** settings:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/healthz`
   - **Environment variables:** none needed. Render sets `PORT` for you.
3. Deploy. `npm start` runs `server/static.js`, a tiny dependency-free server that only serves the built files from `dist/`. It never touches API keys.

### Only Anthropic's API is allowed

The server sends a strict `Content-Security-Policy` header on every response (also embedded as a `<meta>` tag in the built page):

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;
connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none';
form-action 'none'; frame-ancestors 'none'
```

`connect-src` means the browser will refuse any request from the page to anything except `https://api.anthropic.com`, so even injected script can't send a key elsewhere. `script-src 'self'` also blocks third-party and inline scripts. Other headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Strict-Transport-Security`. The policy lives in `server/security.js`.

Source: https://github.com/Rajnish13547/Anthropic-token-counter (also linked in the page footer).

## Using the app

Enter your API key (paste or upload), pick a model, then either:

- **Try your own text:** type or paste into the text box (up to 5,000 characters) and click **Count Tokens** (or press Ctrl/⌘ + Enter). The result shows the token count and the character count. **Clear** empties the box and the result.
- **Predefined samples:** click **Count Tokens**. Each sample shows its token count with a loading state while it runs, plus a total. Counts are for each sample sent as one user message, so they include a few tokens of message-format overhead. Edit `src/lib/samples.js` to change the samples.

## Error handling

| Situation | What the user sees |
| --- | --- |
| Empty key | Message; nothing is sent |
| Key file with no key / too large / unreadable | Message under the key field |
| Invalid key (401) | "Invalid API key"; remaining requests stop |
| Key lacks permission (403) | Permission message; remaining requests stop |
| Bad model / request (400, 404) | The API's message on the affected row |
| Rate limit (429) | One automatic retry, then a per-row message |
| Anthropic 5xx | One automatic retry, then a per-row message |
| Offline / network failure | Network error message |
| User clicks Cancel | In-flight requests abort; rows return to idle |

One sample failing doesn't stop the others, except for key-level errors, which would fail every request.

## Project structure

```
src/
  App.jsx                       page state, count workflow, cancel/abort
  components/ApiKeyInput.jsx    key field: paste or upload a key file
  components/CustomTextCard.jsx text box, Count Tokens / Clear buttons
  components/SampleRow.jsx      one sample with loading / result / error states
  components/Footer.jsx         API credit + GitHub link
  lib/anthropic.js              Token Counting API client + error mapping
  lib/keyFile.js                extracts a key from pasted text / an uploaded file
  lib/models.js, samples.js, limits.js, pool.js, links.js
server/
  static.js                     tiny static file server for dist/ (npm start)
  security.js                   CSP + security headers (Anthropic-only connect-src)
```
