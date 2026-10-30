import { useStore, STAGES } from '@/state/store'
import { useLayout } from '@/layout/useLayout'
import { mlScoreOf } from '@/stage/results'
import { COL, SEVN } from '@/stage/data'
import s from './TopBar.module.css'

// Condition class → a health index (1 = pristine). Drives the gauge honestly from
// the real ML outcome (or the live evidence heuristic before the classifier runs).
const HEALTH_BY_CLASS = [0.95, 0.82, 0.6, 0.35]

/** Top bar: project pill, lens pill, health gauge, theme toggle, export.
 *  Ported from the Studio markup; conditional pieces follow the layout flags.
 *  (Export downloads the full project as JSON; health gauge values are the
 *  design's placeholders.) */
export default function TopBar() {
  const i = useStore((st) => st.i)
  const theme = useStore((st) => st.theme)
  const paused = useStore((st) => st.paused)
  const openWelcome = useStore((st) => st.openWelcome)
  const togglePause = useStore((st) => st.togglePause)
  const doReplay = useStore((st) => st.doReplay)
  const toggleTheme = useStore((st) => st.toggleTheme)
  const exportJSON = useStore((st) => st.exportJSON)
  const ml = useStore((st) => st.ml)
  const mlReal = useStore((st) => st.mlReal)
  const L = useLayout()

  const cur = STAGES[i]
  const themeLabel = theme === 'light' ? 'Dark' : 'Light'
  const pauseLabel = paused ? 'Play' : 'Pause'

  // Live overall health: real persisted ML class if trained, else the heuristic.
  const cls = mlReal ? mlReal.cls : mlScoreOf(ml).cls
  const health = HEALTH_BY_CLASS[cls] ?? 0.8
  const healthPct = Math.round(health * 100)
  const condLabel = mlReal ? mlReal.pred : SEVN[cls]
  const gaugeFill = `conic-gradient(${COL[cls]} 0 ${healthPct}%, var(--line) 0)`

  return (
    <div className={s.bar}>
      <div className={s.projectPill} onClick={openWelcome} title="Projects">
        <div className={s.glyph}>
          <div className={s.glyphBar} />
          <div className={s.glyphLegs}>
            <div className={s.glyphLeg} />
            <div className={s.glyphLeg} />
          </div>
        </div>
        {L.brandText && <div className={s.brand}>BridgeLife Studio</div>}
      </div>

      {L.lensPill && (
        <div className={s.lensPill}>
          <span className={s.lensEyebrow}>LENS</span>
          <span className={s.lensName}>{cur.lens}</span>
          <button className={s.ghostBtn} onClick={togglePause}>{pauseLabel}</button>
          <button className={s.ghostBtn} onClick={doReplay}>Replay</button>
        </div>
      )}

      <div className={s.right}>
        <div className={s.healthPill}>
          <div className={s.gauge} style={{ background: gaugeFill }}>
            <div className={s.gaugeHole} />
          </div>
          {L.healthText && (
            <div className={s.healthText}>
              <span className={s.healthValue}>{health.toFixed(2)}</span>
              <span className={s.healthLabel}>Health · {condLabel}</span>
            </div>
          )}
        </div>
        <button className={s.themeBtn} onClick={toggleTheme}>{themeLabel}</button>
        <button className={s.exportBtn} onClick={exportJSON}>{L.exportLabel}</button>
      </div>
    </div>
  )
}
