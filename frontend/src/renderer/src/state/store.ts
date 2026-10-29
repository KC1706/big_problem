import { create } from 'zustand'

/** Theme ids match the design's `data-theme` values. */
export type Theme = 'light' | 'dark'

/**
 * Geometry object that drives `<bridge-twin>` (metres). Keys and defaults are a
 * 1:1 port of the design's `geom` default (bridge-twin.js `_build`). The twin
 * JSON-parses this; the HUD/backend adapter will reshape it in F5.
 */
export interface Geom {
  span: number
  depth: number
  web: number
  tfw: number
  tft: number
  bfw: number
  bft: number
  slab: number
  nG: number
  sp: number
}

export const DEFAULT_GEOM: Geom = {
  span: 33,
  depth: 1.65,
  web: 0.3,
  tfw: 1.1,
  tft: 0.18,
  bfw: 0.75,
  bft: 0.25,
  slab: 0.22,
  nG: 5,
  sp: 3.2,
}

export type Status = 'done' | 'progress' | 'ready' | 'locked'
export type Row = readonly [k: string, v: string]
export type Big = readonly [k: string, v: string, u: string]

/** The 13 lifecycle stages. Ported verbatim from the Studio `data()`.
 *  `ws` = has input/result panels (everything except the dashboard).
 *  The `<bridge-twin stage>` attribute value equals the id.
 *  Note: rows/big for ws-stages marked dynamic (config/monitoring/ml) are empty
 *  here and get computed per-stage in F3+. */
export interface StageDef {
  id: string
  num: string
  name: string
  status: Status
  lens: string
  ws: boolean
  title: string
  desc: string
  rows: ReadonlyArray<Row>
  big: ReadonlyArray<Big>
  action: string
  ai?: boolean // shows the honesty banner (ML & Maintenance)
}

export const STAGES: StageDef[] = [
  {
    id: 'dashboard', num: '00', name: 'Dashboard', status: 'done', lens: 'Studio', ws: false,
    title: 'Bridge digital twin',
    desc: 'One model carries every stage. Pins show the latest result from each completed stage.',
    rows: [['Stages complete', '9 / 12'], ['Last run', 'AI/ML training · 4 min ago'], ['Engine', 'OpenSeesPy'], ['Span', '33.0 m']],
    big: [['Span', '33.0', 'm'], ['Baseline f₁', '3.21', 'Hz'], ['Pₑ / P₀', '0.804', ''], ['Condition · 0.82', 'Minor', '']],
    action: 'Resume · AI/ML assessment',
  },
  {
    id: 'config', num: '01', name: 'Configuration', status: 'done', lens: 'Blueprint · exploded', ws: true,
    title: 'Bridge configuration',
    desc: 'Section geometry drives the model. Change a value and the 3D girders rebuild.',
    rows: [], big: [], action: '',
  },
  {
    id: 'analysis', num: '02', name: 'Analysis & design', status: 'done', lens: 'Load · ×50', ws: true,
    title: 'Structural analysis',
    desc: 'IRC Class 70R crossing at crawl speed. Deflection is exaggerated ×50 so the response is visible.',
    rows: [['Live load', 'IRC Class 70R'], ['Impact factor', '1.10'], ['SIDL', '20 kN/m + 5 kN/m²'], ['Distribution', 'Courbon'], ['Utilization', '0.78 ✓']],
    big: [['M_max', '6,840', 'kN·m'], ['V_max', '1,120', 'kN'], ['σ_bot', '−2.1', 'MPa'], ['δ mid-span', '18.4', 'mm']],
    action: 'Run analysis',
  },
  {
    id: 'prestress', num: '03', name: 'Prestressing', status: 'done', lens: 'X-ray', ws: true,
    title: 'Prestressing system',
    desc: 'Three 19T13 cables per girder on parabolic profiles. The glass view shows the ducts inside the web.',
    rows: [['Cables', '3 × 19T13'], ['Duct diameter', '90 mm'], ['Friction μ · K', '0.17 · 0.002/m'], ['Anchorage slip', '6 mm'], ['Pₑ < P₀', '✓']],
    big: [['P₀', '7,850', 'kN'], ['Total loss', '19.6', '%'], ['Pₑ', '6,310', 'kN'], ['Camber', '12', 'mm']],
    action: 'Edit cable profile',
  },
  {
    id: 'baseline', num: '04', name: 'Healthy baseline', status: 'done', lens: 'Modes · scan', ws: true,
    title: 'Healthy baseline',
    desc: 'First three bending modes of the healthy model. This fingerprint is the reference for every later comparison.',
    rows: [['Mode 1', '3.21 Hz'], ['Mode 2', '5.86 Hz'], ['Mode 3', '8.41 Hz'], ['UPV nominal', '4.30 km/s'], ['Rebound nominal', '38']],
    big: [['f₁', '3.21', 'Hz'], ['f₂', '5.86', 'Hz'], ['f₃', '8.41', 'Hz'], ['δ reference', '18.4', 'mm']],
    action: 'Re-establish baseline',
  },
  {
    id: 'inspection', num: '05', name: 'Visual inspection', status: 'done', lens: 'Inspect · soffit', ws: true,
    title: 'Visual inspection',
    desc: 'Observations are pinned to components. Colour follows the condition scale.',
    rows: [['Components', '11 / 11'], ['Observations', '14'], ['Worst', 'Bearing B5 · Deteriorated'], ['Photos', '23']],
    big: [['Visual index', '0.78', ''], ['Cracks', '5', ''], ['Spalling', '2', ''], ['Corrosion', '3', '']],
    action: 'Add observation',
  },
  {
    id: 'ndt', num: '06', name: 'NDT', status: 'done', lens: 'Heat · UPV', ws: true,
    title: 'Non-destructive testing',
    desc: 'UPV readings painted on the girder faces. Bands follow IS 13311 Pt.1; verify against the current code.',
    rows: [['UPV points', '48'], ['Rebound points', '36'], ['Cover meter', '12'], ['SonReb f_ck est.', '41.8 MPa']],
    big: [['UPV mean', '4.31', 'km/s'], ['UPV min', '3.28', 'km/s'], ['Rebound', '38', ''], ['Doubtful', '3', 'pts']],
    action: 'Plan tests',
  },
  {
    id: 'monitoring', num: '07', name: 'Monitoring', status: 'done', lens: 'Sensors', ws: true,
    title: 'Vibration monitoring',
    desc: 'Accelerometers on girder soffits. The trace and spectrum update live from the selected sensor.',
    rows: [], big: [], action: '',
  },
  {
    id: 'synthetic', num: '08', name: 'Synthetic data', status: 'done', lens: 'Damage · ×100', ws: true,
    title: 'Synthetic data studio',
    desc: 'Scenario S-07: localized stiffness loss at G5 mid-span. Sag is exaggerated ×100.',
    rows: [['Mechanism', 'Prestress loss + cracking'], ['Location', 'G5 · 0.50 L'], ['Extent', '6.0 m'], ['Label', 'Deteriorated'], ['Noise', '3 %']],
    big: [['Records', '2,400', ''], ['Classes', '4', ''], ['f₁', '2.94', 'Hz'], ['δ', '24.9', 'mm']],
    action: 'Generate dataset',
  },
  {
    id: 'features', num: '09', name: 'Features', status: 'done', lens: 'Pins', ws: true,
    title: 'Feature extraction',
    desc: 'Ten features per record, from frequency, acceleration, deflection, strain and NDT.',
    rows: [['Vector', '10 features'], ['Records', '2,400'], ['Strongest |r|', 'f₁ ↔ δ_max · −0.91'], ['Top preview', 'Δf₁']],
    big: [['Δf₁', '−8.4', '%'], ['a_RMS', '0.051', 'g'], ['δ_max', '24.9', 'mm'], ['Kurtosis', '3.4', '']],
    action: 'Export matrix',
  },
  {
    id: 'ml', num: '10', name: 'AI/ML assessment', status: 'progress', lens: 'Condition', ws: true,
    title: 'AI/ML condition assessment',
    desc: 'Train a classifier on the synthetic dataset, then test it live with your own feature values.',
    rows: [], big: [], action: '', ai: true,
  },
  {
    id: 'maintenance', num: '11', name: 'Maintenance', status: 'ready', lens: 'Condition · actions', ws: true,
    title: 'Maintenance decision',
    desc: 'Evidence from inspection, NDT, monitoring and the model points to a detailed investigation of G5.',
    rows: [['Path', 'Detailed investigation'], ['Actions', '4'], ['Reinspection', '6 months'], ['Risk tolerance', 'Moderate']],
    big: [['Priority', 'High', ''], ['Next action', 'G5 NDT', ''], ['Reinspect', '6', 'mo'], ['Actions', '4', '']],
    action: 'Confirm decision', ai: true,
  },
  {
    id: 'report', num: '12', name: 'Report', status: 'ready', lens: 'Elevation', ws: true,
    title: 'Integrated report',
    desc: 'Compiles every stage into one document: the integrated story of one bridge.',
    rows: [['Sections', '12'], ['Figures', '42'], ['Tables', '18'], ['Formats', 'PDF · LaTeX · Markdown']],
    big: [['Sections', '12', ''], ['Figures', '42', ''], ['Tables', '18', ''], ['Status', 'Locked', '']],
    action: 'Locked',
  },
]

/** Status → [label, colour] for the results-panel chip (port of `SL`). */
export const STATUS_META: Record<Status, readonly [string, string]> = {
  done: ['Complete', 'var(--ink)'],
  progress: ['In progress', 'var(--acc)'],
  ready: ['Ready', 'var(--faint)'],
  locked: ['Locked', 'var(--line)'],
}

/** Eyebrow line for a stage (port of `cur.eyebrow`). */
export function stageEyebrow(s: StageDef): string {
  return (s.num === '00' ? 'Overview' : 'Stage ' + s.num) + ' · ' + s.name
}

export type Tab = 'results' | 'inputs'

/** Per-stage input slices — direct ports of the design's state slices. */
export interface Ana { load: string; IF: number; barrier: number; fp: number; dist: string; a: number }
export interface Base { engine: string; mass: string; zeta: number; Ec: number; ver: number }
export interface Mon { sensors: number; fs: number; dur: number; ex: string }

export const DEFAULT_ANA: Ana = { load: '70R', IF: 1.1, barrier: 20, fp: 5, dist: 'Courbon', a: 16.5 }
export const DEFAULT_BASE: Base = { engine: 'OpenSeesPy', mass: 'incl', zeta: 2, Ec: 33.5, ver: 1 }
export const DEFAULT_MON: Mon = { sensors: 6, fs: 200, dur: 600, ex: 'Ambient' }

// F4 slices — ports of the remaining design state slices.
export interface Pre { n: number; strands: number; jack: number; mu: number; K: number; slip: number }
export interface Obs { c: string; d: string; s: number; loc: string; e: string }
export interface Ins { sel: string; defect: string; sev: number; ext: number; obs: Obs[] }
export interface Ndt { test: string; g: number; seed: number }
export interface Syn { mech: Record<string, number>; loc: number; ext: number; sev: number; n: number; noise: number; ver: number }
export interface Feat { on: Record<string, number>; sel: string; norm: string }
export interface Ml { model: string; split: number; trees: number; prog: number | null; df: number; dmax: number; upv: number }
export interface Mnt { trig: number; anom: number; risk: string }
export interface Rep { on: number[]; fmt: string; figs: string; sel: number; intro: Record<number, string>; ver: number }
export interface Wz { name: string; student: string; roll: string; span: number; grade: string }

export const DEFAULT_PRE: Pre = { n: 3, strands: 19, jack: 0.75, mu: 0.17, K: 0.002, slip: 6 }
export const DEFAULT_INS: Ins = {
  sel: 'girders', defect: 'Cracking', sev: 1, ext: 0.5,
  obs: [
    { c: 'girders', d: 'Cracking', s: 1, loc: 'G5 · 0.50 L', e: '0.3 mm' },
    { c: 'bearings', d: 'Corrosion staining', s: 2, loc: 'B5', e: 'Grade 3' },
    { c: 'deck', d: 'Leakage', s: 1, loc: 'Soffit bay 4', e: '0.6 m²' },
    { c: 'ej', d: 'Surface deterioration', s: 1, loc: 'EJ1', e: '—' },
    { c: 'drain', d: 'Leakage', s: 1, loc: 'Spout D3', e: '—' },
    { c: 'abut', d: 'Honeycombing', s: 1, loc: 'A2 face', e: '0.2 m²' },
  ],
}
export const DEFAULT_NDT: Ndt = { test: 'UPV', g: 4, seed: 1 }
export const DEFAULT_SYN: Syn = { mech: { 'Prestress loss': 1, Cracking: 1 }, loc: 0.5, ext: 6, sev: 35, n: 2400, noise: 3, ver: 7 }
export const DEFAULT_FEAT: Feat = { on: { 'f₁': 1, 'f₂': 1, 'f₃': 1, a_RMS: 1, a_max: 1, 'Kurt.': 1, 'δ_max': 1, 'ε_max': 1, UPV: 1, RH: 1 }, sel: 'f₁', norm: 'z-score' }
export const DEFAULT_ML: Ml = { model: 'Random Forest', split: 0.8, trees: 300, prog: null, df: -8.4, dmax: 24.9, upv: 3.71 }
export const DEFAULT_MNT: Mnt = { trig: 2, anom: 0.6, risk: 'Moderate' }
export const DEFAULT_REP: Rep = { on: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], fmt: 'PDF', figs: 'yes', sel: 0, intro: {}, ver: 0 }
export const DEFAULT_WZ: Wz = { name: 'NH-16 Mahananda Bridge', student: '', roll: '', span: 33, grade: 'M45' }

interface AppState {
  i: number // active stage index 0..12
  theme: Theme
  paused: boolean
  replay: number // bump to re-trigger the twin's build-in intro
  w: number // viewport width, drives responsive breakpoints (port of state.w)
  tab: Tab // narrow-mode panel toggle
  welcome: boolean // welcome overlay (built in F4)
  g: Geom
  ana: Ana
  base: Base
  mon: Mon
  pre: Pre
  ins: Ins
  ndt: Ndt
  syn: Syn
  feat: Feat
  ml: Ml
  mnt: Mnt
  rep: Rep
  wz: Wz
  jobs: Record<string, number | null> // async job progress 0..100 or null
  tick: number // monitoring animation counter
  go: (i: number) => void // design go(): wraps + resets tab to 'results'
  next: () => void
  prev: () => void
  setW: (w: number) => void
  setTab: (tab: Tab) => void
  openWelcome: () => void
  toggleTheme: () => void
  togglePause: () => void
  doReplay: () => void
  setG: (k: keyof Geom, v: number) => void
  setAna: <K extends keyof Ana>(k: K, v: Ana[K]) => void
  setBase: <K extends keyof Base>(k: K, v: Base[K]) => void
  setMon: <K extends keyof Mon>(k: K, v: Mon[K]) => void
  setK: (slice: SliceName, k: string, v: unknown) => void
  train: () => void
  createProject: () => void
  skipWelcome: () => void
  job: (key: string, done?: () => void) => void
  bumpTick: () => void
}

type SliceName = 'pre' | 'ins' | 'ndt' | 'syn' | 'feat' | 'ml' | 'mnt' | 'rep' | 'wz'

const N = STAGES.length
const timers: Record<string, ReturnType<typeof setInterval>> = {}

export const useStore = create<AppState>((set, get) => ({
  i: 0,
  theme: 'light',
  paused: false,
  replay: 0,
  w: typeof window !== 'undefined' ? window.innerWidth : 1440,
  tab: 'results',
  welcome: true, // first-run welcome overlay (matches the design default)
  g: DEFAULT_GEOM,
  ana: DEFAULT_ANA,
  base: DEFAULT_BASE,
  mon: DEFAULT_MON,
  pre: DEFAULT_PRE,
  ins: DEFAULT_INS,
  ndt: DEFAULT_NDT,
  syn: DEFAULT_SYN,
  feat: DEFAULT_FEAT,
  ml: DEFAULT_ML,
  mnt: DEFAULT_MNT,
  rep: DEFAULT_REP,
  wz: DEFAULT_WZ,
  jobs: {},
  tick: 0,
  // go() wraps around and resets the tab, matching the design's go().
  go: (i) => set({ i: ((i % N) + N) % N, tab: 'results' }),
  next: () => set((s) => ({ i: (s.i + 1) % N, tab: 'results' })),
  prev: () => set((s) => ({ i: (s.i - 1 + N) % N, tab: 'results' })),
  setW: (w) => set((s) => (w === s.w ? s : { w })),
  setTab: (tab) => set({ tab }),
  openWelcome: () => set({ welcome: true }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  doReplay: () => set((s) => ({ replay: s.replay + 1 })),
  setG: (k, v) => set((s) => ({ g: { ...s.g, [k]: v } })),
  setAna: (k, v) => set((s) => ({ ana: { ...s.ana, [k]: v } })),
  setBase: (k, v) => set((s) => ({ base: { ...s.base, [k]: v } })),
  setMon: (k, v) => set((s) => ({ mon: { ...s.mon, [k]: v } })),
  // Generic slice setter for the F4 slices (port of DCLogic.setK).
  setK: (slice, k, v) =>
    set((s) => ({ [slice]: { ...(s[slice] as unknown as Record<string, unknown>), [k]: v } }) as Partial<AppState>),
  // ML training progress (port of DCLogic.train).
  train: () => {
    if (get().ml.prog != null) return
    clearInterval(timers.mlTrain)
    set((s) => ({ ml: { ...s.ml, prog: 0 } }))
    timers.mlTrain = setInterval(() => {
      const p = get().ml.prog
      if (p == null || p >= 100) { clearInterval(timers.mlTrain); set((s) => ({ ml: { ...s.ml, prog: null } })); return }
      set((s) => ({ ml: { ...s.ml, prog: Math.min(100, (s.ml.prog ?? 0) + 2.5) } }))
    }, 50)
  },
  // Welcome actions (ports of wel.create / wel.skip).
  createProject: () =>
    set((s) => ({
      welcome: false, i: 0, replay: s.replay + 1,
      g: { ...s.g, span: s.wz.span, depth: Math.round((s.wz.span / 20) * 100) / 100 },
    })),
  skipWelcome: () => set({ welcome: false }),
  // Async job with a 0→100 progress bar (port of DCLogic.job).
  job: (key, done) => {
    clearInterval(timers[key])
    set((s) => ({ jobs: { ...s.jobs, [key]: 0 } }))
    timers[key] = setInterval(() => {
      const p = get().jobs[key]
      if (p == null || p >= 100) {
        clearInterval(timers[key])
        set((s) => ({ jobs: { ...s.jobs, [key]: null } }))
        done?.()
        return
      }
      set((s) => ({ jobs: { ...s.jobs, [key]: Math.min(100, (s.jobs[key] ?? 0) + 3) } }))
    }, 50)
  },
  bumpTick: () => set((s) => ({ tick: s.tick + 1 })),
}))
