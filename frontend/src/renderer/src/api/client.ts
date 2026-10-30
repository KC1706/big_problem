// Typed fetch client for the FastAPI sidecar.
// Base URL comes from the Electron main process (window.bridgeApi.getApiBase);
// in browser dev (npm run dev:web) it falls back to the dev default below.

const DEV_FALLBACK = 'http://127.0.0.1:8077'

let cachedBase: string | undefined

async function apiBase(): Promise<string> {
  if (cachedBase !== undefined) return cachedBase
  let base: string | null = null
  try {
    base = (await window.bridgeApi?.getApiBase?.()) ?? null
  } catch {
    base = null
  }
  cachedBase = base || DEV_FALLBACK
  return cachedBase
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const base = await apiBase()
  const res = await fetch(base + '/api' + path, { signal })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const base = await apiBase()
  const res = await fetch(base + '/api' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

/** Health check (not under /api). */
export async function apiHealth(): Promise<unknown> {
  const base = await apiBase()
  const res = await fetch(base + '/health')
  return res.json()
}
