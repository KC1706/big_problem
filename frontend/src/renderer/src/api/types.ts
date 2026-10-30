// Response types mirroring the backend Pydantic schemas (backend/app/models/schemas.py).
// All backend lengths are mm, areas mm², second moments mm⁴, forces kN.

export interface GirderIn {
  bf_bot: number; tf_bot: number; h_fillet_bot: number; tw: number; hw: number
  h_fillet_top: number; bf_top: number; tf_top: number
}

export interface SectionConfig {
  span: number
  girder_spacing: number
  deck_thickness: number
  n_girders: number
  carriageway_width: number
  girder: GirderIn
  fck_girder: number
  fck_deck: number
}

export interface SectionProperties {
  A: number; I: number; y_bot: number; y_top: number; Z_bot: number; Z_top: number
  depth: number; girder_depth: number; span_depth_ratio: number
  self_weight_kN_m: number; mass_kg_m: number; effective_width: number
  warnings: string[]
}

export interface AnalysisResponse {
  dead_load_kN_m: number; sidl_kN_m: number; live_load_udl_kN_m: number; impact_factor: number
  moment_mid_kNm: number; moment_dead_kNm: number; moment_live_kNm: number
  shear_end_kN: number; sigma_top: number; sigma_bot: number
  deflection_mm: number; deflection_limit_mm: number
}

export interface PrestressResponse {
  P0_kN: number; Pe_kN: number; sigma_p0: number; sigma_pe: number
  loss_percent: number; pe_lt_p0: boolean; losses: Record<string, number>; Ap_mm2: number
  camber_mm: number; sigma_bot_transfer: number; sigma_bot_service: number
}

export interface SyntheticClass { f1: number; delta_max: number; upv: number }
export interface SyntheticScenario extends SyntheticClass {
  x: number; ei_factor: number; ps_factor: number; label: string
}
export interface SyntheticPreviewRow { id: string; label: string; f1: number; delta_max: number; upv: number }
export interface SyntheticResponse {
  scenario: SyntheticScenario
  baseline: SyntheticClass
  summary: Record<string, SyntheticClass>
  conditions: string[]
  preview: SyntheticPreviewRow[]
}

/** Full labelled dataset from /synthetic/generate with preview_only:false. */
export interface SyntheticDatasetResponse {
  rows: Array<Record<string, number>>
  labels: string[]
  feature_order: string[]
  conditions: string[]
  summary: Record<string, { f1: number; delta_max: number; upv: number; n: number }>
}

export interface FeaturesResponse {
  feature_order: string[]
  correlation: number[][]
  by_class: Record<string, Record<string, { mean: number; std: number }>>
  conditions: string[]
  importance: Record<string, number>
  strongest: { a: string; b: string; r: number }
  n: number
}

export interface MLPipelineResponse {
  model: string
  classes: string[]
  confusion: number[][]
  accuracy: number
  feature_importance: Record<string, number>
  feature_order: string[]
  n_train: number
  n_test: number
  prediction: string
  confidence: number
  probabilities?: Record<string, number>
  anomaly_score: number
  anomaly_threshold: number
}

export interface ModalResponse {
  frequencies: number[]
  mode_shape_x: number[]
  mode_shapes: number[][]
  engine: string
}

export interface BaselineResponse {
  fingerprint: Record<string, number>
  modal: ModalResponse
  mass_per_girder_kg_m: number
  EI_composite_GNm2: number
  damping_percent: number
}

export interface SignalResponse {
  t: number[]; a: number[]; sensor_x: number
  spectrum_freq: number[]; spectrum_mag: number[]
  dominant_frequencies: number[]; features: Record<string, number>
}

export interface MLTrainResponse {
  accuracy: number
  classes: string[]
  confusion: number[][]
  feature_importance: Record<string, number>
  n_train: number
  n_test: number
  feature_meaning: Record<string, string>
  anomaly_scores: number[]
  anomaly_threshold: number
}

export interface Health {
  status: string
  version: string
  engines: { analytical: boolean; openseespy: boolean }
}
