import type { Ana, Base, Geom, Mon, Pre, Ins, Ndt, Syn, Feat, Ml, Mnt, Rep, Obs } from '@/state/store'
import { FEATURES, COMPS, SEC, COL } from './data'

/** Input-control models — ports of the design's seg/sl/chips/pickList shapes. */
export interface SegOpt { label: string; active: boolean; go: () => void }
export interface Seg { k: string; opts: SegOpt[] }
export interface Slider {
  k: string; v: number; vs: string; u: string
  min: number; max: number; step: number
  on: (v: number) => void; err: string; red: boolean
}
export interface PickItem { label: string; n: string; dot: string; active: boolean; go: () => void }
export interface PickList { k: string; items: PickItem[] }
export interface ChipOpt { label: string; active: boolean; go: () => void }
export interface ChipGroup { k: string; opts: ChipOpt[] }
export interface InAction { label: string; go: () => void }
export interface TextField { k: string; v: string; on: (v: string) => void }

export interface InputsModel {
  inNote: string
  segs: Seg[]
  sliders: Slider[]
  pickList: PickList | null
  chipGroups: ChipGroup[]
  inAction: InAction | null
  textFields: TextField[]
  predSliders: Slider[]
  isML: boolean
  trainLabel: string
  train: (() => void) | null
}

type OptIn = number | string | { v: number | string; l: string }

function seg(k: string, opts: OptIn[], val: unknown, on: (v: never) => void): Seg {
  return {
    k,
    opts: opts.map((o) => {
      const v = typeof o === 'object' ? o.v : o
      const label = typeof o === 'object' ? o.l : String(o)
      return { label, active: v === val, go: () => on(v as never) }
    }),
  }
}

function sl(
  k: string, v: number, u: string, min: number, max: number, step: number, dec: number,
  on: (v: number) => void, err = '',
): Slider {
  return { k, v, vs: Number(v).toFixed(dec), u, min, max, step, on, err, red: !!err }
}

function chips(k: string, opts: string[], isOn: (o: string) => boolean, on: (o: string) => void): ChipGroup {
  return { k, opts: opts.map((o) => ({ label: o, active: isOn(o), go: () => on(o) })) }
}

export interface InputDeps {
  g: Geom; ana: Ana; base: Base; mon: Mon
  pre: Pre; ins: Ins; ndt: Ndt; syn: Syn; feat: Feat; ml: Ml; mnt: Mnt; rep: Rep
  setG: (k: keyof Geom, v: number) => void
  setAna: <K extends keyof Ana>(k: K, v: Ana[K]) => void
  setBase: <K extends keyof Base>(k: K, v: Base[K]) => void
  setMon: <K extends keyof Mon>(k: K, v: Mon[K]) => void
  setK: (slice: 'pre' | 'ins' | 'ndt' | 'syn' | 'feat' | 'ml' | 'mnt' | 'rep' | 'wz', k: string, v: unknown) => void
  job: (key: string, done?: () => void) => void
  bump: (key: string) => void
  train: () => void
  genDataset: () => void
  exportJSON: () => void
}

const EMPTY: InputsModel = {
  inNote: '', segs: [], sliders: [], pickList: null, chipGroups: [], inAction: null,
  textFields: [], predSliders: [], isML: false, trainLabel: '', train: null,
}
const base = (): InputsModel => ({ ...EMPTY, segs: [], sliders: [], chipGroups: [], textFields: [], predSliders: [] })

export function buildInputs(id: string, d: InputDeps): InputsModel {
  const { g, ana: a, base: b, mon: m } = d

  if (id === 'config') {
    const sd = g.span / g.depth, webMin = 0.2
    const o = base()
    o.inNote = '3D rebuilds live'
    o.segs = [
      seg('Span', [30, 33, 36].map((v) => ({ v, l: v + ' m' })), g.span, (v: number) => d.setG('span', v)),
      seg('Girders', [4, 5, 6], g.nG, (v: number) => d.setG('nG', v)),
    ]
    o.sliders = [
      sl('Girder spacing', g.sp, 'm', 2.6, 3.6, 0.05, 3, (v) => d.setG('sp', v)),
      sl('Overall depth', g.depth, 'm', 1.2, 2.2, 0.01, 3, (v) => d.setG('depth', v), sd < 15 || sd > 25 ? 'Span/depth ' + sd.toFixed(1) + ' outside 15–25 guidance' : ''),
      sl('Web thickness', g.web, 'm', 0.16, 0.4, 0.01, 3, (v) => d.setG('web', v), g.web < webMin ? 'Below duct 90 mm + 2 × 55 mm cover' : ''),
      sl('Top flange width', g.tfw, 'm', 0.8, 1.4, 0.01, 3, (v) => d.setG('tfw', v)),
      sl('Top flange thickness', g.tft, 'm', 0.12, 0.28, 0.01, 3, (v) => d.setG('tft', v)),
      sl('Bottom flange width', g.bfw, 'm', 0.5, 1, 0.01, 3, (v) => d.setG('bfw', v)),
      sl('Bottom flange thickness', g.bft, 'm', 0.15, 0.35, 0.01, 3, (v) => d.setG('bft', v)),
      sl('Deck slab', g.slab, 'm', 0.18, 0.3, 0.01, 3, (v) => d.setG('slab', v)),
    ]
    return o
  }

  if (id === 'analysis') {
    const o = base()
    o.inNote = 'Per girder · outer'
    o.segs = [
      seg('Live load', [{ v: '70R', l: '70R' }, { v: 'Class A', l: 'Class A' }, { v: '70R + A', l: '70R + A' }], a.load, (v: string) => d.setAna('load', v)),
      seg('Distribution', ['Courbon', 'Grillage'], a.dist, (v: string) => d.setAna('dist', v)),
    ]
    o.sliders = [
      sl('Vehicle position x', a.a, 'm', 0, g.span, 0.1, 1, (v) => d.setAna('a', v)),
      sl('Impact factor', a.IF, '', 1, 1.25, 0.01, 2, (v) => d.setAna('IF', v)),
      sl('Crash barrier', a.barrier, 'kN/m', 10, 25, 0.5, 1, (v) => d.setAna('barrier', v)),
      sl('Footpath live load', a.fp, 'kN/m²', 3, 6, 0.1, 1, (v) => d.setAna('fp', v)),
    ]
    return o
  }

  if (id === 'baseline') {
    const o = base()
    o.inNote = 'Healthy model'
    o.segs = [
      seg('Engine', [{ v: 'OpenSeesPy', l: 'OpenSeesPy' }, { v: 'Analytical', l: 'Analytical' }], b.engine, (v: string) => d.setBase('engine', v)),
      seg('Mass', [{ v: 'incl', l: 'Incl. SIDL' }, { v: 'struct', l: 'Structure only' }], b.mass, (v: string) => d.setBase('mass', v)),
    ]
    o.sliders = [
      sl('Concrete modulus E_c', b.Ec, 'GPa', 30, 38, 0.1, 1, (v) => d.setBase('Ec', v)),
      sl('Damping ζ', b.zeta, '%', 1, 5, 0.1, 1, (v) => d.setBase('zeta', v)),
    ]
    return o
  }

  if (id === 'monitoring') {
    const o = base()
    o.inNote = 'Signal is synthetic'
    o.segs = [
      seg('Sampling', [100, 200, 500].map((v) => ({ v, l: v + ' Hz' })), m.fs, (v: number) => d.setMon('fs', v)),
      seg('Excitation', ['Ambient', 'Impact', 'Vehicle'], m.ex, (v: string) => d.setMon('ex', v)),
    ]
    o.sliders = [
      sl('Accelerometers', m.sensors, '', 4, 12, 1, 0, (v) => d.setMon('sensors', v)),
      sl('Duration', m.dur, 's', 60, 1800, 30, 0, (v) => d.setMon('dur', v)),
    ]
    return o
  }

  if (id === 'prestress') {
    const p = d.pre, o = base()
    o.inNote = 'Losses at mid-span'
    o.segs = [seg('Cables per girder', [2, 3, 4], p.n, (v: number) => d.setK('pre', 'n', v))]
    o.sliders = [
      sl('Strands per cable', p.strands, '× 12.7 mm', 12, 22, 1, 0, (v) => d.setK('pre', 'strands', v)),
      sl('Jacking stress', p.jack * 100, '% f_pu', 70, 80, 0.5, 1, (v) => d.setK('pre', 'jack', v / 100)),
      sl('Friction μ', p.mu, '', 0.12, 0.25, 0.005, 3, (v) => d.setK('pre', 'mu', v)),
      sl('Wobble K', p.K * 1000, '× 10⁻³/m', 1.5, 3, 0.1, 1, (v) => d.setK('pre', 'K', v / 1000)),
      sl('Anchorage slip', p.slip, 'mm', 4, 8, 0.5, 1, (v) => d.setK('pre', 'slip', v)),
    ]
    return o
  }

  if (id === 'inspection') {
    const st = d.ins, o = base()
    const sevOf = (c: string) => st.obs.filter((x) => x.c === c).reduce((mx, x) => Math.max(mx, x.s), 0)
    const cnt = (c: string) => st.obs.filter((x) => x.c === c).length
    o.inNote = 'Bridge → component → observation'
    o.pickList = {
      k: 'Components · single span',
      items: COMPS.map(([c, l]) => ({ label: l, n: String(cnt(c)), dot: COL[sevOf(c)], active: st.sel === c, go: () => d.setK('ins', 'sel', c) })),
    }
    o.chipGroups = [chips('Defect type', ['Cracking', 'Spalling', 'Corrosion staining', 'Leakage', 'Honeycombing', 'Surface deterioration'], (x) => x === st.defect, (x) => d.setK('ins', 'defect', x))]
    o.segs = [seg('Severity', [{ v: 1, l: 'Minor' }, { v: 2, l: 'Deteriorated' }, { v: 3, l: 'Severe' }], st.sev, (v: number) => d.setK('ins', 'sev', v))]
    o.sliders = [sl('Extent', st.ext, 'm²', 0.1, 5, 0.1, 1, (v) => d.setK('ins', 'ext', v))]
    const selL = (COMPS.find((x) => x[0] === st.sel) ?? COMPS[1])[1]
    o.inAction = {
      label: 'Add observation to ' + selL.toLowerCase(),
      go: () => {
        const nw: Obs = { c: st.sel, d: st.defect, s: st.sev, loc: 'New', e: st.ext.toFixed(1) + ' m²' }
        d.setK('ins', 'obs', [nw, ...st.obs])
      },
    }
    return o
  }

  if (id === 'ndt') {
    const st = d.ndt, gi = Math.min(st.g, g.nG - 1), o = base()
    o.inNote = 'Observation → question → test'
    o.segs = [
      seg('Test', ['UPV', 'Rebound', 'Cover', 'Half-cell'], st.test, (v: string) => d.setK('ndt', 'test', v)),
      seg('Girder', [...Array(g.nG)].map((_, j) => ({ v: j, l: 'G' + (j + 1) })), gi, (v: number) => d.setK('ndt', 'g', v)),
    ]
    o.inAction = { label: 'Generate synthetic readings', go: () => d.job('ndt', () => d.setK('ndt', 'seed', st.seed + 1)) }
    return o
  }

  if (id === 'synthetic') {
    const st = d.syn, M = st.mech, o = base()
    o.inNote = 'Reruns FEM per scenario'
    o.chipGroups = [chips('Mechanisms', ['Prestress loss', 'Stiffness reduction', 'Cracking', 'Corrosion', 'Bearing deterioration'], (x) => !!M[x], (x) => d.setK('syn', 'mech', { ...M, [x]: M[x] ? 0 : 1 }))]
    o.sliders = [
      sl('Location', st.loc, '× L', 0.05, 0.95, 0.01, 2, (v) => d.setK('syn', 'loc', v)),
      sl('Extent', st.ext, 'm', 1, 12, 0.5, 1, (v) => d.setK('syn', 'ext', v)),
      sl('Severity (EI / P loss)', st.sev, '%', 0, 60, 1, 0, (v) => d.setK('syn', 'sev', v)),
      sl('Records', st.n, '', 400, 6000, 100, 0, (v) => d.setK('syn', 'n', v)),
      sl('Noise', st.noise, '%', 0, 10, 0.5, 1, (v) => d.setK('syn', 'noise', v)),
    ]
    o.inAction = { label: 'Generate dataset', go: () => d.genDataset() }
    return o
  }

  if (id === 'features') {
    const st = d.feat, o = base()
    const act = FEATURES.filter((f) => st.on[f[0]])
    const selF = FEATURES.find((f) => f[0] === st.sel && st.on[f[0]]) || act[0] || FEATURES[0]
    o.inNote = act.length + ' of 10 features'
    o.chipGroups = [
      chips('Feature vector x', FEATURES.map((f) => f[0]), (x) => !!st.on[x], (x) => d.setK('feat', 'on', { ...st.on, [x]: st.on[x] ? 0 : 1 })),
      chips('Inspect feature', act.map((f) => f[0]), (x) => x === selF[0], (x) => d.setK('feat', 'sel', x)),
    ]
    o.segs = [seg('Normalisation', ['z-score', 'min-max'], st.norm, (v: string) => d.setK('feat', 'norm', v))]
    o.inAction = { label: 'Export feature matrix', go: () => d.job('feat', () => d.exportJSON()) }
    return o
  }

  if (id === 'ml') {
    const st = d.ml, iso = st.model === 'IsoForest', o = base()
    o.inNote = 'Async job'
    o.segs = [seg('Model', [{ v: 'Random Forest', l: 'RF' }, { v: 'XGBoost', l: 'XGBoost' }, { v: 'IsoForest', l: 'IsoForest' }], st.model, (v: string) => d.setK('ml', 'model', v))]
    o.sliders = [
      sl('Train split', st.split * 100, '%', 60, 90, 5, 0, (v) => d.setK('ml', 'split', v / 100)),
      sl(iso ? 'Estimators' : 'Trees', st.trees, '', 50, 500, 10, 0, (v) => d.setK('ml', 'trees', v)),
    ]
    o.predSliders = [
      sl('Δf₁', st.df, '%', -15, 0, 0.1, 1, (v) => d.setK('ml', 'df', v)),
      sl('δ_max', st.dmax, 'mm', 15, 35, 0.1, 1, (v) => d.setK('ml', 'dmax', v)),
      sl('UPV', st.upv, 'km/s', 2.8, 4.8, 0.01, 2, (v) => d.setK('ml', 'upv', v)),
    ]
    o.isML = true
    o.trainLabel = st.prog != null ? 'Training…' : 'Retrain ' + (iso ? 'IsoForest' : st.model)
    o.train = () => { d.bump('ml'); d.train() }
    return o
  }

  if (id === 'maintenance') {
    const st = d.mnt, o = base()
    o.inNote = 'Rule + evidence engine'
    o.segs = [
      seg('Investigate at class ≥', [{ v: 1, l: 'Minor' }, { v: 2, l: 'Deteriorated' }, { v: 3, l: 'Severe' }], st.trig, (v: number) => d.setK('mnt', 'trig', v)),
      seg('Risk tolerance', ['Low', 'Moderate', 'High'], st.risk, (v: string) => d.setK('mnt', 'risk', v)),
    ]
    o.sliders = [sl('Anomaly threshold', st.anom, '', 0.3, 0.9, 0.01, 2, (v) => d.setK('mnt', 'anom', v))]
    return o
  }

  if (id === 'report') {
    const st = d.rep, o = base()
    o.inNote = 'Section per stage'
    o.chipGroups = [
      chips('Include sections', SEC, (x) => !!st.on[SEC.indexOf(x)], (x) => { const arr = st.on.slice(); const j = SEC.indexOf(x); arr[j] = arr[j] ? 0 : 1; d.setK('rep', 'on', arr) }),
      chips('Edit intro for', SEC.filter((_, j) => st.on[j]), (x) => SEC.indexOf(x) === st.sel, (x) => d.setK('rep', 'sel', SEC.indexOf(x))),
    ]
    o.segs = [
      seg('Format', ['PDF', 'LaTeX', 'Markdown'], st.fmt, (v: string) => d.setK('rep', 'fmt', v)),
      seg('3D figures', [{ v: 'yes', l: 'Frozen renders' }, { v: 'no', l: 'Charts only' }], st.figs, (v: string) => d.setK('rep', 'figs', v)),
    ]
    const defIntro = (j: number) => 'This section records the ' + SEC[j].toLowerCase() + ' stage for the 33 m PSC I-girder bridge and the values passed to the next stage.'
    o.textFields = [{
      k: 'Intro · ' + SEC[st.sel],
      v: st.intro[st.sel] != null ? st.intro[st.sel] : defIntro(st.sel),
      on: (v: string) => d.setK('rep', 'intro', { ...st.intro, [st.sel]: v }),
    }]
    o.inAction = { label: 'Compile ' + st.fmt, go: () => d.job('rep', () => d.setK('rep', 'ver', st.ver + 1)) }
    return o
  }

  return EMPTY
}
