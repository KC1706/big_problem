import { useStore, STAGES } from '@/state/store'
// Side-effect import: registers the <bridge-twin> custom element once (E8).
// Vendored verbatim from design_export; only the three.js import line changed (E1).
import './bridge-twin.js'

/**
 * Thin React wrapper around the design's `<bridge-twin>` web component.
 * It owns no 3D logic — it only feeds the element its string attributes from
 * the store. Attributes (not properties) are what the component observes, and
 * React sets hyphenated custom-element props as attributes, so this matches
 * `observedAttributes = [stage, theme, replay, paused, geom]`.
 */
export default function BridgeTwin() {
  const i = useStore((s) => s.i)
  const theme = useStore((s) => s.theme)
  const paused = useStore((s) => s.paused)
  const replay = useStore((s) => s.replay)
  const g = useStore((s) => s.g)
  const welcome = useStore((s) => s.welcome)

  const stage = welcome ? 'welcome' : (STAGES[i]?.id ?? 'dashboard')

  return (
    <bridge-twin
      stage={stage}
      theme={theme}
      paused={String(paused)}
      replay={String(replay)}
      geom={JSON.stringify(g)}
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}
