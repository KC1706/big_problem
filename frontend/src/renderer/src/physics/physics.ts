import { DEFAULT_ANA, type Geom, type Ana, type Base } from '@/state/store'

/**
 * Verbatim port of the Studio prototype's inline physics (section, cal, calcAna,
 * calcPre, calcF1). These produce the exact numbers the design shows, so the F3
 * panels pixel-match the oracle. F5 replaces them with the FastAPI backend —
 * the UI shapes stay the same.
 *
 * NOT engineering-grade: `cal()` back-solves scale factors (k.M/d/V/L/c/f) so the
 * default 33 m section reproduces the target display values (6840 kN·m, 18.4 mm,
 * 1120 kN, 19.6 %, 12 mm, 3.21 Hz). The real IRC/IS-correct values come from the
 * backend. Kept as-is for fidelity only.
 */

export interface Pre { n: number; strands: number; jack: number; mu: number; K: number; slip: number }

export interface Section {
  pts: Array<[number, number]>
  A: number
  At: number
  yb: number
  I: number
  Zb: number
  Zt: number
  H: number
  cy: number
  Ic: number
}

export function section(g: Geom): Section {
  const { depth: D, web: tw, tfw: bt, tft: tt, bfw: bf, bft: tb, slab, sp } = g
  const pts: Array<[number, number]> = [
    [-bf / 2, 0], [bf / 2, 0], [bf / 2, tb], [tw / 2, tb + 0.15], [tw / 2, D - tt - 0.12],
    [bt / 2, D - tt], [bt / 2, D], [-bt / 2, D], [-bt / 2, D - tt], [-tw / 2, D - tt - 0.12],
    [-tw / 2, tb + 0.15], [-bf / 2, tb],
  ]
  let A = 0, Sy = 0, Ix = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length], c = x0 * y1 - x1 * y0
    A += c; Sy += (y0 + y1) * c; Ix += (y0 * y0 + y0 * y1 + y1 * y1) * c
  }
  A /= 2
  const cy = Sy / (6 * A)
  const Ic = Ix / 12 - A * cy * cy
  const As = sp * slab, ys = D + slab / 2, Is = (sp * slab ** 3) / 12, At = A + As
  const yb = (A * cy + As * ys) / At
  const I = Ic + A * (cy - yb) ** 2 + Is + As * (ys - yb) ** 2
  const H = D + slab
  return { pts, A, At, yb, I, Zb: I / yb, Zt: I / (H - yb), H, cy, Ic }
}

export interface K { M: number; d: number; V: number; L: number; c: number; f: number }

let _cal: K | null = null

export function cal(): K {
  if (_cal) return _cal
  const g0: Geom = { span: 33, depth: 1.65, web: 0.3, tfw: 1.1, tft: 0.18, bfw: 0.75, bft: 0.25, slab: 0.22, nG: 5, sp: 3.2 }
  const s0 = section(g0)
  const a0: Ana = { load: '70R', IF: 1.1, barrier: 20, fp: 5, dist: 'Courbon', a: 16.5 }
  const p0: Pre = { n: 3, strands: 19, jack: 0.75, mu: 0.17, K: 0.002, slip: 6 }
  const b0: Base = { engine: 'OpenSeesPy', mass: 'incl', zeta: 2, Ec: 33.5, ver: 1 }
  const k: K = { M: 1, d: 1, V: 1, L: 1, c: 0, f: 1 }
  k.M = 6840 / calcAna(g0, s0, a0, k).Mt
  const r1 = calcAna(g0, s0, a0, k); k.d = 18.4 / r1.dLL; k.V = 1120 / r1.V
  const an0 = calcAna(g0, s0, a0, k)
  k.L = 19.6 / calcPre(g0, s0, p0, an0, k).tot
  k.c = 12 - calcPre(g0, s0, p0, an0, k).camber
  k.f = 3.21 / calcF1(g0, s0, b0, an0, k).f1
  return (_cal = k)
}

export function calcAna(g: Geom, sec: Section, a0?: Ana, k0?: K) {
  const a = a0 ?? DEFAULT_ANA
  const k = k0 ?? cal()
  const L = g.span, E = 33.5e6
  const wSelf = sec.At * 25 * k.M
  const wSidl = (a.barrier * 2 / g.nG + 0.065 * 22 * g.sp + a.fp * 1.5 * 2 / g.nG) * k.M
  const w = wSelf + wSidl
  const P = a.load === '70R' ? 1000 : a.load === 'Class A' ? 554 : 1554
  const DF = a.dist === 'Courbon' ? 0.32 : 0.27, Pe = P * DF * a.IF * k.M, pos = Math.min(L, a.a)
  const Mdl = (w * L * L) / 8, Mll = (Pe * L) / 4, Mt = Mdl + Mll, V = (w * L / 2 + Pe) * k.V
  const dLL = ((Pe * L ** 3) / (48 * E * sec.I)) * 1000 * k.d, lim = (L * 1000) / 800
  const X = (x: number) => (10 + (x / L) * 280).toFixed(1), N = 60
  let pd = '', pt = '', pe = ''
  for (let j = 0; j <= N; j++) {
    const x = (j / N) * L, md = (w * x * (L - x)) / 2
    const ml = x < pos ? (Pe * x * (L - pos)) / L : (Pe * pos * (L - x)) / L
    const me = md + (Pe * x * (L - x)) / L
    const Y = (m: number) => (20 + (m / Mt) * 90).toFixed(1)
    pd += (j ? 'L' : 'M') + X(x) + ' ' + Y(md)
    pt += (j ? 'L' : 'M') + X(x) + ' ' + Y(md + ml)
    pe += (j ? 'L' : 'M') + X(x) + ' ' + Y(me)
  }
  const VY = (v: number) => (55 - (v / (w * L / 2 + Pe)) * 40).toFixed(1), Ra = (Pe * (L - pos)) / L
  const ps =
    'M10 55 L10 ' + VY(w * L / 2 + Ra) + ' L' + X(pos) + ' ' + VY(w * (L / 2 - pos) + Ra) +
    ' L' + X(pos) + ' ' + VY(w * (L / 2 - pos) + Ra - Pe) + ' L290 ' + VY(-w * L / 2 + Ra - Pe) + ' L290 55'
  return { w, wSelf, wSidl, Pe, Mdl, Mll, Mt, V, dLL, lim, pd, pt: pt + ' L290 20 L10 20 Z', pe, ps, posX: X(pos), MtY: 116, L }
}

export function calcF1(g: Geom, sec: Section, b: Base, an: ReturnType<typeof calcAna>, k0?: K) {
  const k = k0 ?? cal(), L = g.span
  const m = sec.At * 2500 + (b.mass === 'incl' ? (an.wSidl * 1000) / 9.81 : 0)
  const EI = b.Ec * 1e9 * sec.I
  return { m, EI, f1: (Math.PI / (2 * L * L)) * Math.sqrt(EI / m) * k.f }
}

export function calcPre(g: Geom, sec: Section, p: Pre, an: ReturnType<typeof calcAna>, k0?: K) {
  const k = k0 ?? cal(), L = g.span, D = g.depth
  const P0 = (p.n * p.strands * 98.7 * 1860 * p.jack) / 1000
  const ycE = 0.52 * D, ycM = 0.11 * D, th = (8 * (ycE - ycM)) / L, r = P0 / 7848
  const raw = [
    (1 - Math.exp(-(p.mu * th + (p.K * L) / 2))) * 100,
    ((195000 * p.slip) / 1000 / (L / 2) / (p.jack * 1860)) * 100 * 0.5,
    2.4 * r * (0.85 / sec.A), 6 * r * (0.85 / sec.A), 3.2, 2.5 * (p.jack / 0.75) ** 2,
  ]
  const [L1, L2, L3, L4, L5, L6] = raw.map((v) => v * k.L)
  const tot = L1 + L2 + L3 + L4 + L5 + L6, Pe = P0 * (1 - tot / 100), e = sec.cy - ycM, Zg = sec.Ic / sec.cy
  const Mg = sec.A * 25 * L * L / 8, Pi = P0 * (1 - (L1 + L2 + L3) / 100)
  const sT = (Pi / sec.A + (Pi * e) / Zg - Mg / Zg) / 1000
  const sS = (Pe / sec.A + (Pe * e) / Zg - Mg / Zg) / 1000 - (an.Mt - Mg) / sec.Zb / 1000
  const EI = 33.5e6 * sec.I
  const camber = ((5 * Pe * e * L * L) / (48 * EI) - (5 * sec.At * 25 * L ** 4) / (384 * EI)) * 1000 + k.c
  return { P0, L1, L2, L3, L4, L5, L6, tot, Pe, sT, sS, camber }
}
