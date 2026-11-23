import { charCount } from '../lib/limits.js'

const fmt = new Intl.NumberFormat()

function Cell({ result, active }) {
  // A provider without a key never gets a count: show a dash.
  if (!active)
    return (
      <span className="muted" title="No API key entered for this provider">
        &mdash;
      </span>
    )
  const status = result?.status ?? 'idle'
  if (status === 'loading')
    return (
      <span className="loading">
        <span className="spinner" aria-hidden="true" />
        Counting&hellip;
      </span>
    )
  if (status === 'done')
    return (
      <strong className="count">{fmt.format(result.tokens)}</strong>
    )
  if (status === 'error')
    return (
      <span className="row-error" title={result.error}>
        {result.error}
      </span>
    )
  return <span className="muted">&mdash;</span>
}

/**
 * One row per text, one column per provider (all providers are always shown).
 * Providers without a key (not in `activeIds`) show a dash instead of a count.
 * rows: [{ id, title, text }]   results: { [rowId]: { [providerId]: result } }
 * `modelLabels` maps providerId -> label of the selected model.
 */
export default function CompareTable({ rows, providers, activeIds, modelLabels, results, clamp = false }) {
  const isActive = (pid) => activeIds.includes(pid)
  const done = (rowId, pid) => isActive(pid) && results[rowId]?.[pid]?.status === 'done'
  const totals = providers.map((p) =>
    rows.reduce((sum, row) => sum + (done(row.id, p.id) ? results[row.id][p.id].tokens : 0), 0),
  )
  const showTotals = rows.length > 1 && providers.some((p) => rows.some((r) => done(r.id, p.id)))

  return (
    <div className="table-wrap">
      <table className="compare">
        <caption>Numbers in the provider columns are token counts.</caption>
        <thead>
          <tr>
            <th scope="col">Text</th>
            <th scope="col" className="center">Characters</th>
            {providers.map((p) => (
              <th scope="col" key={p.id} className={`center ${isActive(p.id) ? '' : 'inactive'}`}>
                <span className="th-provider">{p.label}</span>
                <span className="th-model">
                  {isActive(p.id) ? modelLabels[p.id] : 'No key'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="text-cell">
                {row.title && <div className="sample-label">{row.title}</div>}
                <pre className={`sample-text ${clamp ? 'clamp' : ''}`}>{row.text}</pre>
              </td>
              <td className="center muted">{charCount(row.text)}</td>
              {providers.map((p) => (
                <td key={p.id} className="center">
                  <Cell result={results[row.id]?.[p.id]} active={isActive(p.id)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {showTotals && (
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total
              </th>
              {totals.map((t, i) => (
                <td key={providers[i].id} className="center">
                  {isActive(providers[i].id) ? (
                    <strong className="count">{fmt.format(t)}</strong>
                  ) : (
                    <span className="muted">&mdash;</span>
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
