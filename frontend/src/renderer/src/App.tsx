import { useEffect } from 'react'
import BridgeTwin from '@/canvas/BridgeTwin'
import TopBar from '@/hud/TopBar'
import StageRail from '@/hud/StageRail'
import Tabs from '@/hud/Tabs'
import InputsPanel from '@/hud/InputsPanel'
import ResultsPanel from '@/hud/ResultsPanel'
import NumeralStrip from '@/hud/NumeralStrip'
import Welcome from '@/hud/Welcome'
import { useStore, STAGES } from '@/state/store'
import styles from './App.module.css'

export default function App() {
  const theme = useStore((s) => s.theme)
  const setW = useStore((s) => s.setW)
  const next = useStore((s) => s.next)
  const prev = useStore((s) => s.prev)
  const toggleTheme = useStore((s) => s.toggleTheme)

  // Keyboard nav — ported from the design: ↑/↓ = prev/next stage, t = theme.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return
      if (e.key === 'ArrowDown') { e.preventDefault(); next() }
      else if (e.key === 'ArrowUp') { e.preventDefault(); prev() }
      else if (e.key === 't' || e.key === 'T') toggleTheme()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, toggleTheme])

  // Viewport width drives the responsive breakpoints (port of state.w + onResize).
  useEffect(() => {
    const onResize = () => setW(window.innerWidth)
    window.addEventListener('resize', onResize)
    onResize()
    let ro: ResizeObserver | undefined
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => setW(document.documentElement.clientWidth || window.innerWidth))
      ro.observe(document.documentElement)
    }
    return () => {
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [setW])

  // `ws` (stage has input/result panels) comes from the stage descriptor.
  const i = useStore((s) => s.i)
  const paused = useStore((s) => s.paused)
  const welcome = useStore((s) => s.welcome)
  const bumpTick = useStore((s) => s.bumpTick)
  const ws = STAGES[i].ws

  // Monitoring animates a synthetic trace on a 70 ms tick (port of syncAnim).
  useEffect(() => {
    if (welcome || STAGES[i].id !== 'monitoring' || paused) return
    const id = setInterval(bumpTick, 70)
    return () => clearInterval(id)
  }, [i, paused, welcome, bumpTick])

  return (
    <div className={styles.root} data-theme={theme}>
      <BridgeTwin />
      {welcome ? (
        <Welcome />
      ) : (
        <>
          <TopBar />
          <StageRail />
          <Tabs ws={ws} />
          <InputsPanel />
          <ResultsPanel />
          <NumeralStrip />
        </>
      )}
    </div>
  )
}
