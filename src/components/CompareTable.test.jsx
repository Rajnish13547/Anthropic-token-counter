import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CompareTable from './CompareTable.jsx'
import { PROVIDERS } from '../lib/providers.js'

const modelLabels = { anthropic: 'Claude Sonnet 5.5', openai: 'gpt-4.1', gemini: 'Gemini Flash (latest)' }
const rows = [
  { id: 'a', title: 'Word', text: 'Hello' },
  { id: 'b', title: 'Sentence', text: 'The quick brown fox' },
]
const render = (props) =>
  renderToStaticMarkup(<CompareTable rows={rows} providers={PROVIDERS} modelLabels={modelLabels} results={{}} activeIds={[]} {...props} />)

describe('CompareTable', () => {
  it('always shows a column for every provider, even with no keys', () => {
    const html = render()
    for (const p of PROVIDERS) expect(html).toContain(p.label)
    expect((html.match(/<th scope="col"/g) ?? []).length).toBe(2 + PROVIDERS.length)
    expect(html).toContain('No key')
  })

  it('shows counts only for the provider with a key; the others show a dash', () => {
    const html = render({
      activeIds: ['anthropic'],
      results: {
        a: { anthropic: { status: 'done', tokens: 11 } },
        b: { anthropic: { status: 'done', tokens: 26 } },
      },
    })
    expect(html).toContain('<strong class="count">11</strong>')
    expect(html).toContain('<strong class="count">26</strong>')
    // total row: 11 + 26 for the active provider
    expect(html).toContain('<strong class="count">37</strong>')
    // 2 rows x 2 keyless providers + 2 keyless totals = 6 dashes with the "no key" hint
    expect((html.match(/\u2014/g) ?? []).length).toBe(6)
    expect(html).not.toContain('Counting')
  })

  it('shows bare numbers (no "tokens" unit) in the cells, centered', () => {
    const html = render({ activeIds: ['gemini'], results: { a: { gemini: { status: 'done', tokens: 1 } }, b: { gemini: { status: 'done', tokens: 1234 } } } })
    expect(html).toContain('<strong class="count">1</strong>')
    expect(html).toContain('<strong class="count">1,234</strong>')
    expect(html).not.toMatch(/<small>tokens?<\/small>/)
    expect(html).toContain('class="center"')
    expect(html).toContain('token counts') // the caption explains what the numbers are
  })

  it('ignores stale results of a provider whose key was removed', () => {
    const html = render({ activeIds: [], results: { a: { openai: { status: 'done', tokens: 99 } } } })
    expect(html).not.toContain('99')
  })

  it('shows loading and per-provider errors in the right column only', () => {
    const html = render({
      activeIds: ['anthropic', 'openai'],
      results: { a: { anthropic: { status: 'loading' }, openai: { status: 'error', error: 'Invalid OpenAI API key.' } } },
    })
    expect(html).toContain('Counting')
    expect(html).toContain('Invalid OpenAI API key.')
  })
})
