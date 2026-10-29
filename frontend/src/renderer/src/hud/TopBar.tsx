import { useStore, STAGES } from '@/state/store'
import { useLayout } from '@/layout/useLayout'
import s from './TopBar.module.css'

/** Top bar: project pill, lens pill, health gauge, theme toggle, export.
 *  Ported from the Studio markup; conditional pieces follow the layout flags.
 *  (Export is a visual stub until F6; health gauge values are the design's
 *  placeholders until wired in F5.) */
export default function TopBar() {
  const i = useStore((st) => st.i)
  const theme = useStore((st) => st.theme)
  const paused = useStore((st) => st.paused)
  const openWelcome = useStore((st) => st.openWelcome)
  const togglePause = useStore((st) => st.togglePause)
  const doReplay = useStore((st) => st.doReplay)
  const toggleTheme = useStore((st) => st.toggleTheme)
  const L = useLayout()

  const cur = STAGES[i]
  const themeLabel = theme === 'light' ? 'Dark' : 'Light'
  const pauseLabel = paused ? 'Play' : 'Pause'

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
          <div className={s.gauge}>
            <div className={s.gaugeHole} />
          </div>
          {L.healthText && (
            <div className={s.healthText}>
              <span className={s.healthValue}>0.82</span>
              <span className={s.healthLabel}>Health · Minor</span>
            </div>
          )}
        </div>
        <button className={s.themeBtn} onClick={toggleTheme}>{themeLabel}</button>
        <button className={s.exportBtn}>{L.exportLabel}</button>
      </div>
    </div>
  )
}
