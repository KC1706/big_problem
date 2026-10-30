import { useRef } from 'react'
import { useStore } from '@/state/store'
import s from './Welcome.module.css'

// Starting templates (not fake "recent/edited" projects): each loads a real span.
const TEMPLATES: Array<{ name: string; span: number }> = [
  { name: 'NH-16 Mahananda Bridge', span: 33 },
  { name: 'Kosi canal crossing', span: 30 },
  { name: 'Studio sample 36 m', span: 36 },
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
  const importJSON = useStore((st) => st.importJSON)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadTemplate = (name: string, span: number) => {
    setK('wz', 'name', name)
    setK('wz', 'span', span)
    createProject() // reads wz.span → sets geometry and enters the studio
  }

  const onOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!f) return
    f.text().then((t) => { try { importJSON(JSON.parse(t)) } catch { /* not a valid project file */ } })
  }

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
            <span className={s.eyebrow} style={{ fontSize: 11 }}>TEMPLATES</span>
            {TEMPLATES.map((t) => (
              <div className={s.recent} key={t.name} onClick={() => loadTemplate(t.name, t.span)}>
                <span className={s.recentL}>{t.name}</span>
                <span className={s.recentM}>{t.span} m · template</span>
              </div>
            ))}
            <div className={s.recentBtns}>
              <button className={s.openBtn} onClick={() => fileRef.current?.click()}>Open project</button>
              <button className={s.skipBtn} onClick={skipWelcome}>Skip to dashboard</button>
              <input ref={fileRef} type="file" accept=".json,application/json" onChange={onOpenFile} style={{ display: 'none' }} />
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
