import { useStore } from '@/state/store'
import s from './Welcome.module.css'

const RECENT: Array<[string, string]> = [
  ['NH-16 Mahananda Bridge', '33 m · edited 4 min ago'],
  ['Kosi canal crossing', '30 m · 3 days ago'],
  ['Studio sample 36 m', '36 m · template'],
]
const FIELDS: Array<[string, 'name' | 'student' | 'roll', string]> = [
  ['Project name', 'name', 'NH-16 Mahananda Bridge'],
  ['Student name', 'student', 'Your name'],
  ['Roll no.', 'roll', 'e.g. 21CE10001'],
]

/** Welcome overlay — hero + recent projects + new-project form. Port of the
 *  Studio welcome markup; shown while `welcome` is true (chrome hidden). */
export default function Welcome() {
  const w = useStore((st) => st.w)
  const wz = useStore((st) => st.wz)
  const setK = useStore((st) => st.setK)
  const createProject = useStore((st) => st.createProject)
  const skipWelcome = useStore((st) => st.skipWelcome)

  const wide = w >= 900
  const bg = wide
    ? 'linear-gradient(90deg,var(--bg) 0%,var(--bg) 42%,color-mix(in oklab,var(--bg) 40%,transparent) 70%,transparent 100%)'
    : 'color-mix(in oklab,var(--bg) 92%,transparent)'

  return (
    <div className={s.overlay} style={{ background: bg }}>
      <div className={s.inner} style={{ padding: wide ? '96px 56px 40px' : '84px 16px 16px', flexDirection: wide ? 'row' : 'column' }}>
        <div className={s.left}>
          <div className={s.hero}>
            <span className={s.eyebrow}>PSC I-GIRDER · LIFECYCLE STUDIO</span>
            <h1 className={s.h1}>One bridge, through its whole service life.</h1>
            <p className={s.lede}>Configure, analyse and prestress the girder, establish a healthy baseline, then inspect, monitor and assess it with AI/ML through to a maintenance decision and an integrated report.</p>
          </div>
          <div className={s.recentBlock}>
            <span className={s.eyebrow} style={{ fontSize: 11 }}>RECENT</span>
            {RECENT.map(([l, m]) => (
              <div className={s.recent} key={l} onClick={skipWelcome}>
                <span className={s.recentL}>{l}</span>
                <span className={s.recentM}>{m}</span>
              </div>
            ))}
            <div className={s.recentBtns}>
              <button className={s.openBtn}>Open .bridgeproj</button>
              <button className={s.skipBtn} onClick={skipWelcome}>Skip to dashboard</button>
            </div>
          </div>
        </div>

        <div className={s.card}>
          <span className={s.cardTitle}>New project</span>
          {FIELDS.map(([k, f, ph]) => (
            <label className={s.field} key={f}>
              <span className={s.fieldLabel}>{k}</span>
              <input className={s.input} value={wz[f]} placeholder={ph} onChange={(e) => setK('wz', f, e.target.value)} />
            </label>
          ))}
          <div className={s.field}>
            <span className={s.fieldLabel}>Span</span>
            <div className={s.seg}>
              {[30, 33, 36].map((v) => (
                <button
                  key={v}
                  className={s.segBtn}
                  onClick={() => setK('wz', 'span', v)}
                  style={{ background: wz.span === v ? 'var(--ink)' : 'transparent', color: wz.span === v ? 'var(--inv)' : 'var(--ink)' }}
                >
                  {v} m
                </button>
              ))}
            </div>
            <span className={s.depthNote}>Implied girder depth L/20 = {(wz.span / 20).toFixed(3)} m</span>
          </div>
          <div className={s.field}>
            <span className={s.fieldLabel}>Concrete · steel Fe500</span>
            <div className={s.seg}>
              {['M40', 'M45', 'M50'].map((v) => (
                <button
                  key={v}
                  className={s.segBtn}
                  onClick={() => setK('wz', 'grade', v)}
                  style={{ background: wz.grade === v ? 'var(--ink)' : 'transparent', color: wz.grade === v ? 'var(--inv)' : 'var(--ink)' }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <button className={s.createBtn} onClick={createProject}>Create and build bridge</button>
        </div>
      </div>
    </div>
  )
}
