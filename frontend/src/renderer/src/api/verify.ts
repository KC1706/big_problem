import { useEffect, useMemo } from 'react'
import { useStore } from '@/state/store'
import type { Ana, Base, Big, Feat, Geom, Ml, Mon, Pre, Syn } from '@/state/store'
import { useBackend } from './useBackend'
import { apiPost } from './client'
import { gToSectionConfig, mm2ToM2, mm3ToM3, mm4ToM4, mmToM } from './adapter'
import { COL, FEATURES, SEVN } from '@/stage/data'
import { mlScoreOf } from '@/stage/results'
import type { AnalysisResponse, BaselineResponse, FeaturesResponse, MLPipelineResponse, PrestressResponse, SectionProperties, SignalResponse, SyntheticClass, SyntheticResponse } from './types'

const GREEN = '#4fae7f', RED = '#e0442f', AMBER = '#e6893c'
const f0 = (n: number) => Math.round(n).toLocaleString()

/** A partial override of the current stage's ResultsModel: the backend-verified
 *  fields replace the local physics.ts preview when they arrive. */
export interface Verify {
  patch: Record<string, unknown> | null
  verifying: boolean
}

const NONE: Verify = { patch: null, verifying: false }
const SUB = '₁₂₃'

/** Build an SVG mode-shape path (viewBox 300×44) from a real mode-shape array. */
function modePath(shape: number[], xs: number[], L: number): string {
  const peak = Math.max(1e-6, ...shape.map((v) => Math.abs(v)))
  let q = ''
  for (let i = 0; i < shape.length; i++) {
    const X = (xs[i] / L) * 300
    const Y = 22 - 15 * (shape[i] / peak)
    q += (i ? 'L' : 'M') + X.toFixed(1) + ' ' + Y.toFixed(1)
  }
  return q
}

const LIVE_LOAD: Record<string, string> = { '70R': '70R', 'Class A': 'ClassA', '70R + A': '70R+A' }
const EXCITATION: Record<string, string> = { Ambient: 'ambient', Impact: 'impulse', Vehicle: 'ambient' }

export function useVerify(id: string, g: Geom, base: Base, ana: Ana, pre: Pre, mon: Mon, syn: Syn, feat: Feat, ml: Ml): Verify {
  const isConfig = id === 'config'
  const isBaseline = id === 'baseline'
  const isAnalysis = id === 'analysis'
  const isPrestress = id === 'prestress'
  const isMonitoring = id === 'monitoring'
  const isSynthetic = id === 'synthetic'
  const isFeatures = id === 'features'
  const isMl = id === 'ml'
  const isDashboard = id === 'dashboard'
  const recompute = useStore((st) => st.recompute) // nonces bumped by the Run/Establish/Retrain buttons

  const cfg = useBackend<SectionProperties>(
    () => apiPost<SectionProperties>('/config/properties', gToSectionConfig(g)),
    [JSON.stringify(g)],
    isConfig,
  )

  // Structural model chosen on the Baseline stage drives the WHOLE SHM pipeline
  // (baseline, monitoring, synthetic, features, ML) so every stage shares one set
  // of modal frequencies — realistic grillage by default, analytical if toggled.
  const engKind = base.engine === 'OpenSeesPy' ? 'openseespy' : 'analytical'

  const bsl = useBackend<BaselineResponse>(
    () => apiPost<BaselineResponse>('/baseline/establish', {
      section: gToSectionConfig(g),
      engine: engKind,
      ec_gpa: base.Ec,
      mass_mode: base.mass,
      zeta: base.zeta,
    }),
    [JSON.stringify(g), base.engine, base.Ec, base.mass, base.zeta, recompute.base],
    isBaseline || isMonitoring || isDashboard, // monitoring + dashboard read this modal baseline
  )

  const anl = useBackend<AnalysisResponse>(
    () => apiPost<AnalysisResponse>('/analysis/run', {
      section: gToSectionConfig(g),
      live_load: LIVE_LOAD[ana.load] ?? '70R',
      distribution: ana.dist,
      barrier_kN_m: ana.barrier,
      footpath_kN_m2: ana.fp,
    }),
    [JSON.stringify(g), ana.load, ana.dist, ana.barrier, ana.fp, recompute.ana],
    isAnalysis,
  )

  const prs = useBackend<PrestressResponse>(
    () => apiPost<PrestressResponse>('/prestress/compute', {
      section: gToSectionConfig(g),
      n_cables: pre.n,
      strands_per_cable: pre.strands,
      jack_fraction: pre.jack,
      mu: pre.mu,
      K: pre.K,
      anchorage_slip: pre.slip,
    }),
    [JSON.stringify(g), pre.n, pre.strands, pre.jack, pre.mu, pre.K, pre.slip],
    isPrestress || isDashboard, // dashboard shows the real Pₑ/P₀
  )

  // Monitoring: real ambient-vibration simulation + FFT. A second realization of
  // the same healthy structure (different seed) is the baseline fingerprint overlay.
  const sigBody = {
    section: gToSectionConfig(g),
    duration: mon.dur,
    fs: mon.fs,
    sensor_x_frac: 0.5, // design header: A5 · L/2
    excitation: EXCITATION[mon.ex] ?? 'ambient',
    noise_frac: 0.03,
    ec_gpa: base.Ec, // match the Baseline stage so measured f₁ ≈ baseline f₁
    mass_mode: base.mass,
    zeta: base.zeta,
    engine: engKind,
  }
  const monDeps = [JSON.stringify(g), mon.fs, mon.dur, mon.ex, base.Ec, base.mass, base.zeta, engKind]
  const sig = useBackend<SignalResponse>(
    () => apiPost<SignalResponse>('/monitoring/signal', { ...sigBody, seed: 2 }),
    monDeps,
    isMonitoring,
  )
  const bas = useBackend<SignalResponse>(
    () => apiPost<SignalResponse>('/monitoring/signal', { ...sigBody, seed: 101 }),
    monDeps,
    isMonitoring,
  )

  // Synthetic: live damage-scenario preview (real engine). The full ML dataset is
  // generated on demand (preview_only: false), not on every slider move.
  const synMechs = Object.keys(syn.mech).filter((k) => syn.mech[k])
  const synth = useBackend<SyntheticResponse>(
    () => apiPost<SyntheticResponse>('/synthetic/generate', {
      section: gToSectionConfig(g),
      mechanisms: synMechs,
      location: syn.loc,
      extent_m: syn.ext,
      severity_pct: syn.sev,
      noise_frac: syn.noise / 100,
      preview_only: true,
      engine: engKind,
    }),
    [JSON.stringify(g), JSON.stringify(syn.mech), syn.loc, syn.ext, syn.sev, syn.noise, engKind],
    isSynthetic,
  )

  // Features: real correlation / per-class distributions / importance from a labelled
  // dataset. Depends only on geometry (+noise); feature toggles subset it client-side.
  const feats = useBackend<FeaturesResponse>(
    () => apiPost<FeaturesResponse>('/features/matrix', {
      section: gToSectionConfig(g),
      noise_frac: syn.noise / 100,
      engine: engKind,
    }),
    [JSON.stringify(g), syn.noise, engKind],
    isFeatures,
  )

  // ML: self-contained pipeline — generate dataset, train the chosen model, predict
  // the live feature vector. Fixed dataset seed → confusion/accuracy/importance stay
  // stable while the prediction sliders move.
  const mlp = useBackend<MLPipelineResponse>(
    () => apiPost<MLPipelineResponse>('/ml/pipeline', {
      section: gToSectionConfig(g),
      model: ml.model,
      split: ml.split,
      n_estimators: ml.trees,
      df_pct: ml.df,
      delta_mm: ml.dmax,
      upv: ml.upv,
      engine: engKind,
    }),
    [JSON.stringify(g), ml.model, ml.split, ml.trees, ml.df, ml.dmax, ml.upv, engKind, recompute.ml],
    isMl,
  )

  const mlReal = useStore((st) => st.mlReal)
  // Persist the REAL ML outcome so the Maintenance stage acts on the actual
  // classifier result (not the slider heuristic). cls = severity index 0..3.
  const setMlReal = useStore((st) => st.setMlReal)
  useEffect(() => {
    if (!isMl || !mlp.data) return
    const d = mlp.data, iso = d.model === 'IsoForest'
    const cls = iso ? (d.anomaly_score > 0.5 ? 2 : 0) : Math.max(0, SEVN.indexOf(d.prediction))
    setMlReal({
      pred: d.prediction,
      conf: iso ? d.anomaly_score : d.confidence,
      anom: d.anomaly_score ?? 0,
      iso,
      cls,
    })
  }, [isMl, mlp.data, setMlReal])

  return useMemo<Verify>(() => {
    if (isDashboard) {
      // Overlay the backend-true f₁ (grillage) and Pₑ/P₀ onto the dashboard's
      // local preview; span/condition/rows come from the local buildResults.
      if (!bsl.data || !prs.data) return { patch: null, verifying: bsl.loading || prs.loading }
      const f1 = bsl.data.modal.frequencies[0] ?? 0
      const ratio = prs.data.P0_kN > 0 ? prs.data.Pe_kN / prs.data.P0_kN : 0
      const { cls, conf } = mlReal ? { cls: mlReal.cls, conf: mlReal.conf } : mlScoreOf(ml)
      const cond = mlReal ? mlReal.pred : SEVN[cls]
      const big: Big[] = [
        ['Span', g.span.toFixed(1), 'm'],
        ['Baseline f₁', f1.toFixed(2), 'Hz'],
        ['Pₑ / P₀', ratio.toFixed(3), ''],
        ['Condition · ' + conf.toFixed(2), cond, ''],
      ]
      // Real values for the 3D twin's dashboard callouts (E4 data channel).
      const fp = bsl.data.fingerprint
      const twin: Record<string, string> = {
        f1: f1.toFixed(2),
        peGirder: pre.n ? Math.round(prs.data.Pe_kN / pre.n).toLocaleString() : f0(prs.data.Pe_kN),
        delta: (fp.delta_max ?? 0).toFixed(1),
        upv: (fp.upv_nominal ?? 4.3).toFixed(2),
        cond,
        conf: conf.toFixed(2),
      }
      return { patch: { big, twin }, verifying: bsl.loading || prs.loading }
    }

    if (isAnalysis) {
      if (!anl.data) return { patch: null, verifying: anl.loading }
      const d = anl.data
      const big: Big[] = [
        ['M_max', f0(d.moment_mid_kNm), 'kN·m'],
        ['V_max', f0(d.shear_end_kN), 'kN'],
        ['δ live', d.deflection_mm.toFixed(1), 'mm'],
        ['δ / limit', (d.deflection_mm / d.deflection_limit_mm).toFixed(2), ''],
      ]
      const rows = [
        { k: 'w dead (self + deck)', v: d.dead_load_kN_m.toFixed(1) + ' kN/m' },
        { k: 'w SIDL', v: d.sidl_kN_m.toFixed(1) + ' kN/m' },
        { k: 'M dead', v: f0(d.moment_dead_kNm) + ' kN·m' },
        { k: 'M live (incl. IF)', v: f0(d.moment_live_kNm) + ' kN·m' },
        { k: 'V_max', v: f0(d.shear_end_kN) + ' kN' },
        { k: 'δ live', v: d.deflection_mm.toFixed(1) + ' mm' },
      ]
      const ok = d.deflection_mm <= d.deflection_limit_mm
      const check = { k: 'δ live ≤ L/800', v: d.deflection_mm.toFixed(1) + ' ≤ ' + d.deflection_limit_mm.toFixed(1) + ' mm', col: ok ? GREEN : RED }
      return { patch: { big, rows, check, MtS: 'M_max ' + f0(d.moment_mid_kNm) + ' kN·m' }, verifying: anl.loading }
    }

    if (isConfig) {
      if (!cfg.data) return { patch: null, verifying: cfg.loading }
      const d = cfg.data
      const big: Big[] = [
        ['Area (composite)', mm2ToM2(d.A).toFixed(3), 'm²'],
        ['Ixx', mm4ToM4(d.I).toFixed(3), 'm⁴'],
        ['Centroid y_b', mmToM(d.y_bot).toFixed(3), 'm'],
        ['Z_bot', mm3ToM3(d.Z_bot).toFixed(3), 'm³'],
      ]
      return { patch: { big }, verifying: cfg.loading }
    }

    if (isBaseline) {
      if (!bsl.data) return { patch: null, verifying: bsl.loading }
      const d = bsl.data, m = d.modal, L = m.mode_shape_x[m.mode_shape_x.length - 1] || 1
      const fs = m.frequencies
      const big: Big[] = fs.map((f, j) => ['f' + SUB[j], f.toFixed(2), 'Hz'] as Big)
        .concat([['Baseline', 'v' + base.ver, '']])
      const modes = fs.map((f, j) => ({ d: modePath(m.mode_shapes[j], m.mode_shape_x, L), k: 'Mode ' + (j + 1), f: f.toFixed(2) + ' Hz' }))
      const rows = [
        { k: 'Mass per girder', v: Math.round(d.mass_per_girder_kg_m).toLocaleString() + ' kg/m' },
        { k: 'EI (composite)', v: d.EI_composite_GNm2.toFixed(1) + ' GN·m²' },
        { k: 'δ live (reference)', v: (d.fingerprint.delta_max ?? 0).toFixed(1) + ' mm' },
        { k: 'UPV nominal', v: (d.fingerprint.upv_nominal ?? 4.3).toFixed(2) + ' km/s' },
        { k: 'Rebound nominal', v: String(Math.round(d.fingerprint.rebound_nominal ?? 38)) },
        { k: 'Damping', v: d.damping_percent.toFixed(1) + ' %' },
      ]
      return { patch: { big, modes, rows, ver: 'v' + base.ver }, verifying: bsl.loading }
    }

    if (isPrestress) {
      if (!prs.data) return { patch: null, verifying: prs.loading }
      const d = prs.data, P0 = d.P0_kN, Pe = d.Pe_kN, sp = d.sigma_p0
      const pct = (mpa: number) => (mpa / sp) * 100 // stress loss → % of initial force
      const L1 = pct(d.losses.friction), L2 = pct(d.losses.anchorage), L3 = pct(d.losses.elastic_shortening)
      const L4 = pct(d.losses.creep), L5 = pct(d.losses.shrinkage), L6 = pct(d.losses.relaxation)
      // rebuild the loss-waterfall bars from the real losses (same geometry as the preview)
      const steps: Array<[string, number, number]> = [
        ['P₀', P0, 0], ['Fric.', (P0 * L1) / 100, 1], ['Slip', (P0 * L2) / 100, 1],
        ['E.S.', (P0 * L3) / 100, 1], ['Creep', (P0 * L4) / 100, 1], ['Shr.', (P0 * L5) / 100, 1],
        ['Relax.', (P0 * L6) / 100, 1], ['Pₑ', Pe, 0],
      ]
      let run = P0
      const ys = (v: number) => (v / P0) * 92
      const bars = steps.map(([k, v, loss], j) => {
        let top: number, hgt: number
        if (!loss) { hgt = ys(v); top = 104 - hgt } else { top = 104 - ys(run); hgt = ys(v); run -= v }
        return { x: (6 + j * 36.5).toFixed(1), y: top.toFixed(1), h: Math.max(1, hgt).toFixed(1), fill: loss ? 'var(--faint)' : 'var(--ink)', k, lx: (6 + j * 36.5 + 13).toFixed(1) }
      })
      const big: Big[] = [
        ['P₀', f0(P0), 'kN'], ['Total loss', d.loss_percent.toFixed(1), '%'],
        ['Pₑ', f0(Pe), 'kN'], ['Net camber', d.camber_mm.toFixed(0), 'mm'],
      ]
      const rows = [
        { k: 'P₀ (jacking)', v: f0(P0) + ' kN' }, { k: 'Friction', v: L1.toFixed(1) + ' %' },
        { k: 'Anchorage slip', v: L2.toFixed(1) + ' %' }, { k: 'Elastic shortening', v: L3.toFixed(1) + ' %' },
        { k: 'Creep + shrinkage', v: (L4 + L5).toFixed(1) + ' %' }, { k: 'Relaxation', v: L6.toFixed(1) + ' %' },
        { k: 'Pₑ (effective)', v: f0(Pe) + ' kN' }, { k: 'σ_bot transfer', v: d.sigma_bot_transfer.toFixed(1) + ' MPa' },
        { k: 'σ_bot service', v: d.sigma_bot_service.toFixed(1) + ' MPa' },
      ]
      const checks = [
        { k: 'Pₑ < P₀', v: (Pe / P0).toFixed(3), col: d.pe_lt_p0 ? GREEN : RED },
        { k: 'Service bottom fibre in compression', v: d.sigma_bot_service.toFixed(1) + ' MPa', col: d.sigma_bot_service >= 0 ? GREEN : AMBER },
      ]
      return { patch: { big, rows, checks, bars }, verifying: prs.loading }
    }

    if (isMonitoring) {
      if (!sig.data) return { patch: null, verifying: sig.loading }
      const d = sig.data
      const t = d.t, a = d.a // a treated on the design's amplitude scale (cosmetic on both sides)
      // --- a(t): first 4 s window, full-scale ±0.08 (viewBox 300×96, centreline 48) ---
      const t4 = (t[0] ?? 0) + 4
      let end = t.length
      for (let j = 0; j < t.length; j++) if (t[j] > t4) { end = j; break }
      const M = Math.max(2, end)
      let at = ''
      for (let j = 0; j < M; j++) {
        const x = ((j / (M - 1)) * 300).toFixed(1)
        const y = Math.max(2, Math.min(94, 48 - (a[j] / 0.08) * 46)).toFixed(1)
        at += (j ? 'L' : 'M') + x + ' ' + y
      }
      // --- FFT 0–12 Hz (viewBox 300×120): measured vs baseline realization ---
      const F = d.spectrum_freq, Smag = d.spectrum_mag
      let nIn = 0, peakMag = 1e-9
      for (let j = 0; j < F.length; j++) if (F[j] <= 12) { nIn = j + 1; if (Smag[j] > peakMag) peakMag = Smag[j] }
      const specPath = (freq: number[], mag: number[]) => {
        let q = ''
        for (let j = 0; j < nIn; j++) {
          const x = ((freq[j] / 12) * 300).toFixed(1)
          const y = (104 - (mag[j] / peakMag) * 86).toFixed(1)
          q += (j ? 'L' : 'M') + x + ' ' + y
        }
        return q
      }
      const fm = specPath(F, Smag)
      const fb = bas.data ? specPath(bas.data.spectrum_freq, bas.data.spectrum_mag) : fm
      const magAt = (f: number) => { let lo = 0, dmin = Infinity; for (let j = 0; j < nIn; j++) { const dd = Math.abs(F[j] - f); if (dd < dmin) { dmin = dd; lo = j } } return Smag[lo] }
      // Modal tracking: baseline f₁ is the deterministic analytical modal frequency;
      // the measured f₁ is the identified peak NEAREST that mode (rejects spurious bins).
      const modal = bsl.data?.modal?.frequencies ?? []
      const dom = d.dominant_frequencies
      const near = (f0: number) => dom.length ? dom.reduce((a, b) => (Math.abs(b - f0) < Math.abs(a - f0) ? b : a)) : f0
      const fBase = modal[0] ?? (dom[0] ?? 0)
      const fMeas = near(fBase)
      const df1 = fBase ? (((fMeas - fBase) / fBase) * 100).toFixed(1).replace('-', '−') : '0.0'
      // label an in-window mode only where a measured peak actually sits near it
      // (e.g. mode 2 is a node at L/2, so it has no peak and stays unlabelled)
      const inwModes = modal.length ? modal.filter((f) => f <= 12) : [fMeas].filter((f) => f <= 12)
      const peaks = inwModes.flatMap((mf, j) => {
        const f = near(mf)
        if (Math.abs(f - mf) > Math.max(0.6, mf * 0.08)) return []
        return [{ x: +((f / 12) * 300).toFixed(1), y: +(104 - (magAt(f) / peakMag) * 86 - 6).toFixed(1), t: 'f' + SUB[j] + ' ' + f.toFixed(2) }]
      })
      const rms = d.features.a_rms ?? 0, amax = d.features.a_max ?? 0
      const big: Big[] = [
        ['Measured f₁', fMeas.toFixed(2), 'Hz'], ['a_RMS', rms.toFixed(3), 'g'],
        ['a_max', amax.toFixed(3), 'g'], ['Sensors', String(mon.sensors), ''],
      ]
      const rows = [
        { k: 'Baseline f₁', v: fBase.toFixed(2) + ' Hz' },
        { k: 'Δf₁ vs baseline', v: df1 + ' %' },
        { k: 'Records', v: Math.round(mon.dur * mon.fs).toLocaleString() + ' samples' },
        { k: 'Modal ID', v: 'FFT peak-pick + tracking' },
      ]
      return { patch: { at, fm, fb, peaks, big, rows }, verifying: sig.loading || bas.loading || bsl.loading }
    }

    if (isSynthetic) {
      if (!synth.data) return { patch: null, verifying: synth.loading }
      const d = synth.data, h = d.summary['Healthy']
      const arrOf = (sel: (c: SyntheticClass) => number, b: number) => d.conditions.map((c) => (sel(d.summary[c]) / b - 1) * 100)
      const metDefs: Array<[string, number[], number]> = [
        ['Δf₁', arrOf((c) => c.f1, h.f1), (d.scenario.f1 / d.baseline.f1 - 1) * 100],
        ['Δδ', arrOf((c) => c.delta_max, h.delta_max), (d.scenario.delta_max / d.baseline.delta_max - 1) * 100],
        ['ΔUPV', arrOf((c) => c.upv, h.upv), (d.scenario.upv / d.baseline.upv - 1) * 100],
      ]
      const met = metDefs.map(([k, arr, scn]) => {
        const mxv = Math.max(...arr.map(Math.abs), Math.abs(scn), 1), H = (v: number) => (Math.abs(v) / mxv) * 38
        return {
          k, scS: 'scenario ' + scn.toFixed(1).replace('-', '−') + ' %', lineY: (50 - H(scn)).toFixed(1),
          bars: arr.map((v, j) => ({ x: 24 + j * 70, y: (50 - H(v)).toFixed(1), h: Math.max(1, H(v)).toFixed(1), c: COL[j], t: v.toFixed(1).replace('-', '−'), ty: (46 - H(v)).toFixed(1), tx: 44 + j * 70 })),
        }
      })
      const li = Math.max(0, SEVN.indexOf(d.scenario.label))
      const prev = d.preview.map((r) => {
        const ci = Math.max(0, SEVN.indexOf(r.label))
        return { id: r.id, l: r.label, c: COL[ci], f: r.f1.toFixed(2), d: r.delta_max.toFixed(1), u: r.upv.toFixed(2) }
      })
      const big: Big[] = [
        ['Scenario label', d.scenario.label, ''], ['f₁', d.scenario.f1.toFixed(2), 'Hz'],
        ['δ', d.scenario.delta_max.toFixed(1), 'mm'], ['Records', syn.n.toLocaleString(), ''],
      ]
      return { patch: { big, met, prev, label: d.scenario.label, labCol: COL[li] }, verifying: synth.loading }
    }

    if (isFeatures) {
      if (!feats.data) return { patch: null, verifying: feats.loading }
      const d = feats.data, order = d.feature_order
      const keyOf = (f: typeof FEATURES[number]) => order[FEATURES.indexOf(f)]
      const nameOf = (key: string) => (FEATURES[order.indexOf(key)]?.[0] as string) ?? key
      const act = FEATURES.filter((f) => feat.on[f[0] as string])
      const selF = FEATURES.find((f) => f[0] === feat.sel && feat.on[f[0] as string]) || act[0] || FEATURES[0]

      // correlation matrix over the active features (real Pearson r)
      const cm = act.map((a) => {
        const i = FEATURES.indexOf(a)
        return {
          k: a[0] as string,
          cells: act.map((b) => {
            const j = FEATURES.indexOf(b), r = i === j ? 1 : d.correlation[i][j]
            return {
              v: r.toFixed(1),
              bg: r >= 0
                ? 'color-mix(in oklab, var(--acc) ' + Math.round(Math.abs(r) * 85) + '%, transparent)'
                : 'color-mix(in oklab, var(--ink) ' + Math.round(Math.abs(r) * 70) + '%, transparent)',
              fg: Math.abs(r) > 0.6 ? 'var(--inv)' : 'var(--ink)',
            }
          }),
        }
      })

      // selected feature's distribution by condition (mean ±2σ)
      const skey = keyOf(selF), dec = selF[4] as number, unit = selF[3] as string
      const cls = d.conditions
      const means = cls.map((c) => d.by_class[c][skey].mean)
      const sds = cls.map((c) => d.by_class[c][skey].std)
      const lows = means.map((m, c) => m - 2 * sds[c]), highs = means.map((m, c) => m + 2 * sds[c])
      const lo = Math.min(...lows), hi = Math.max(...highs), span = hi - lo || 1
      const X = (v: number) => (40 + ((v - lo) / span) * 250).toFixed(1)
      const dist = cls.map((_c, k) => ({
        y: 12 + k * 20, x0: X(lows[k]), x1: X(highs[k]), xm: X(means[k]),
        c: COL[k], l: SEVN[k], ly: 16 + k * 20, t: means[k].toFixed(dec),
      }))

      // real feature importance, top 5
      const impAll = order.map((key) => ({ key, v: d.importance[key] ?? 0 })).sort((a, b) => b.v - a.v)
      const impTop = impAll.slice(0, 5)
      const impMax = impTop[0]?.v || 1
      const imp = impTop.map((f) => ({ k: nameOf(f.key), v: f.v.toFixed(2), w: ((f.v / impMax) * 100).toFixed(0) + '%' }))

      const sgn = d.strongest.r < 0 ? '−' : ''
      const big: Big[] = [
        ['Features', String(act.length), ''], ['Records', syn.n.toLocaleString(), ''],
        ['Strongest |r|', nameOf(d.strongest.a) + ' ↔ ' + nameOf(d.strongest.b), sgn + Math.abs(d.strongest.r).toFixed(2)],
        ['Top preview', nameOf(impTop[0]?.key ?? order[0]), (impTop[0]?.v ?? 0).toFixed(2)],
      ]
      return {
        patch: {
          cm, cols: 'repeat(' + (act.length + 1) + ',minmax(0,1fr))', sel: selF[0] as string,
          meaning: selF[5] as string, dist, lo: lo.toFixed(dec) + ' ' + unit, hi: hi.toFixed(dec) + ' ' + unit, imp, big,
        },
        verifying: feats.loading,
      }
    }

    if (isMl) {
      if (!mlp.data) return { patch: null, verifying: mlp.loading }
      const d = mlp.data, iso = d.model === 'IsoForest'
      const order = d.feature_order
      const nameOf = (key: string) => (FEATURES[order.indexOf(key)]?.[0] as string) ?? key

      // reorder the confusion matrix to severity order (clf.classes_ is alphabetical)
      let labels: string[], confusion: number[][]
      if (iso) {
        labels = d.classes
        confusion = d.confusion
      } else {
        const ord = SEVN.map((s) => d.classes.indexOf(s)).filter((ix) => ix >= 0)
        labels = ord.map((ri) => (d.classes[ri] === 'Deteriorated' ? 'Det.' : d.classes[ri]))
        confusion = ord.map((ri) => ord.map((ci) => d.confusion[ri][ci]))
      }
      const cm = confusion.map((r, j) => {
        const rs = r.reduce((a, b) => a + b, 0) || 1
        return {
          k: labels[j],
          cells: r.map((v, cc) => {
            const fr = v / rs, diag = cc === j
            return {
              v,
              bg: diag ? 'color-mix(in oklab, var(--acc) ' + Math.round(20 + fr * 70) + '%, transparent)'
                : fr > 0 ? 'color-mix(in oklab, #e0442f ' + Math.round(10 + fr * 120) + '%, transparent)'
                  : 'var(--hover)',
              fg: 'var(--ink)',
            }
          }),
        }
      })

      const impEntries = Object.entries(d.feature_importance).sort((a, b) => b[1] - a[1]).slice(0, 10)
      const impMax = impEntries[0]?.[1] || 1
      const imp = impEntries.map(([k, v]) => ({ k: nameOf(k), v: v.toFixed(2), w: ((v / impMax) * 100).toFixed(0) + '%' }))

      const pred = d.prediction
      const predCol = iso ? (pred === 'Anomaly' ? RED : GREEN) : COL[Math.max(0, SEVN.indexOf(pred))]
      const big: Big[] = [
        ['Prediction', pred, ''],
        [iso ? 'Anomaly score' : 'Confidence', iso ? d.anomaly_score.toFixed(2) : d.confidence.toFixed(2), ''],
        [iso ? 'Detection' : 'Accuracy', (d.accuracy * 100).toFixed(1), '%'],
        ['Test records', String(d.n_test), ''],
      ]
      return {
        patch: {
          model: d.model, pred, predCol,
          confS: iso ? 'score ' + d.anomaly_score.toFixed(2) : d.confidence.toFixed(2),
          nTest: d.n_test, cm, cmCols: '52px repeat(' + labels.length + ',minmax(0,1fr))', imp, big,
        },
        verifying: mlp.loading,
      }
    }

    return NONE
  }, [isConfig, isBaseline, isAnalysis, isPrestress, isMonitoring, isSynthetic, isFeatures, isMl, isDashboard, cfg.data, cfg.loading, bsl.data, bsl.loading, anl.data, anl.loading, prs.data, prs.loading, sig.data, sig.loading, bas.data, bas.loading, synth.data, synth.loading, feats.data, feats.loading, mlp.data, mlp.loading, mlReal, base.ver, mon.sensors, mon.dur, mon.fs, syn.n, JSON.stringify(feat.on), feat.sel, JSON.stringify(g), ml])
}
