import { useStore, STAGES } from '@/state/store'
import { useLayout } from '@/layout/useLayout'
import s from './NumeralStrip.module.css'

/** Bottom big-numeral strip + the orbit/keys hint. Shown for non-ws stages
 *  (dashboard) in wide/mid. On the dashboard the numerals are the LIVE aggregate
 *  published by ResultsPanel (real f₁/Pₑ·P₀/condition); otherwise the static `big`. */
export default function NumeralStrip() {
  const i = useStore((st) => st.i)
  const cur = STAGES[i]
  const L = useLayout(cur.ws)
  const dashBig = useStore((st) => st.dashBig)

  if (!L.strip) return null

  const big = !cur.ws && dashBig.length ? dashBig : cur.big

  return (
    <div className={s.wrap} style={{ left: L.stripLeft, right: L.stripRight }}>
      <div className={s.hint}>
        <span className={s.hintText}>Drag to orbit · scroll to zoom · double-click to reset view</span>
        <span className={s.hintKeys}>↑ ↓ · T</span>
      </div>
      <div className={s.grid}>
        {big.map(([k, v, u]) => (
          <div className={s.tile} key={k}>
            <span className={s.tileKey}>{k}</span>
            <span className={s.tileVal}>
              <span className={s.tileNum}>{v}</span>
              {u && <span className={s.tileUnit}>{u}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
