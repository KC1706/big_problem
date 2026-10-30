import type { Ana, Base, Big, Row, Geom, Mon, Pre, Ins, Ndt, Syn, Feat, Ml, Mnt, Rep, MlReal, Dataset } from '@/state/store'
import { STAGES } from '@/state/store'
import { section, calcAna, calcF1, calcPre } from '@/physics/physics'
import { COL, SEVN, SUB, FEATURES, COMPS, SEC, SEC_PG, NDT_TESTS } from './data'

const GREEN = '#4fae7f', RED = '#e0442f', AMBER = '#e6893c'
const f0 = (n: number) => Math.round(n).toLocaleString()
const R = (rows: Array<[string, string]>) => rows.map(([k, v]) => ({ k, v }))

export interface KV { k: string; v: string }
export interface Check { k: string; v: string; col: string }

export interface XS {
  pts: string
  slab: { x: number; y: number; w: number; h: number }
  yb: number; ybT: number; ybS: string; cx0: number; cx1: number
  dx: number; dx0: number; dx1: number; dxT: number
  top: number; bot: number; mid: number; hS: string
  bf0: number; bf1: number; bfS: string; spT: number; spS: string
  twX: number; twS: string
}
export interface ConfigRes { kind: 'config'; big: Big[]; xs: XS; secRows: KV[]; checks: Check[] }

export interface AnaRes {
  kind: 'analysis'; big: Big[]
  pt: string; pd: string; pe: string; ps: string; posX: string; MtY: number; MtS: string
  rows: KV[]; check: Check; running: boolean; progW: string; progS: string; run: () => void
}

export interface ModeShape { d: string; k: string; f: string }
export interface BaseRes {
  kind: 'baseline'; big: Big[]
  modes: ModeShape[]; rows: KV[]; ver: string; note: string
  running: boolean; progW: string; progS: string; establish: () => void
}

export interface Peak { x: number; y: number; t: string }
export interface MonRes {
  kind: 'monitoring'; big: Big[]
  at: string; fm: string; fb: string; peaks: Peak[]; rows: KV[]
}

export interface Bar { x: string; y: string; h: string; fill: string; k: string; lx: string }
export interface PreRes {
  kind: 'prestress'; big: Big[]
  cab: Array<{ d: string }>; bars: Bar[]; girderY: string; rows: KV[]; checks: Check[]
}

export interface Part { x: number; y: number; w: number; h: number; fill: string; op: string; stroke: string; go: () => void }
export interface LogRow { comp: string; d: string; loc: string; e: string; sev: string; col: string }
export interface InsRes {
  kind: 'inspection'; big: Big[]
  parts: Part[]; legend: Array<{ l: string; c: string }>; log: LogRow[]
}

export interface NdtCell { x: number; y: number; fill: string }
export interface NdtBand { l: string; r: string; c: string; n: string }
export interface NdtRes {
  kind: 'ndt'; big: Big[]
  q: string; ref: string; gl: string; cells: NdtCell[]; minX: number; minY: number
  running: boolean; progW: string; bands: NdtBand[]; rows: KV[]
}

export interface MetBar { x: number; y: string; h: string; c: string; t: string; ty: string; tx: number }
export interface Met { k: string; scS: string; lineY: string; bars: MetBar[] }
export interface PrevRow { id: string; l: string; c: string; f: string; d: string; u: string }
export interface SynRes {
  kind: 'synthetic'; big: Big[]
  label: string; labCol: string; running: boolean; progW: string; progS: string
  met: Met[]; dist: Array<{ c: string; w: string; l: string }>; ver: string; prev: PrevRow[]
}

export interface Cell { v: string | number; bg: string; fg: string }
export interface CmRow { k: string; cells: Cell[] }
export interface Imp { k: string; v: string; w: string }
export interface DistLine { y: number; x0: string; x1: string; xm: string; c: string; l: string; ly: number; t: string }
export interface FeatRes {
  kind: 'features'; big: Big[]
  cm: CmRow[]; cols: string; sel: string; meaning: string; dist: DistLine[]; lo: string; hi: string; imp: Imp[]
}

export interface MlRes {
  kind: 'ml'; big: Big[]
  model: string
  training: boolean; progS: string; progW: string; pred: string; predCol: string; confS: string
  nTest: number; cm: CmRow[]; cmCols: string; imp: Imp[]
}

export interface MtNode { x: number; y: number; w: number; tx: number; ty: number; l: string; fill: string; fg: string; bd: string }
export interface MtEdge { x1: number; y1: number; x2: number; y2: number; s: string; w: string }
export interface MtAction { t: string; why: string[]; c: string }
export interface MtTl { x: string; l: string; ly: number }
export interface MaintRes {
  kind: 'maintenance'; big: Big[]
  nodes: MtNode[]; edges: MtEdge[]; actions: MtAction[]; tl: MtTl[]
}

export interface Thumb { n: string; l: string; fig: boolean }
export interface TocRow { n: string; l: string; p: string }
export interface RepRes {
  kind: 'report'; big: Big[]
  toc: TocRow[]; pages: number; running: boolean; progW: string; progS: string
  compiled: boolean; verS: string; thumbs: Thumb[]
}

export interface NoneRes { kind: 'none'; big: Big[] }
/** Dashboard: a live cross-stage aggregate (span + real f₁/Pₑ·P₀/condition).
 *  `twin` carries the real values for the 3D callouts (populated by verify.ts). */
export interface DashRes { kind: 'dashboard'; big: Big[]; rows: Row[]; twin?: Record<string, string> }
export type ResultsModel =
  | ConfigRes | AnaRes | BaseRes | MonRes | PreRes | InsRes | NdtRes | SynRes | FeatRes | MlRes | MaintRes | RepRes | DashRes | NoneRes

export interface ResultDeps {
  g: Geom; ana: Ana; base: Base; mon: Mon
  pre: Pre; ins: Ins; ndt: Ndt; syn: Syn; feat: Feat; ml: Ml; mnt: Mnt; rep: Rep
  tick: number
  jobs: Record<string, number | null>
  job: (key: string, done?: () => void) => void
  bump: (key: string) => void
  setBase: <K extends keyof Base>(k: K, v: Base[K]) => void
  setK: (slice: 'pre' | 'ins' | 'ndt' | 'syn' | 'feat' | 'ml' | 'mnt' | 'rep' | 'wz', k: string, v: unknown) => void
  mlReal: MlReal | null
  dataset: Dataset | null
  seen: Record<number, boolean>
  lastSeen: number
  staticBig: Big[]
}

/** ML condition score — shared by ml + maintenance + dashboard (port of renderVals line 972). */
export function mlScoreOf(ml: Ml) {
  const sc = Math.max(0, Math.min(0.999, 0.45 * (-ml.df / 15) + 0.35 * ((ml.dmax - 18) / 14) + 0.2 * ((4.5 - ml.upv) / 1.5)))
  const cls = Math.min(3, Math.floor(sc * 4))
  const conf = 0.55 + 0.4 * (1 - Math.abs(((sc * 4) % 1) - 0.5) * 2)
  return { sc, cls, conf }
}

export function buildResults(id: string, d: ResultDeps): ResultsModel {
  const { g } = d
  const sec = section(g)

  if (id === 'config') {
    const sd = g.span / g.depth, webMin = 0.2
    const big: Big[] = [
      ['Area (composite)', sec.At.toFixed(3), 'm²'], ['Ixx', sec.I.toFixed(3), 'm⁴'],
      ['Centroid y_b', sec.yb.toFixed(3), 'm'], ['Z_bot', sec.Zb.toFixed(3), 'm³'],
    ]
    const secRows = [
      ['Girder area', sec.A.toFixed(3) + ' m²'], ['Composite area', sec.At.toFixed(3) + ' m²'],
      ['Overall height', sec.H.toFixed(3) + ' m'], ['Ixx (composite)', sec.I.toFixed(4) + ' m⁴'],
      ['Z_top', sec.Zt.toFixed(3) + ' m³'], ['Z_bot', sec.Zb.toFixed(3) + ' m³'],
    ].map(([k, v]) => ({ k, v }))
    const checks: Check[] = [
      { k: 'Span / depth', v: sd.toFixed(1), col: sd >= 15 && sd <= 25 ? GREEN : RED },
      { k: 'Web ≥ duct + cover', v: (g.web * 1000).toFixed(0) + ' ≥ 200 mm', col: g.web >= webMin ? GREEN : RED },
    ]
    const k = Math.min(250 / g.sp, 150 / sec.H), cx = 150, by = 180
    const X = (x: number) => +(cx + x * k).toFixed(1), Y = (y: number) => +(by - y * k).toFixed(1)
    const top = Y(sec.H), dxRaw = +(cx + (g.sp * k) / 2 + 12).toFixed(1), dx = Math.min(dxRaw, 268)
    const xs: XS = {
      pts: sec.pts.map(([x, y]) => X(x) + ',' + Y(y)).join(' '),
      slab: { x: X(-g.sp / 2), y: top, w: +(g.sp * k).toFixed(1), h: +(g.slab * k).toFixed(1) },
      yb: Y(sec.yb), ybT: Y(sec.yb) - 4, ybS: sec.yb.toFixed(3), cx0: X(-g.sp / 2), cx1: X(g.sp / 2),
      dx, dx0: dx - 4, dx1: dx + 4, dxT: dx - 34, top, bot: by, mid: +((top + by) / 2).toFixed(1), hS: sec.H.toFixed(3),
      bf0: X(-g.bfw / 2), bf1: X(g.bfw / 2), bfS: (g.bfw * 1000).toFixed(0),
      spT: Math.max(12, top - 6), spS: 'b_eff ' + g.sp.toFixed(3),
      twX: X(g.web / 2) + 6, twS: 't_w ' + (g.web * 1000).toFixed(0),
    }
    return { kind: 'config', big, xs, secRows, checks }
  }

  if (id === 'analysis') {
    const an = calcAna(g, sec, d.ana)
    const ok = an.dLL <= an.lim
    return {
      kind: 'analysis',
      big: [['M_max', f0(an.Mt), 'kN·m'], ['V_max', f0(an.V), 'kN'], ['δ live', an.dLL.toFixed(1), 'mm'], ['δ / limit', (an.dLL / an.lim).toFixed(2), '']],
      pt: an.pt, pd: an.pd, pe: an.pe, ps: an.ps, posX: an.posX, MtY: an.MtY, MtS: 'M_max ' + f0(an.Mt) + ' kN·m',
      rows: R([
        ['w dead (self + deck)', an.wSelf.toFixed(1) + ' kN/m'], ['w SIDL', an.wSidl.toFixed(1) + ' kN/m'],
        ['M dead', f0(an.Mdl) + ' kN·m'], ['M live (incl. IF)', f0(an.Mll) + ' kN·m'],
        ['V_max', f0(an.V) + ' kN'], ['δ live', an.dLL.toFixed(1) + ' mm'],
      ]),
      check: { k: 'δ live ≤ L/800', v: an.dLL.toFixed(1) + ' ≤ ' + an.lim.toFixed(1) + ' mm', col: ok ? GREEN : RED },
      running: d.jobs.ana != null, progW: (d.jobs.ana || 0) + '%', progS: Math.round(d.jobs.ana || 0) + ' %', run: () => { d.bump('ana'); d.job('ana') },
    }
  }

  if (id === 'baseline') {
    const b = d.base, an = calcAna(g, sec, d.ana)
    const { m, EI, f1 } = calcF1(g, sec, b, an)
    const ratios = b.engine === 'Analytical' ? [1, 4, 9] : [1, 1.826, 2.62]
    const fs = ratios.map((r) => f1 * r)
    const modes: ModeShape[] = [1, 2, 3].map((n, j) => {
      let q = ''
      for (let i = 0; i <= 60; i++) { const x = i / 60; q += (i ? 'L' : 'M') + (x * 300).toFixed(1) + ' ' + (22 - 15 * Math.sin(n * Math.PI * x)).toFixed(1) }
      return { d: q, k: 'Mode ' + n, f: fs[j].toFixed(2) + ' Hz' }
    })
    return {
      kind: 'baseline',
      big: (fs.map((f, j) => ['f' + SUB[j], f.toFixed(2), 'Hz'] as Big)).concat([['Baseline', 'v' + b.ver, '']]),
      modes, ver: 'v' + b.ver,
      running: d.jobs.base != null, progW: (d.jobs.base || 0) + '%', progS: Math.round(d.jobs.base || 0) + ' %',
      establish: () => { if (d.jobs.base == null) { d.bump('base'); d.job('base', () => d.setBase('ver', b.ver + 1)) } },
      rows: R([
        ['Mass per girder', f0(m) + ' kg/m'], ['EI (composite)', (EI / 1e9).toFixed(1) + ' GN·m²'],
        ['δ live (reference)', an.dLL.toFixed(1) + ' mm'], ['UPV nominal', '4.30 km/s'], ['Rebound nominal', '38'], ['Damping', b.zeta.toFixed(1) + ' %'],
      ]),
      note: b.engine === 'Analytical' ? 'Euler–Bernoulli simply supported beam: modes follow 1 : 4 : 9.' : 'Sample FE result. The backend replaces these with OpenSeesPy eigen analysis.',
    }
  }

  if (id === 'monitoring') {
    const m = d.mon, an = calcAna(g, sec, d.ana)
    const fM = [3.12, 5.71, 8.22], fB = [3.21, 5.86, 8.41], amp = [1, 0.45, 0.25]
    const sig = (t: number) => {
      let v = 0
      for (let j = 0; j < 3; j++) v += amp[j] * Math.sin(2 * Math.PI * fM[j] * t + j * 1.3)
      let env = 1
      if (m.ex === 'Impact') env = 2.2 * Math.exp(-(t % 4) * 1.2)
      else if (m.ex === 'Vehicle') env = 0.5 + 1.2 * Math.exp(-((((t % 6) - 3) / 1.2) ** 2))
      const n = (Math.sin(t * 91.7) * Math.sin(t * 53.3 + 1) + Math.sin(t * 137.1)) * 0.25
      return (v * env + n) * 0.018
    }
    const t0 = d.tick * 0.07, N = 240
    let p = '', sum = 0, mx = 0
    for (let j = 0; j < N; j++) {
      const v = sig(t0 + (j / N) * 4)
      sum += v * v; mx = Math.max(mx, Math.abs(v))
      p += (j ? 'L' : 'M') + ((j / (N - 1)) * 300).toFixed(1) + ' ' + Math.max(2, Math.min(94, 48 - (v / 0.08) * 46)).toFixed(1)
    }
    const spec = (fsp: number[]) => (f: number) => { let a = 0.03; for (let j = 0; j < 3; j++) a += amp[j] / (1 + ((f - fsp[j]) / 0.14) ** 2); return a }
    const path = (fn: (f: number) => number) => { let q = ''; for (let j = 0; j <= 200; j++) { const f = (j / 200) * 12; q += (j ? 'L' : 'M') + ((j / 200) * 300).toFixed(1) + ' ' + (104 - (fn(f) / 1.05) * 86).toFixed(1) } return q }
    const sm = spec(fM), fb = calcF1(g, sec, d.base, an).f1
    const df1 = ((3.12 - fb) / fb * 100).toFixed(1).replace('-', '−'), rms = Math.sqrt(sum / N)
    return {
      kind: 'monitoring', at: p, fm: path(sm), fb: path(spec(fB)),
      peaks: fM.map((f, j) => ({ x: +((f / 12) * 300).toFixed(1), y: +(104 - (sm(f) / 1.05) * 86 - 6).toFixed(1), t: 'f' + SUB[j] + ' ' + f.toFixed(2) })),
      rows: R([['Baseline f₁', fb.toFixed(2) + ' Hz'], ['Δf₁ vs baseline', df1 + ' %'], ['Records', Math.round(m.dur * m.fs).toLocaleString() + ' samples'], ['Modal ID', 'FDD + SSI']]),
      big: [['Measured f₁', '3.12', 'Hz'], ['a_RMS', rms.toFixed(3), 'g'], ['a_max', mx.toFixed(3), 'g'], ['Sensors', String(m.sensors), '']],
    }
  }

  if (id === 'prestress') {
    const p = d.pre, L = g.span, D = g.depth, an = calcAna(g, sec, d.ana)
    const { P0, L1, L2, L3, L4, L5, L6, tot, Pe, sT, sS, camber } = calcPre(g, sec, p, an)
    const ky = 78 / D, X = (x: number) => (10 + (x / L) * 280).toFixed(1), Y = (y: number) => (16 + (D - y) * ky).toFixed(1)
    const ends = [0.27, 0.52, 0.76, 0.64], mids = [0.08, 0.08, 0.18, 0.14], cab: Array<{ d: string }> = []
    for (let c = 0; c < p.n; c++) {
      let q = ''
      for (let j = 0; j <= 40; j++) { const s = j / 40, yv = (mids[c] + (ends[c] - mids[c]) * (2 * s - 1) ** 2) * D; q += (j ? 'L' : 'M') + X(s * L) + ' ' + Y(yv) }
      cab.push({ d: q })
    }
    const steps: Array<[string, number, number]> = [['P₀', P0, 0], ['Fric.', P0 * L1 / 100, 1], ['Slip', P0 * L2 / 100, 1], ['E.S.', P0 * L3 / 100, 1], ['Creep', P0 * L4 / 100, 1], ['Shr.', P0 * L5 / 100, 1], ['Relax.', P0 * L6 / 100, 1], ['Pₑ', Pe, 0]]
    let run = P0
    const ys = (v: number) => (v / P0) * 92
    const bars: Bar[] = steps.map(([k, v, loss], j) => {
      let top: number, hgt: number
      if (!loss) { hgt = ys(v); top = 104 - hgt } else { top = 104 - ys(run); hgt = ys(v); run -= v }
      return { x: (6 + j * 36.5).toFixed(1), y: top.toFixed(1), h: Math.max(1, hgt).toFixed(1), fill: loss ? 'var(--faint)' : 'var(--ink)', k, lx: (6 + j * 36.5 + 13).toFixed(1) }
    })
    return {
      kind: 'prestress', cab, bars, girderY: Y(D),
      big: [['P₀', f0(P0), 'kN'], ['Total loss', tot.toFixed(1), '%'], ['Pₑ', f0(Pe), 'kN'], ['Net camber', camber.toFixed(0), 'mm']],
      rows: R([
        ['P₀ (jacking)', f0(P0) + ' kN'], ['Friction', L1.toFixed(1) + ' %'], ['Anchorage slip', L2.toFixed(1) + ' %'],
        ['Elastic shortening', L3.toFixed(1) + ' %'], ['Creep + shrinkage', (L4 + L5).toFixed(1) + ' %'], ['Relaxation', L6.toFixed(1) + ' %'],
        ['Pₑ (effective)', f0(Pe) + ' kN'], ['σ_bot transfer', sT.toFixed(1) + ' MPa'], ['σ_bot service', sS.toFixed(1) + ' MPa'],
      ]),
      checks: [{ k: 'Pₑ < P₀', v: (Pe / P0).toFixed(3), col: GREEN }, { k: 'Service bottom fibre in compression', v: sS.toFixed(1) + ' MPa', col: sS >= 0 ? GREEN : AMBER }],
    }
  }

  if (id === 'inspection') {
    const st = d.ins
    const sevOf = (c: string) => st.obs.filter((o) => o.c === c).reduce((mx, o) => Math.max(mx, o.s), 0)
    const vci = 1 - COMPS.reduce((acc, [c]) => acc + sevOf(c), 0) / (COMPS.length * 3)
    const worst = COMPS.reduce((bst, [c, l]) => (sevOf(c) > bst.s ? { s: sevOf(c), l } : bst), { s: 0, l: '—' })
    const P = (c: string, x: number, y: number, w: number, h: number): Part => ({ x, y, w, h, fill: COL[sevOf(c)], op: sevOf(c) ? '0.9' : '0.35', stroke: st.sel === c ? 'var(--ink)' : 'none', go: () => d.setK('ins', 'sel', c) })
    return {
      kind: 'inspection',
      parts: [
        P('abut', 6, 52, 22, 58), P('abut', 272, 52, 22, 58), P('bearings', 24, 46, 8, 6), P('bearings', 268, 46, 8, 6), P('girders', 30, 30, 240, 16),
        P('cross', 34, 31, 3, 14), P('cross', 92, 31, 3, 14), P('cross', 149, 31, 3, 14), P('cross', 206, 31, 3, 14), P('cross', 263, 31, 3, 14),
        P('deck', 26, 22, 248, 8), P('fp', 26, 16, 248, 6), P('barrier', 26, 8, 248, 6), P('ej', 24, 8, 3, 22), P('ej', 273, 8, 3, 22), P('drain', 180, 46, 5, 12),
      ],
      legend: SEVN.map((l, j) => ({ l, c: COL[j] })),
      log: st.obs.map((o) => ({ comp: (COMPS.find((x) => x[0] === o.c) ?? ['', o.c])[1], d: o.d, loc: o.loc, e: o.e, sev: SEVN[o.s], col: COL[o.s] })),
      big: [['Visual index', vci.toFixed(2), ''], ['Observations', String(st.obs.length), ''], ['Worst', worst.l, ''], ['Components', COMPS.length + ' / ' + COMPS.length, '']],
    }
  }

  if (id === 'ndt') {
    const st = d.ndt, gi = Math.min(st.g, g.nG - 1), o = g.nG - 1, sd = st.seed
    const t = NDT_TESTS[st.test], bc = t.bands.length === 4 ? COL : [COL[0], COL[2], COL[3]]
    const grade = (v: number) => t.bands.findIndex((b) => v > b[2] && v <= b[3])
    const cells: NdtCell[] = [], vals: number[] = [], counts = t.bands.map(() => 0)
    for (let r = 0; r < 3; r++) for (let i = 0; i < 14; i++) { const v = t.f((i + 0.5) / 14, r, i, gi, o, sd), gr = Math.max(0, grade(v)); counts[gr]++; vals.push(v); cells.push({ x: 10 + i * 20, y: 22 + r * 20, fill: bc[gr] }) }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length, mn = Math.min(...vals), mi = vals.indexOf(mn)
    const avg = (key: string) => { let s = 0; for (let r = 0; r < 3; r++) for (let i = 0; i < 14; i++) s += NDT_TESTS[key].f((i + 0.5) / 14, r, i, gi, o, sd); return s / 42 }
    const son = 0.0286 * Math.pow(avg('Rebound'), 1.246) * Math.pow(avg('UPV'), 1.85)
    const flagged = counts.slice(t.bands.length === 4 ? 2 : 1).reduce((a, b) => a + b, 0)
    return {
      kind: 'ndt', q: t.q, ref: t.ref, gl: 'G' + (gi + 1), cells, minX: cells[mi].x + 9.5, minY: cells[mi].y + 9.5,
      running: d.jobs.ndt != null, progW: (d.jobs.ndt || 0) + '%',
      bands: t.bands.map((b, j) => ({ l: b[0], r: b[1] + ' ' + t.u, c: bc[j], n: counts[j] + ' pts' })),
      rows: R([['Points on G' + (gi + 1), '42'], ['Mean', mean.toFixed(t.dec) + ' ' + t.u], ['Min', mn.toFixed(t.dec) + ' ' + t.u], ['SonReb f_ck est.', son.toFixed(1) + ' MPa']]),
      big: [[st.test + ' mean', mean.toFixed(t.dec), t.u], ['Min', mn.toFixed(t.dec), t.u], ['Flagged', String(flagged), 'pts'], ['SonReb', son.toFixed(1), 'MPa']],
    }
  }

  if (id === 'synthetic') {
    const st = d.syn, L = g.span, M = st.mech, an = calcAna(g, sec, d.ana)
    const stiff = M['Cracking'] || M['Stiffness reduction'] || M['Corrosion'] ? 1 : 0.3
    let x = (st.sev / 100) * (st.ext / L) * Math.sin(Math.PI * st.loc) * stiff * 2.533 + (M['Bearing deterioration'] ? 0.02 : 0)
    x = Math.min(0.6, x)
    const fb = calcF1(g, sec, d.base, an).f1, db = an.dLL
    const f1s = fb * Math.sqrt(1 - x), ds = db / (1 - x) + (M['Prestress loss'] ? (3 * st.sev) / 35 : 0), upv = 4.31 * (1 - (M['Cracking'] ? (0.4 * st.sev) / 100 : 0))
    const lab = x < 0.05 ? 0 : x < 0.12 ? 1 : x < 0.25 ? 2 : 3, xsc = [0, 0.08, 0.18, 0.32]
    const met: Met[] = ([
      ['Δf₁', xsc.map((v) => (Math.sqrt(1 - v) - 1) * 100), (f1s / fb - 1) * 100],
      ['Δδ', xsc.map((v) => (1 / (1 - v) - 1) * 100), (ds / db - 1) * 100],
      ['ΔUPV', [0, -5, -12, -22], (upv / 4.31 - 1) * 100],
    ] as Array<[string, number[], number]>).map(([k, arr, scn]) => {
      const mxv = Math.max(...arr.map(Math.abs), Math.abs(scn), 1), H = (v: number) => (Math.abs(v) / mxv) * 38
      return { k, scS: 'scenario ' + scn.toFixed(1).replace('-', '−') + ' %', lineY: (50 - H(scn)).toFixed(1), bars: arr.map((v, j) => ({ x: 24 + j * 70, y: (50 - H(v)).toFixed(1), h: Math.max(1, H(v)).toFixed(1), c: COL[j], t: v.toFixed(1).replace('-', '−'), ty: (46 - H(v)).toFixed(1), tx: 44 + j * 70 })) }
    })
    const nz = st.noise / 100, rnd = (j: number) => Math.sin(j * 12.9898 + st.ver * 78.233) * 0.5
    const prev: PrevRow[] = [0, 1, 2, 3, 2, 1].map((c, j) => ({ id: 'R' + String(1000 + j * 37 + st.ver), l: SEVN[c], c: COL[c], f: (fb * Math.sqrt(1 - xsc[c]) * (1 + nz * rnd(j))).toFixed(2), d: ((db / (1 - xsc[c])) * (1 + nz * rnd(j + 7))).toFixed(1), u: (4.31 * (1 + [0, -5, -12, -22][c] / 100) * (1 + nz * rnd(j + 3))).toFixed(2) }))
    return {
      kind: 'synthetic', met, prev, label: SEVN[lab], labCol: COL[lab],
      running: d.jobs.syn != null, progW: (d.jobs.syn || 0) + '%', progS: Math.round(d.jobs.syn || 0) + ' %',
      dist: COL.map((c, j) => ({ c, w: '25%', l: SEVN[j] })), ver: 'Dataset v' + st.ver + ' · ' + st.n.toLocaleString() + ' records',
      big: [['Scenario label', SEVN[lab], ''], ['f₁', f1s.toFixed(2), 'Hz'], ['δ', ds.toFixed(1), 'mm'], ['Records', st.n.toLocaleString(), '']],
    }
  }

  if (id === 'features') {
    const st = d.feat
    const act = FEATURES.filter((f) => st.on[f[0]])
    const selF = FEATURES.find((f) => f[0] === st.sel && st.on[f[0]]) || act[0] || FEATURES[0]
    const fam = (a: number, b: number) => (a < 3 && b < 3 ? 0.08 : a > 2 && a < 6 && b > 2 && b < 6 ? 0.1 : 0)
    const cm: CmRow[] = act.map((a) => {
      const i = FEATURES.indexOf(a)
      return {
        k: a[0],
        cells: act.map((b) => {
          const j = FEATURES.indexOf(b), r = i === j ? 1 : Math.max(-1, Math.min(1, a[1] * b[1] + Math.sign(a[1] * b[1]) * fam(i, j)))
          return { v: r.toFixed(1), bg: r >= 0 ? 'color-mix(in oklab, var(--acc) ' + Math.round(Math.abs(r) * 85) + '%, transparent)' : 'color-mix(in oklab, var(--ink) ' + Math.round(Math.abs(r) * 70) + '%, transparent)', fg: Math.abs(r) > 0.6 ? 'var(--inv)' : 'var(--ink)' }
        }),
      }
    })
    const mag = [0, 0.05, 0.12, 0.24], [k0, ld, h, u, dec] = selF
    const vals = mag.map((m) => h * (1 + Math.sign(ld) * m * Math.abs(ld)))
    const sp = mag.map((_, c) => h * 0.02 * (1 + c * 0.6))
    const lo = Math.min(...vals.map((v, c) => v - 2 * sp[c])), hi = Math.max(...vals.map((v, c) => v + 2 * sp[c])), X = (v: number) => (40 + ((v - lo) / (hi - lo)) * 250).toFixed(1)
    return {
      kind: 'features',
      cm, cols: 'repeat(' + (act.length + 1) + ',minmax(0,1fr))', sel: k0 as string, meaning: selF[5] as string,
      dist: vals.map((v, c) => ({ y: 12 + c * 20, x0: X(v - 2 * sp[c]), x1: X(v + 2 * sp[c]), xm: X(v), c: COL[c], l: SEVN[c], ly: 16 + c * 20, t: v.toFixed(dec as number) })),
      lo: lo.toFixed(dec as number) + ' ' + u, hi: hi.toFixed(dec as number) + ' ' + u,
      imp: ([['Δf₁', 0.24], ['δ_max', 0.17], ['f₂', 0.12], ['UPV', 0.11], ['a_RMS', 0.09]] as Array<[string, number]>).map(([k, v]) => ({ k, v: v.toFixed(2), w: ((v / 0.24) * 100).toFixed(0) + '%' })),
      big: [['Features', String(act.length), ''], ['Records', d.syn.n.toLocaleString(), ''], ['Strongest |r|', 'f₁ ↔ δ', '−0.81'], ['Top preview', 'Δf₁', '0.24']],
    }
  }

  if (id === 'ml') {
    const m = d.ml, iso = m.model === 'IsoForest'
    const { sc, cls, conf } = mlScoreOf(m)
    const names = ['Healthy', 'Minor', 'Deteriorated', 'Severe']
    const nTest = Math.round(2400 * (1 - m.split))
    const baseCm = iso ? [[221, 19], [14, 226]] : m.model === 'XGBoost' ? [[119, 1, 0, 0], [3, 111, 5, 1], [0, 4, 114, 2], [0, 0, 7, 113]] : [[118, 2, 0, 0], [4, 109, 6, 1], [0, 5, 112, 3], [0, 0, 7, 113]]
    const labels = iso ? ['Normal', 'Anomaly'] : ['Healthy', 'Minor', 'Det.', 'Severe']
    const tot = baseCm.flat().reduce((a, b) => a + b, 0), corr = baseCm.reduce((a, r, j) => a + r[j], 0), acc = corr / tot
    const cm: CmRow[] = baseCm.map((r, j) => {
      const rs = r.reduce((a, b) => a + b, 0)
      return { k: labels[j], cells: r.map((v, cc) => { const fr = v / rs, diag = cc === j; return { v: Math.round((v * nTest) / 480), bg: diag ? 'color-mix(in oklab, var(--acc) ' + Math.round(20 + fr * 70) + '%, transparent)' : fr > 0 ? 'color-mix(in oklab, #e0442f ' + Math.round(10 + fr * 120) + '%, transparent)' : 'var(--hover)', fg: 'var(--ink)' } }) }
    })
    const imp: Array<[string, number]> = [['Δf₁', 0.24], ['δ_max', 0.17], ['f₂', 0.12], ['UPV', 0.11], ['a_RMS', 0.09], ['ε_max', 0.08], ['f₃', 0.07], ['Rebound', 0.05], ['Kurtosis', 0.04], ['a_max', 0.03]]
    const pred = iso ? (sc > 0.45 ? 'Anomaly' : 'Normal') : names[cls]
    return {
      kind: 'ml', model: m.model, training: m.prog != null, progS: Math.round(m.prog || 0) + ' %', progW: (m.prog || 0) + '%',
      pred, predCol: iso ? (sc > 0.45 ? RED : GREEN) : COL[cls], confS: iso ? 'score ' + sc.toFixed(2) : conf.toFixed(2),
      nTest, cm, cmCols: '52px repeat(' + labels.length + ',minmax(0,1fr))',
      imp: imp.map(([k, v]) => ({ k, v: v.toFixed(2), w: ((v / 0.24) * 100).toFixed(0) + '%' })),
      big: [['Prediction', pred, ''], [iso ? 'Anomaly score' : 'Confidence', iso ? sc.toFixed(2) : conf.toFixed(2), ''], [iso ? 'Detection' : 'Accuracy', (acc * 100).toFixed(1), '%'], ['Test records', String(nTest), '']],
    }
  }

  if (id === 'maintenance') {
    const st = d.mnt
    // Prefer the REAL /ml/pipeline outcome (persisted when the ML stage ran); fall
    // back to the slider heuristic only before the classifier has ever been run.
    const r = d.mlReal
    const { sc, cls, conf } = r
      ? { sc: r.iso ? r.anom : r.cls / 3, cls: r.cls, conf: r.conf }
      : mlScoreOf(d.ml)
    const inv = cls >= st.trig || sc > st.anom, repair = inv && cls >= 3, prev = inv && !repair
    const months = Math.max(1, (({ Low: 3, Moderate: 6, High: 12 } as Record<string, number>)[st.risk] / (cls >= 2 ? 1 : 0.5)) / (cls >= 3 ? 2 : 1))
    const on: Record<string, boolean> = { a: true, rm: !inv, di: inv, pm: prev, rp: repair, ri: true }
    const N = (k: string, l: string, x: number, y: number, w: number): MtNode => ({ x: x - w / 2, y, w, tx: x, ty: y + 17, l, fill: on[k] ? 'var(--ink)' : 'transparent', fg: on[k] ? 'var(--inv)' : 'var(--mut)', bd: on[k] ? 'var(--ink)' : 'var(--line)' })
    const E = (a: string, b: string, x1: number, y1: number, x2: number, y2: number): MtEdge => ({ x1, y1, x2, y2, s: on[a] && on[b] ? 'var(--ink)' : 'var(--line)', w: on[a] && on[b] ? '1.5' : '1' })
    return {
      kind: 'maintenance',
      nodes: [N('a', 'Condition assessment', 160, 8, 150), N('rm', 'Routine monitoring', 72, 62, 128), N('di', 'Detailed investigation', 240, 62, 140), N('pm', 'Preventive maint.', 190, 116, 110), N('rp', 'Repair', 284, 116, 60), N('ri', 'Reinspection', 160, 170, 120)],
      edges: [E('a', 'rm', 160, 34, 72, 62), E('a', 'di', 160, 34, 240, 62), E('di', 'pm', 240, 88, 190, 116), E('di', 'rp', 240, 88, 284, 116), E('rm', 'ri', 72, 88, 140, 170), E('pm', 'ri', 190, 142, 170, 170), E('rp', 'ri', 284, 142, 200, 170)],
      actions: (inv ? [
        { t: 'Detailed investigation · G5 mid-span', why: ['ML ' + SEVN[cls] + ' ' + conf.toFixed(2), 'Δf₁ −2.8 %', 'Crack 0.3 mm'], c: COL[Math.max(2, cls)] },
        { t: 'Additional NDT · UPV grid on G5', why: ['UPV 3.28 km/s', 'Doubtful band'], c: COL[2] },
        { t: repair ? 'Repair · strengthen G5' : 'Preventive · reseat bearing B5', why: repair ? ['Severe class'] : ['Corrosion staining', 'Grade 3'], c: COL[repair ? 3 : 1] },
      ] : []).concat([{ t: 'Routine monitoring · all girders', why: ['6 accelerometers', 'f₁ trend'], c: COL[0] }]),
      tl: ([{ m: 0, l: 'Now' }] as Array<{ m: number; l: string }>).concat(inv ? [{ m: 1, l: 'Investigate' }, { m: 2, l: 'NDT' }, { m: 3, l: repair ? 'Repair' : 'Bearing' }] : []).concat([{ m: Math.min(24, Math.round(months)), l: 'Reinspect' }]).map((e, j) => ({ x: (16 + (e.m / 24) * 268).toFixed(1), l: e.l, ly: j % 2 ? 44 : 20 })),
      big: [['Path', inv ? 'Investigate' : 'Monitor', ''], ['Priority', repair ? 'Critical' : inv ? 'High' : 'Normal', ''], ['Reinspect in', String(Math.round(months)), 'mo'], ['Actions', String((inv ? 3 : 0) + 1), '']],
    }
  }

  if (id === 'report') {
    const st = d.rep, jobs = d.jobs
    let pg = 3
    const toc: TocRow[] = []
    SEC.forEach((s2, j) => { if (!st.on[j]) return; toc.push({ n: String(j + 1).padStart(2, '0'), l: s2, p: String(pg) }); pg += SEC_PG[j] - (st.figs === 'no' ? 1 : 0) })
    return {
      kind: 'report', toc, pages: pg - 1,
      running: jobs.rep != null, progW: (jobs.rep || 0) + '%', progS: Math.round(jobs.rep || 0) + ' %',
      compiled: st.ver > 0, verS: 'Compiled v' + st.ver + ' · ' + (pg - 1) + ' pages · ' + st.fmt,
      thumbs: toc.slice(0, 4).map((t) => ({ n: t.n, l: t.l, fig: st.figs === 'yes' })),
      big: [['Sections', String(toc.length), ''], ['Pages', String(pg - 1), ''], ['Format', st.fmt, ''], ['Status', st.ver ? 'Compiled' : 'Draft', '']],
    }
  }

  if (id === 'dashboard') {
    // Live cross-stage aggregate. Span/engine are exact; f₁ and Pₑ/P₀ are the
    // local-physics preview (real approximation) that verify.ts overlays with the
    // backend-true values; condition is the real persisted ML class (mlReal) or,
    // before the classifier has run, the live evidence heuristic.
    const an = calcAna(g, sec, d.ana)
    const { f1 } = calcF1(g, sec, d.base, an)
    const pr = calcPre(g, sec, d.pre, an)
    const ratio = pr.P0 > 0 ? pr.Pe / pr.P0 : 0
    const r = d.mlReal
    const { cls, conf } = r ? { cls: r.cls, conf: r.conf } : mlScoreOf(d.ml)
    const cond = r ? r.pred : SEVN[cls]
    const wsSeen = Object.keys(d.seen).map(Number).filter((k) => k >= 1 && k <= 12 && d.seen[k]).length
    const big: Big[] = [
      ['Span', g.span.toFixed(1), 'm'],
      ['Baseline f₁', f1.toFixed(2), 'Hz'],
      ['Pₑ / P₀', ratio.toFixed(3), ''],
      ['Condition · ' + conf.toFixed(2), cond, ''],
    ]
    const rows: Row[] = [
      ['Stages complete', wsSeen + ' / 12'],
      ['Last run', STAGES[d.lastSeen]?.name ?? '—'],
      ['Engine', d.base.engine],
      ['Span', g.span.toFixed(1) + ' m'],
    ]
    return { kind: 'dashboard', big, rows }
  }

  return { kind: 'none', big: d.staticBig }
}
