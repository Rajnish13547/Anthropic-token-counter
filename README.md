# Anthropic Token Counter

See how many tokens Claude uses for any piece of text, using Anthropic's official [Token Counting API](https://docs.anthropic.com/en/docs/build-with-claude/token-counting).

Live app: https://anthropic-token-counter.onrender.com

Source: https://github.com/Rajnish13547/Anthropic-token-counter

## Using the app

1. **Enter your Anthropic API key.** Paste it, or click **Upload key file** and choose a `.env` or `.txt` file that contains it. Get a key at the [Anthropic Console](https://console.anthropic.com/settings/keys).
2. **Pick a model.**
3. **Count tokens:**
   - Type or paste your own text (up to 5,000 characters) and click **Count Tokens** (or press Ctrl/⌘ + Enter). You'll see the number of tokens and characters. **Clear** empties the box.
   - Or click **Count Tokens** under the predefined samples (a word, a sentence, a paragraph, code, Japanese text, emoji) to see each one's token count and a total.

Counts are for the text sent as a single user message, so they include a few tokens of message-format overhead.

## Your API key

- Your key goes **directly from your browser to `api.anthropic.com`**. There is no backend in between.
- It is held **in memory only**. It is not saved to the browser, never logged, and disappears when you refresh or close the tab. A key file you upload is read locally and is never sent anywhere.
- The page is locked down so it can only connect to `https://api.anthropic.com` (Content-Security-Policy).
- Good practice: use a dedicated key with a low spend limit, avoid shared computers, and revoke the key in the Console when you're done.

## Errors

The app shows a clear message for an empty or invalid key, a key without permission, rate limits, Anthropic outages, network problems, and key files that can't be read. A failure on one sample doesn't stop the others.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (no API key needed)
```

To serve the production build: `npm run build && npm start`.
