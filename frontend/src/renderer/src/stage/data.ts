// Shared constants ported from the Studio renderVals, used by inputs.ts + results.ts.

export const COL = ['#4fae7f', '#d9b443', '#e6893c', '#e0442f']
export const SEVN = ['Healthy', 'Minor', 'Deteriorated', 'Severe']
export const SUB = '₁₂₃'

/** 10-feature table: [name, loading, healthyVal, unit, decimals, meaning]. */
export type FeatureDef = [string, number, number, string, number, string]
export const FEATURES: FeatureDef[] = [
  ['f₁', -0.9, 3.21, 'Hz', 2, 'First bending frequency. Falls as flexural stiffness is lost.'],
  ['f₂', -0.85, 5.86, 'Hz', 2, 'Second mode. Its shift relative to f₁ hints at where along the span damage sits.'],
  ['f₃', -0.75, 8.41, 'Hz', 2, 'Third mode. More sensitive to local stiffness changes, also more affected by noise.'],
  ['a_RMS', 0.55, 0.042, 'g', 3, 'Overall vibration energy under traffic. Rises as the deck becomes more flexible.'],
  ['a_max', 0.5, 0.18, 'g', 2, 'Peak acceleration. Captures impact-type response at joints and bearings.'],
  ['Kurt.', 0.35, 3.1, '', 1, 'Kurtosis of a(t). Values well above 3 indicate spiky, impulsive response such as loose bearings.'],
  ['δ_max', 0.9, 18.4, 'mm', 1, 'Mid-span deflection under the reference load. Rises with stiffness or prestress loss.'],
  ['ε_max', 0.85, 182, 'µε', 0, 'Peak bottom-fibre strain. Tracks the same flexural loss as δ at the gauge location.'],
  ['UPV', -0.7, 4.31, 'km/s', 2, 'Pulse velocity through the web. Drops where concrete is cracked or poorly compacted.'],
  ['RH', -0.6, 38, 'R', 0, 'Rebound number. A surface-hardness check that complements UPV in SonReb.'],
]

/** Inspection components: [id, label]. */
export const COMPS: Array<[string, string]> = [
  ['deck', 'Deck slab'], ['girders', 'Girders'], ['cross', 'Cross-girders'], ['fp', 'Footpaths'],
  ['barrier', 'Crash barriers'], ['bearings', 'Bearings'], ['ej', 'Expansion joints'],
  ['drain', 'Drainage'], ['abut', 'Abutments'],
]

/** Report sections + page counts. */
export const SEC = [
  'Configuration', 'Analysis & design', 'Prestressing', 'Healthy baseline', 'Visual inspection',
  'Non-destructive testing', 'Monitoring', 'Synthetic data', 'Feature extraction', 'AI/ML assessment',
  'Maintenance decision', 'Assumptions & limitations',
]
export const SEC_PG = [3, 4, 4, 3, 4, 4, 4, 3, 3, 5, 3, 2]

/** NDT test definitions: unit, decimals, question, ref, bands, synthetic field fn. */
export interface NdtTest {
  u: string; dec: number; q: string; ref: string
  bands: Array<[string, string, number, number]>
  f: (s: number, r: number, i: number, G: number, o: number, sd: number) => number
}
export const NDT_TESTS: Record<string, NdtTest> = {
  UPV: {
    u: 'km/s', dec: 2, q: 'Is the concrete at G5 mid-span uniform, or is there internal cracking?', ref: 'IS 13311 Pt.1 bands',
    bands: [['Excellent', '> 4.5', 4.5, 99], ['Good', '3.5 – 4.5', 3.5, 4.5], ['Doubtful', '3.0 – 3.5', 3, 3.5], ['Poor', '< 3.0', -99, 3]],
    f: (s, r, i, G, o, sd) => 4.45 - 0.08 * r + 0.06 * Math.sin(i * 1.7 + G * 2 + sd) - (G === o ? 1.25 * Math.exp(-(((s - 0.55) / 0.09) ** 2)) : 0) - (G === o - 1 ? 0.5 * Math.exp(-(((s - 0.22) / 0.08) ** 2)) : 0),
  },
  Rebound: {
    u: 'R', dec: 0, q: 'Is surface hardness consistent with M45 along the girder?', ref: 'Rebound bands',
    bands: [['Sound', '> 35', 35, 99], ['Intermediate', '25 – 35', 25, 35], ['Poor', '< 25', -99, 25]],
    f: (s, r, i, G, o, sd) => 39 + 2 * Math.sin(i * 1.3 + G + sd) - r - (G === o ? 13 * Math.exp(-(((s - 0.55) / 0.09) ** 2)) : 0) - (G === o - 1 ? 6 * Math.exp(-(((s - 0.22) / 0.08) ** 2)) : 0),
  },
  Cover: {
    u: 'mm', dec: 0, q: 'Is cover adequate to protect strands and rebar near the ends?', ref: 'Verify against project cover',
    bands: [['Adequate', '≥ 45', 45, 999], ['Marginal', '35 – 45', 35, 45], ['Low', '< 35', -99, 35]],
    f: (s, _r, i, G, o, sd) => 52 + 4 * Math.sin(i * 2.1 + G + sd) - (G === o ? 19 * Math.exp(-(((s - 0.12) / 0.08) ** 2)) : 0),
  },
  'Half-cell': {
    u: 'mV', dec: 0, q: 'Is reinforcement near the stained bearing B5 corroding?', ref: 'ASTM C876 bands',
    bands: [['Low risk', '> −200', -200, 999], ['Uncertain', '−200 – −350', -350, -200], ['High risk', '< −350', -9999, -350]],
    f: (s, _r, i, G, o, sd) => -150 - 20 * Math.sin(i * 1.1 + G + sd) - (G === o ? 270 * Math.exp(-(((s - 0.94) / 0.1) ** 2)) : 0),
  },
}
