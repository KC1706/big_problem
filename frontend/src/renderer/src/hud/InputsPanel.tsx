import { useStore, STAGES } from '@/state/store'
import { useLayout } from '@/layout/useLayout'
import { useStage } from '@/stage/useStage'
import s from './InputsPanel.module.css'

/** Left/bottom inputs panel for ws stages. Renders segs, sliders (with red
 *  validation), pickList, chipGroups, and an optional action button.
 *  Ported from the Studio inputs markup. */
export default function InputsPanel() {
  const i = useStore((st) => st.i)
  const cur = STAGES[i]
  const L = useLayout(cur.ws)
  const { inputs } = useStage()

  if (!L.showInputs) return null

  return (
    <div
      className={s.wrap}
      style={{ top: L.inTop, left: L.inLeft, right: L.inRight, width: L.inW, height: L.inH }}
    >
      <div className={s.panel}>
        <div className={s.header}>
          <span className={s.eyebrow}>INPUTS</span>
          <span className={s.note}>{inputs.inNote}</span>
        </div>

        {inputs.pickList && (
          <div className={s.group}>
            <span className={s.groupLabel}>{inputs.pickList.k}</span>
            <div className={s.pickItems}>
              {inputs.pickList.items.map((it) => (
                <div
                  key={it.label}
                  className={s.pickItem}
                  onClick={it.go}
                  style={{ background: it.active ? 'var(--hover)' : 'transparent' }}
                >
                  <span className={s.pickDot} style={{ background: it.dot }} />
                  <span className={s.pickLabel}>{it.label}</span>
                  <span className={s.pickN}>{it.n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {inputs.chipGroups.map((cg) => (
          <div className={s.group} key={cg.k}>
            <span className={s.groupLabel}>{cg.k}</span>
            <div className={s.chips}>
              {cg.opts.map((o) => (
                <button
                  key={o.label}
                  className={s.chip}
                  onClick={o.go}
                  style={{
                    border: `1px solid ${o.active ? 'var(--ink)' : 'var(--line)'}`,
                    background: o.active ? 'var(--ink)' : 'transparent',
                    color: o.active ? 'var(--inv)' : 'var(--ink)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {inputs.segs.map((g) => (
          <div className={s.group} key={g.k}>
            <span className={s.groupLabel}>{g.k}</span>
            <div className={s.seg}>
              {g.opts.map((o) => (
                <button
                  key={o.label}
                  className={s.segBtn}
                  onClick={o.go}
                  style={{
                    background: o.active ? 'var(--ink)' : 'transparent',
                    color: o.active ? 'var(--inv)' : 'var(--ink)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {inputs.sliders.map((p) => (
          <div className={s.slider} key={p.k}>
            <div className={s.sliderHead}>
              <span className={s.sliderLabel}>{p.k}</span>
              <span className={s.sliderVal} style={{ color: p.red ? '#e0442f' : 'var(--ink)' }}>
                {p.vs} <span className={s.sliderUnit}>{p.u}</span>
              </span>
            </div>
            <input
              type="range"
              className={s.range}
              min={p.min}
              max={p.max}
              step={p.step}
              value={p.v}
              onChange={(e) => p.on(parseFloat(e.target.value))}
            />
            {p.err && <span className={s.sliderErr}>{p.err}</span>}
          </div>
        ))}

        {inputs.textFields.map((t) => (
          <label className={s.group} key={t.k}>
            <span className={s.groupLabel}>{t.k}</span>
            <textarea className={s.textarea} rows={4} value={t.v} onChange={(e) => t.on(e.target.value)} />
          </label>
        ))}

        {inputs.inAction && (
          <button className={s.inAction} onClick={inputs.inAction.go}>
            {inputs.inAction.label}
          </button>
        )}

        {inputs.isML && (
          <>
            <button className={s.inAction} onClick={() => inputs.train?.()}>{inputs.trainLabel}</button>
            <div className={s.mlSection}>
              <span className={s.mlEyebrow}>LIVE PREDICT</span>
              {inputs.predSliders.map((p) => (
                <div className={s.slider} key={p.k}>
                  <div className={s.sliderHead}>
                    <span className={s.sliderLabel}>{p.k}</span>
                    <span className={s.sliderVal}>{p.vs} <span className={s.sliderUnit}>{p.u}</span></span>
                  </div>
                  <input
                    type="range"
                    className={s.range}
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={p.v}
                    onChange={(e) => p.on(parseFloat(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
