import type { Geom } from '@/state/store'
import type { SectionConfig } from './types'

// Unit converters: backend is mm / mm² / mm⁴ / mm³, the design is metres.
export const mmToM = (v: number) => v / 1000
export const mm2ToM2 = (v: number) => v / 1e6
export const mm3ToM3 = (v: number) => v / 1e9
export const mm4ToM4 = (v: number) => v / 1e12

export const GRADE_FCK: Record<string, number> = { M40: 40, M45: 45, M50: 50 }

/**
 * E2 adapter: map the design's 5-param section `g` (metres) onto the backend's
 * 5-zone trapezoid `SectionConfig` (mm). The backend's bottom/top fillets are the
 * design's web→flange chamfers (0.15 m / 0.12 m), so the resulting polygon equals
 * the geometry the twin draws — the computed A/I are the twin's real properties.
 */
export function gToSectionConfig(g: Geom, fck = 45): SectionConfig {
  // web clear height = overall depth − bottom flange − top flange − both chamfers
  const hw = Math.max(1, (g.depth - g.bft - g.tft - 0.27) * 1000)
  return {
    span: g.span * 1000,
    girder_spacing: g.sp * 1000,
    deck_thickness: g.slab * 1000,
    n_girders: g.nG,
    carriageway_width: Math.round(((g.nG - 1) * g.sp + 3.2) * 100) / 100,
    girder: {
      bf_bot: g.bfw * 1000,
      tf_bot: g.bft * 1000,
      h_fillet_bot: 150,
      tw: g.web * 1000,
      hw,
      h_fillet_top: 120,
      bf_top: g.tfw * 1000,
      tf_top: g.tft * 1000,
    },
    fck_girder: fck,
    fck_deck: 40,
  }
}
