import type { ResultsModel } from './results'
import type { Pre, Syn } from '@/state/store'

/**
 * Maps a stage's verified ResultsModel to the value keys the `<bridge-twin>`
 * 3D callouts read (E4). Only the stages whose callouts have a clean real
 * mapping are populated; the twin falls back to its design defaults for the
 * rest. The result is fed to the element as a JSON `data` attribute.
 */
export function twinDataFor(id: string, results: ResultsModel, pre: Pre, syn: Syn): Record<string, string> {
  const r = results as unknown as {
    big?: Array<[string, string, string]>
    checks?: Array<{ k: string; v: string; col?: string }>
    pred?: string; confS?: string; model?: string
    imp?: Array<{ k: string; v: string; w: string }>
    twin?: Record<string, string>
  }
  const bv = (label: string) => r.big?.find((x) => x[0] === label)?.[1]
  const m: Record<string, string> = {}

  if (id === 'dashboard') {
    return r.twin ?? {} // real f₁/Pₑ-per-girder/δ/UPV/condition, built in verify.ts
  } else if (id === 'analysis') {
    const v = bv('M_max'); if (v) m.M_max = v
  } else if (id === 'prestress') {
    const ratio = r.checks?.find((c) => c.k === 'Pₑ < P₀')?.v; if (ratio) m.pe_p0 = ratio
    const camber = bv('Net camber'); if (camber) m.camber = camber
    const p0 = bv('P₀')
    if (p0 && pre.n) {
      const p0num = parseFloat(p0.replace(/,/g, ''))
      if (isFinite(p0num)) m.cableF = Math.round(p0num / pre.n).toLocaleString()
    }
  } else if (id === 'baseline') {
    const modes = [bv('f₁'), bv('f₂'), bv('f₃')].filter(Boolean) as string[]
    if (modes.length) m.modes = modes.join(',')
  } else if (id === 'synthetic') {
    m.ei = '−' + Math.round(syn.sev)
    m.ext = syn.ext.toFixed(1)
    const f1 = bv('f₁'); if (f1) m.f1shift = f1
  } else if (id === 'ml') {
    if (r.pred) m.pred = r.pred
    if (r.confS) {
      const iso = r.model === 'IsoForest'
      const num = r.confS.replace('score ', '')
      if (iso) m.anom = num; else m.conf = num
    }
    const top = r.imp?.[0]
    if (top) { m.topf = top.k; m.topfv = top.v }
  }
  return m
}
