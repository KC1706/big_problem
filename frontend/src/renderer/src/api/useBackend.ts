import { useEffect, useState } from 'react'

export interface Backend<T> {
  data: T | null
  loading: boolean
  error: boolean
}

/**
 * Debounced backend fetch for the preview→verified pattern. `run` is re-created
 * each render; it fires on a debounce after `deps` change, and the result is kept
 * until the next successful fetch (so the UI shows the last verified value while a
 * new one is in flight). Returns null data until the first success.
 */
export function useBackend<T>(run: () => Promise<T>, deps: ReadonlyArray<unknown>, enabled = true, debounceMs = 150): Backend<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    let cancelled = false
    setLoading(true)
    const id = setTimeout(() => {
      run()
        .then((d) => { if (!cancelled) { setData(d); setError(false); setLoading(false) } })
        .catch((e) => { if (!cancelled && e?.name !== 'AbortError') { setError(true); setLoading(false) } })
    }, debounceMs)
    return () => { cancelled = true; clearTimeout(id); ctrl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled])

  return { data, loading, error }
}
