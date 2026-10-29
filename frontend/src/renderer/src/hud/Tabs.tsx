import { useStore, type Tab } from '@/state/store'
import { useLayout } from '@/layout/useLayout'
import s from './Tabs.module.css'

const TABS: Array<[Tab, string]> = [
  ['results', 'Results'],
  ['inputs', 'Inputs'],
]

/** Results/Inputs toggle, shown only in narrow mode with a paneled stage.
 *  `ws` becomes meaningful in F3; passed through from App. */
export default function Tabs({ ws }: { ws: boolean }) {
  const tab = useStore((st) => st.tab)
  const setTab = useStore((st) => st.setTab)
  const L = useLayout(ws)

  if (!L.tabs) return null

  return (
    <div className={s.wrap}>
      <div className={s.bar}>
        {TABS.map(([k, label]) => {
          const active = tab === k
          return (
            <button
              key={k}
              className={s.tab}
              onClick={() => setTab(k)}
              style={{
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--inv)' : 'var(--ink)',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
