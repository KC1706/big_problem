import { useStore } from '@/state/store'
import { computeLayout, type Layout } from './responsive'

/**
 * `ws` = whether the active stage shows input/result panels. Panels land in F3;
 * until then the chrome (TopBar/StageRail) layout is independent of `ws`.
 */
export function useLayout(ws = false): Layout {
  const w = useStore((s) => s.w)
  const tab = useStore((s) => s.tab)
  return computeLayout(w, ws, tab)
}
