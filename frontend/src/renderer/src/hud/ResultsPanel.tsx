import { useEffect, useMemo } from 'react'
import { useStore, STAGES, STATUS_META, stageEyebrow } from '@/state/store'
import { useLayout } from '@/layout/useLayout'
import { useStage } from '@/stage/useStage'
import { twinDataFor } from '@/stage/twinData'
import StageResults from './StageResults'
import s from './ResultsPanel.module.css'

/** Results panel. F2 completes the generic (dashboard) branch; the per-stage
 *  ws-specific result content (charts etc.) is added in F3+. Header, title/desc,
 *  and the bigInPanel grid are shared across all stages. */
const RESUME_TARGET = Math.max(0, STAGES.findIndex((s) => s.id === 'ml')) // dashboard "Resume · AI/ML"

export default function ResultsPanel() {
  const i = useStore((st) => st.i)
  const cur = STAGES[i]
  const L = useLayout(cur.ws)
  const { results } = useStage()
  const go = useStore((st) => st.go)
  const exportJSON = useStore((st) => st.exportJSON)

  // Publish this stage's verified callout values to the 3D twin (E4). Built from
  // the results we already have here — no extra backend calls.
  const pre = useStore((st) => st.pre)
  const syn = useStore((st) => st.syn)
  const setTwinData = useStore((st) => st.setTwinData)
  const twinJson = useMemo(
    () => JSON.stringify(twinDataFor(cur.id, results, pre, syn)),
    [cur.id, results, pre, syn],
  )
  useEffect(() => { setTwinData(twinJson) }, [twinJson, setTwinData])

  // Publish the dashboard's live numerals to the store so the NumeralStrip reads
  // them instead of calling useStage() again (a 2nd useStage would fire a 2nd
  // concurrent baseline solve → OpenSees global-state collision / 503).
  const setDashBig = useStore((st) => st.setDashBig)
  const dashBigJson = results.kind === 'dashboard' ? JSON.stringify(results.big) : null
  useEffect(() => {
    if (dashBigJson) setDashBig(JSON.parse(dashBigJson))
  }, [dashBigJson, setDashBig])

  if (!L.showResults) return null

  const [statusLabel, statusCol] = STATUS_META[cur.status]
  const isGeneric = !cur.ws
  // Dashboard (generic, non-ws) is now a LIVE aggregate: use the computed big/rows.
  const isDash = results.kind === 'dashboard'
  const bigData = cur.ws ? results.big : isDash ? results.big : [...cur.big]
  const genRows = isDash ? results.rows : cur.rows

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
              {genRows.map(([k, v]) => (
                <div className={s.row} key={k}>
                  <span className={s.rowKey}>{k}</span>
                  <span className={s.rowVal}>{v}</span>
                </div>
              ))}
            </div>
            <div className={s.actions}>
              <button className={s.primaryBtn} onClick={() => go(RESUME_TARGET)}>{cur.action}</button>
              <button className={s.saveBtn} onClick={exportJSON}>Save</button>
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
