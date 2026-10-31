// Live report data: fetch every stage's REAL backend result for the current
// project inputs, in one shot. This is the client-side analogue of
// BridgeLife-Report-handoff/tools/report_values.py — the numbers come from the
// validated compute core, not the local physics preview, so the generated report
// is true for whatever bridge is loaded.

import { apiPost } from './client'
import { gToSectionConfig } from './adapter'
import type { Ana, Base, Geom, Ml, Pre, Syn } from '@/state/store'
import type {
  AnalysisResponse, BaselineResponse, FeaturesResponse, MLPipelineResponse,
  PrestressResponse, SectionProperties, SyntheticResponse,
} from './types'

export interface ReportData {
  geometry: SectionProperties
  analysis: AnalysisResponse
  prestress: PrestressResponse
  baseline: BaselineResponse
  features: FeaturesResponse
  scenario: SyntheticResponse
  ml: MLPipelineResponse
  df_pct: number
}

const LIVE_LOAD: Record<string, string> = { '70R': '70R', 'Class A': 'ClassA', '70R + A': '70R+A' }

/** Inputs the report needs — a subset of the store state. */
export interface ReportInputs { g: Geom; ana: Ana; base: Base; pre: Pre; syn: Syn; ml: Ml }

export async function fetchReportData(s: ReportInputs): Promise<ReportData> {
  const section = gToSectionConfig(s.g)
  const engine = s.base.engine === 'OpenSeesPy' ? 'openseespy' : 'analytical'
  const mechanisms = Object.keys(s.syn.mech).filter((k) => s.syn.mech[k])

  // Independent stages fire in parallel; the ML field prediction needs the
  // scenario's deltas, so it waits for the synthetic preview.
  const [geometry, analysis, prestress, baseline, features, scenario] = await Promise.all([
    apiPost<SectionProperties>('/config/properties', section),
    apiPost<AnalysisResponse>('/analysis/run', {
      section, live_load: LIVE_LOAD[s.ana.load] ?? '70R', distribution: s.ana.dist,
      barrier_kN_m: s.ana.barrier, footpath_kN_m2: s.ana.fp,
    }),
    apiPost<PrestressResponse>('/prestress/compute', {
      section, n_cables: s.pre.n, strands_per_cable: s.pre.strands, jack_fraction: s.pre.jack,
      mu: s.pre.mu, K: s.pre.K, anchorage_slip: s.pre.slip,
    }),
    apiPost<BaselineResponse>('/baseline/establish', {
      section, engine, ec_gpa: s.base.Ec, mass_mode: s.base.mass, zeta: s.base.zeta,
    }),
    apiPost<FeaturesResponse>('/features/matrix', { section, noise_frac: s.syn.noise / 100, engine }),
    apiPost<SyntheticResponse>('/synthetic/generate', {
      section, mechanisms, location: s.syn.loc, extent_m: s.syn.ext, severity_pct: s.syn.sev,
      noise_frac: s.syn.noise / 100, preview_only: true, engine,
    }),
  ])

  const df_pct = (scenario.scenario.f1 / scenario.baseline.f1 - 1) * 100
  const ml = await apiPost<MLPipelineResponse>('/ml/pipeline', {
    section, model: s.ml.model, split: s.ml.split, n_estimators: s.ml.trees,
    df_pct, delta_mm: scenario.scenario.delta_max, upv: scenario.scenario.upv, engine,
  })

  return { geometry, analysis, prestress, baseline, features, scenario, ml, df_pct }
}
