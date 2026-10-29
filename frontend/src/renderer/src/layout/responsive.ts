import type { Tab } from '@/state/store'

export type Mode = 'wide' | 'mid' | 'narrow'

/**
 * Port of the Studio prototype's `layout(ws)`. Pure function of viewport width,
 * whether the current stage has input/result panels (`ws`), and the active tab.
 * Every field name and value is kept 1:1 with the design so the chrome matches.
 */
export interface Layout {
  mode: Mode
  brandText: boolean
  lensPill: boolean
  healthText: boolean
  exportLabel: string
  railTop: string
  railBottom: string
  railRight: string
  railW: string
  railH: string
  railRadius: string
  railPad: string
  railDir: 'row' | 'column'
  railOX: 'auto' | 'hidden'
  railOY: 'auto' | 'hidden'
  railHead: boolean
  itemJustify: string
  itemGap: string
  itemPad: string
  nameDisp: string
  nameFlex: string
  tabs: boolean
  showInputs: boolean
  showResults: boolean
  inTop: string
  inLeft: string
  inRight: string
  inW: string
  inH: string
  resTop: string
  resLeft: string
  resW: string
  resH: string
  bigInPanel: boolean
  strip: boolean
  stripLeft: string
  stripRight: string
}

export function computeLayout(w: number, ws: boolean, tab: Tab): Layout {
  const mode: Mode = w >= 1280 ? 'wide' : w >= 960 ? 'mid' : 'narrow'
  const narrow = mode === 'narrow'
  const mid = mode === 'mid'
  const railW = mode === 'wide' ? 220 : 64
  const inW = mode === 'wide' ? 280 : 256
  const resW = mode === 'wide' ? 'min(360px,28vw)' : '300px'
  const resWpx = mode === 'wide' ? 'max(300px,min(360px,28vw))' : '300px'
  return {
    mode,
    brandText: w >= 640,
    lensPill: w >= 760,
    healthText: w >= 1100,
    exportLabel: w >= 640 ? 'Export report' : 'Export',
    railTop: narrow ? '76px' : '84px',
    railBottom: narrow ? 'auto' : '16px',
    railRight: narrow ? '16px' : 'auto',
    railW: narrow ? 'auto' : railW + 'px',
    railH: narrow ? '48px' : 'auto',
    railRadius: narrow ? '999px' : '20px',
    railPad: narrow ? '5px' : mid ? '10px 8px' : '10px',
    railDir: narrow ? 'row' : 'column',
    railOX: narrow ? 'auto' : 'hidden',
    railOY: narrow ? 'hidden' : 'auto',
    railHead: mode === 'wide',
    itemJustify: mid ? 'center' : 'flex-start',
    itemGap: mid ? '6px' : '10px',
    itemPad: mid ? '0 6px' : '0 12px',
    nameDisp: mid ? 'none' : 'block',
    nameFlex: narrow ? 'none' : '1',
    tabs: narrow && ws,
    showInputs: ws && (!narrow || tab === 'inputs'),
    showResults: !narrow || !ws || tab === 'results',
    inTop: narrow ? 'auto' : '84px',
    inLeft: narrow ? '16px' : railW + 32 + 'px',
    inRight: narrow ? '16px' : 'auto',
    inW: narrow ? 'auto' : inW + 'px',
    inH: narrow ? '46vh' : 'auto',
    resTop: narrow ? 'auto' : '84px',
    resLeft: narrow ? '16px' : 'auto',
    resW: narrow ? 'auto' : resW,
    resH: narrow ? '46vh' : 'auto',
    bigInPanel: ws || narrow,
    strip: !ws && !narrow,
    stripLeft: railW + 32 + 'px',
    stripRight: 'calc(' + resWpx + ' + 32px)',
  }
}
