// Run `worker(item)` over `items` with at most `limit` in flight.
// Stops handing out new work as soon as `signal` aborts.
export async function runPool(items, limit, worker, signal) {
  let next = 0
  const lane = async () => {
    while (next < items.length && !signal.aborted) {
      const item = items[next++]
      await worker(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
}
