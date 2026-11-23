# Multi-LLM Token Counter

Compare how many tokens different LLMs use for the same text. The app uses each provider's official token counting API:

- **Anthropic (Claude)**: [Token Counting API](https://docs.anthropic.com/en/docs/build-with-claude/token-counting)
- **OpenAI (GPT)**: [Input tokens API](https://platform.openai.com/docs/api-reference/responses/input-tokens)
- **Google (Gemini)**: [Count tokens](https://ai.google.dev/gemini-api/docs/tokens)

Live app: https://anthropic-token-counter.onrender.com

Source: https://github.com/Rajnish13547/Anthropic-token-counter

## Using the app

1. **Enter your API keys.** Each provider has its own box. Paste a key, or click **Upload key file** and choose a `.env` or `.txt` file that contains it. Add keys only for the providers you want to compare. Get keys from each provider's console (linked in each box).
2. **Pick a model** for each provider in its box. Each dropdown lists that provider's latest models, newest first (the first one is selected by default). Providers retire models over time, so a model may be rejected for your account; the table then shows the provider's explanation.
3. **Count tokens:**
   - **Predefined samples:** click **Count Tokens** to see every sample's token count for each provider you have a key for, with a total row.
   - **Your own text:** type or paste up to 5,000 characters and click **Count Tokens** (or press Ctrl/⌘ + Enter). Results show side by side, with the character count.

A provider without a key is left out of the results. Counts are for each text sent as a single user message, so they include a few tokens of message-format overhead. Tokenizers differ between providers, so the numbers are not directly interchangeable.

## Your API keys

- Each key goes **directly from your browser to its own provider** (`api.anthropic.com`, `api.openai.com` or `generativelanguage.googleapis.com`). There is no backend, so the app's host never sees your keys.
- Keys are held **in memory only**. They are not saved to the browser, never logged, and disappear when you refresh or close the tab. A key file you upload is read locally and never sent anywhere.
- The page only allows connections to those three provider addresses (a Content-Security-Policy).
- Good practice: use a dedicated key with a low spend limit, avoid shared computers, and revoke keys in the provider's console when you're done.
- Honest limit: a key typed into any web page could still be read by a malicious browser extension. Use a clean browser profile if that concerns you.

## Errors

The app shows a clear message for an empty or invalid key, a key without permission, rate limits or exhausted quotas, provider outages, network problems, and key files that can't be read. An invalid key stops that provider only, and the other providers keep counting. A failure on one text doesn't stop the others.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (no API keys needed)
```

To serve the production build: `npm run build && npm start`.

The model lists are maintained by hand in `src/lib/providers.js`; edit the `models` array of a provider to add or remove a model.
