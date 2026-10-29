import { useStore, STAGES } from '@/state/store'
import { useLayout } from '@/layout/useLayout'
import s from './NumeralStrip.module.css'

/** Bottom big-numeral strip + the orbit/keys hint. Shown for non-ws stages
 *  (dashboard) in wide/mid. Values come from the stage's `big` descriptor. */
export default function NumeralStrip() {
  const i = useStore((st) => st.i)
  const cur = STAGES[i]
  const L = useLayout(cur.ws)

  if (!L.strip) return null

  return (
    <div className={s.wrap} style={{ left: L.stripLeft, right: L.stripRight }}>
      <div className={s.hint}>
        <span className={s.hintText}>Drag to orbit · scroll to zoom · double-click to reset view</span>
        <span className={s.hintKeys}>↑ ↓ · T</span>
      </div>
      <div className={s.grid}>
        {cur.big.map(([k, v, u]) => (
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
