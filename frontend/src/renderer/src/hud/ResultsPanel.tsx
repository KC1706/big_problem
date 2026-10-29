import { useStore, STAGES, STATUS_META, stageEyebrow } from '@/state/store'
import { useLayout } from '@/layout/useLayout'
import { useStage } from '@/stage/useStage'
import StageResults from './StageResults'
import s from './ResultsPanel.module.css'

/** Results panel. F2 completes the generic (dashboard) branch; the per-stage
 *  ws-specific result content (charts etc.) is added in F3+. Header, title/desc,
 *  and the bigInPanel grid are shared across all stages. */
export default function ResultsPanel() {
  const i = useStore((st) => st.i)
  const cur = STAGES[i]
  const L = useLayout(cur.ws)
  const { results } = useStage()

  if (!L.showResults) return null

  const [statusLabel, statusCol] = STATUS_META[cur.status]
  const isGeneric = !cur.ws
  const bigData = cur.ws ? results.big : [...cur.big]

  return (
    <div
      className={s.wrap}
      style={{ top: L.resTop, left: L.resLeft, width: L.resW, height: L.resH }}
    >
      <div className={s.panel}>
        <div className={s.header}>
          <span className={s.eyebrow}>{stageEyebrow(cur)}</span>
          <span className={s.statusChip}>
            <span className={s.statusDot} style={{ background: statusCol }} />
            {statusLabel}
          </span>
        </div>

        <div className={s.titleBlock}>
          <div className={s.title}>{cur.title}</div>
          <div className={s.desc}>{cur.desc}</div>
        </div>

        {L.bigInPanel && bigData.length > 0 && (
          <div className={s.bigGrid}>
            {bigData.map(([k, v, u]) => (
              <div className={s.bigTile} key={k}>
                <span className={s.bigKey}>{k}</span>
                <span className={s.bigVal}>
                  <span className={s.bigNum}>{v}</span>
                  {u && <span className={s.bigUnit}>{u}</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {isGeneric ? (
          <>
            <div className={s.rows}>
              {cur.rows.map(([k, v]) => (
                <div className={s.row} key={k}>
                  <span className={s.rowKey}>{k}</span>
                  <span className={s.rowVal}>{v}</span>
                </div>
              ))}
            </div>
            <div className={s.actions}>
              <button className={s.primaryBtn}>{cur.action}</button>
              <button className={s.saveBtn}>Save</button>
            </div>
          </>
        ) : (
          <StageResults r={results} />
        )}
      </div>

      {cur.ai && (
        <div className={s.honesty}>
          <span className={s.honestyDot} />
          <span className={s.honestyText}>
            AI-generated, not a verified engineering result. Check thresholds against the current IRC / IS codes before acting.
          </span>
        </div>
      )}
    </div>
  )
}
