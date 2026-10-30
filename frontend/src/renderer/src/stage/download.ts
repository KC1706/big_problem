/** Trigger a client-side file download (offline, no server). Used by the CSV
 *  exports; the project JSON export lives in the store (exportJSON). */
export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  try {
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch {
    /* no DOM (SSR/thumbnail capture) — no-op */
  }
}

/** Rows (array of objects) → CSV text with a header row. */
export function toCsv(rows: Array<Record<string, string | number>>, columns?: string[]): string {
  if (!rows.length) return ''
  const cols = columns ?? Object.keys(rows[0])
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c] ?? '')).join(','))].join('\n')
}
