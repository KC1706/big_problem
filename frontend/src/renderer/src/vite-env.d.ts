/// <reference types="vite/client" />
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.woff2' {
  const src: string
  export default src
}

// The vendored <bridge-twin> custom element (E8). Attributes are strings.
interface BridgeTwinAttributes extends HTMLAttributes<HTMLElement> {
  stage?: string
  theme?: string
  paused?: string
  replay?: string
  geom?: string
  data?: string
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'bridge-twin': DetailedHTMLProps<BridgeTwinAttributes, HTMLElement>
    }
  }

  interface Window {
    // Exposed by preload. Optional so the renderer also runs in a plain browser
    // (dev:web) for pixel-diffing against the oracle.
    bridgeApi?: {
      getApiBase: () => Promise<string | null>
    }
  }
}

export {}
