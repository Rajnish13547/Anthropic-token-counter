// Runs token-count jobs (one per text per provider) with limited concurrency.
// If a provider rejects the user's key, its remaining jobs are skipped with that
// message; the other providers keep going.
import { countTokens, isFatal, ApiError } from './counter.js'
import { runPool } from './pool.js'

/**
 * @param {{jobs: Array<{rowId: string, text: string, providerId: string, apiKey: string, model: string}>,
 *          concurrency?: number, signal: AbortSignal, fetchImpl?: typeof fetch,
 *          onResult: (rowId: string, providerId: string, result: object) => void}} args
 */
export async function runJobs({ jobs, concurrency = 4, signal, fetchImpl, onResult }) {
  const rejected = new Map() // providerId -> message

  await runPool(
    jobs,
    concurrency,
    async (job) => {
      const { rowId, providerId } = job
      if (rejected.has(providerId))
        return onResult(rowId, providerId, { status: 'error', error: rejected.get(providerId) })
      try {
        const tokens = await countTokens({ ...job, providerId, signal, fetchImpl })
        onResult(rowId, providerId, { status: 'done', tokens })
      } catch (err) {
        if (err instanceof ApiError && err.kind === 'aborted') return
        const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
        if (isFatal(err)) rejected.set(providerId, message)
        onResult(rowId, providerId, { status: 'error', error: message })
      }
    },
    signal,
  )
}
