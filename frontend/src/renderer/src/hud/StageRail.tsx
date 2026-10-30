import { useStore, STAGES, type StageDef } from '@/state/store'
import { useLayout } from '@/layout/useLayout'
import s from './StageRail.module.css'

/** Per-item colours — port of the Studio `stages` map (markup lines 955–963). */
function itemStyle(x: StageDef, active: boolean) {
  const dot =
    x.status === 'done' ? (active ? 'var(--inv)' : 'var(--ink)')
    : x.status === 'progress' ? 'var(--acc)'
    : 'transparent'
  const dotB =
    x.status === 'done' ? (active ? 'var(--inv)' : 'var(--ink)')
    : x.status === 'progress' ? 'var(--acc)'
    : x.status === 'ready' ? 'var(--faint)'
    : 'var(--line)'
  return {
    bg: active ? 'var(--ink)' : 'transparent',
    fg: active ? 'var(--inv)' : 'var(--ink)',
    op: x.status === 'locked' && !active ? 0.5 : 1,
    dot,
    dotB,
  }
}

export default function StageRail() {
  const i = useStore((st) => st.i)
  const go = useStore((st) => st.go)
  const g = useStore((st) => st.g)
  const projName = useStore((st) => st.wz.name)
  const L = useLayout()

  const projLine = `${g.span} m · PSC I-girder · ${g.nG} × G`

  return (
    <div
      className={s.wrap}
      style={{
        top: L.railTop,
        right: L.railRight,
        bottom: L.railBottom,
        width: L.railW,
        height: L.railH,
      }}
    >
      <div
        className={s.rail}
        style={{
          flexDirection: L.railDir,
          borderRadius: L.railRadius,
          padding: L.railPad,
          overflowX: L.railOX,
          overflowY: L.railOY,
        }}
      >
        {L.railHead && (
          <>
            <div className={s.head}>
              <span className={s.projName}>{projName}</span>
              <span className={s.projSub}>{projLine}</span>
            </div>
            <div className={s.lifecycleRow}>
              <span className={s.lcEyebrow}>LIFECYCLE</span>
              <span className={s.lcValue}>9 / 12</span>
            </div>
          </>
        )}

        {STAGES.map((x, j) => {
          const st = itemStyle(x, j === i)
          return (
            <div
              key={x.id}
              className={s.item}
              onClick={() => go(j)}
              title={x.name}
              style={{
                justifyContent: L.itemJustify,
                gap: L.itemGap,
                padding: L.itemPad,
                background: st.bg,
                color: st.fg,
              }}
            >
              <span className={s.itemNum}>{x.num}</span>
              <span
                className={s.itemName}
                style={{ display: L.nameDisp, flex: L.nameFlex, opacity: st.op }}
              >
                {x.name}
              </span>
              <span
                className={s.itemDot}
                style={{ background: st.dot, border: `1.5px solid ${st.dotB}` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
