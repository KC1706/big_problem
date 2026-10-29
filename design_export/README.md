# BridgeLife Studio — Code Handoff

Target: a pixel-accurate rebuild in **React + Electron**.
Package date: 2026-10-29. Every file under `src/`, `docs/` and `references/` is a **byte-identical copy** of the project file. Each copy was compared against its source before zipping.

To run the prototype as-is, open `src/BridgeLife Studio.dc.html` in Chrome next to `src/support.js` and `src/bridge-twin.js`. You need to be online: it loads Google Fonts and three.js r160 from jsDelivr.

---

## 1. File manifest

| Path | Purpose |
|---|---|
| `src/BridgeLife Studio.dc.html` | The full prototype. The `<x-dc>` template holds all markup with inline styles. The `<script data-dc-script>` holds the `Component` class: state, stage data, `layout()` breakpoints, preview calculations (`section`, `calcAna`, `calcPre`, `calcF1`, `cal`) and per-stage `renderVals()` branches. **This is the source of truth for layout and behaviour.** |
| `src/BridgeLife Design System.dc.html` | Design-system sheet: principles, colour, type, components in both themes, the 3D lens table and motion rules. |
| `src/bridge-twin.js` | The `<bridge-twin>` custom element: a three.js scene, a shadow-DOM label layer, camera, build intro and per-stage lenses. Framework-agnostic, so it can be used as-is inside React. |
| `src/support.js` | The DC runtime that renders `.dc.html` files standalone. **Reference only, do not port.** It maps `{{ }}` holes, `<sc-for>`, `<sc-if>`, `<x-import>` and `style-hover` to React. |
| `docs/BridgeLife 3D Design Plan.md` | The original 3D-first plan: lenses, per-stage artifacts, motion and tech notes. |
| `references/*.png` (6) | The user's Pinterest reference screenshots at full resolution. |
| `tokens/tokens.json` | Machine-readable tokens: theme vars, condition ramp, instrument colours, type scale, radii, glass filters, sizes and breakpoints. |
| `tokens/css/tokens.css` | The same tokens as CSS custom properties: `[data-theme="light"]`, `[data-theme="dark"]` and `:root`. |
| `fonts/*.woff2` (6) | Geist 300/400/500/600 and Geist Mono 400/500, Latin subset (fontsource v5 builds). |
| `fonts/fonts.css` | `@font-face` rules pointing at the local woff2 files, for offline Electron use. |
| `fonts/LICENSE-OFL.txt` | SIL Open Font License 1.1 for Geist. |
| `README.md` | This file. |

**Not included:**
- `image-slot.js`: the project does not use it.
- three.js: `bridge-twin.js` imports `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` at runtime (line 3). For offline Electron, `npm i three@0.160.0` and change that `SRC` constant to a local import. That is the only line to change.

**Fonts:** the prototype loads them from `https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap`. Use these exact family names: `'Geist'` and `'Geist Mono'`. If you need Latin-ext or Cyrillic, take them from the `geist` npm package (Vercel). fontsource does not publish a Latin-ext Geist subset.

---

## 2. Tokens

### Theme variables
These are verbatim from the Studio `<helmet>`. Apply them with `data-theme` on the root element.

| Var | Light | Dark |
|---|---|---|
| `--bg` | `#e4e6e7` | `#0a0b0c` |
| `--ink` | `#16181a` | `#eef1f3` |
| `--mut` | `#5d6368` | `#9aa3a9` |
| `--faint` | `#8b9196` | `#6b7378` |
| `--glass` | `rgba(255,255,255,.76)` | `rgba(20,22,24,.72)` |
| `--glassB` | `rgba(22,24,26,.08)` | `rgba(255,255,255,.09)` |
| `--hover` | `rgba(22,24,26,.05)` | `rgba(255,255,255,.06)` |
| `--line` | `rgba(22,24,26,.1)` | `rgba(255,255,255,.1)` |
| `--inv` | `#f6f7f7` | `#0a0b0c` |
| `--acc` | `#127f94` | `#3fc1d9` |
| `--shadow` | `0 10px 40px rgba(20,24,28,.08)` | `0 10px 40px rgba(0,0,0,.4)` |

**Known discrepancy:** the Design System sheet uses `--glass` at `.74` (light) and `.68` (dark). The Studio values above are canonical.

### Fixed colours (both themes)
- **Condition ramp:** `#4FAE7F` Healthy, `#D9B443` Minor, `#E6893C` Deteriorated, `#E0442F` Severe. 3D heat interpolates continuously between these stops.
- **Instrument cyan:** `#2FB3CC`, used in 3D for sensors, tendons, the scan plane and dimension lines.

### Type scale

| Role | Family | Weight | Size | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| Numeral | Geist | 300 | 48px. Strip: `clamp(20px,2.2vw,30px)`; panel tiles 22px | −0.03em | 1 |
| Title | Geist | 500 | 26px (Studio right panel: 24px) | −0.025em | 1.1 |
| Body | Geist | 400 | 13px | 0 | 1.55 |
| Value | Geist Mono | 500 | 13px (rows), 16px (3D callouts) | 0 | normal; callouts 20px |
| Eyebrow | Geist Mono | 400 | 11px, uppercase | 0.08em | normal |

Numerals and values use `font-variant-numeric: tabular-nums`.

### Radii and surfaces
- **Spec radii:** panel 24, card 20, tile 16, input 10, pill 999.
- **Radii as actually used in Studio:**
  - 24: welcome card
  - 20: floating panels and numeral strip
  - 16: AI banner
  - 14: toasts and recent-project cards
  - 12: tiles and chart frames
  - 10: inputs and 3D callouts
  - 6: confusion-matrix cells
  - 999: buttons, rail, chips and segments
- **Glass:**
  - panels: `backdrop-filter: blur(18px) saturate(1.2)`
  - pills: `blur(18px)`
  - 3D callouts in the twin: `blur(12px) saturate(1.2)`

  Always set the `-webkit-` prefix as well.

---

## 3. Responsive layout (`layout(ws)` in Studio)

`w = window.innerWidth`, tracked by a resize listener plus a ResizeObserver. `ws` (workspace) is true for every stage except Dashboard.

| | **wide ≥ 1280** | **mid 960–1279** | **narrow < 960** |
|---|---|---|---|
| Stage rail | Left, `top 84 / bottom 16`, width 220. Has a project + LIFECYCLE header. Rows show number, name and dot. | Left, width 64, no header. Rows show number and dot, centred; name hidden. | Horizontal pill strip, `top 76`, height 48, scrolls on x with the scrollbar hidden. |
| Inputs panel | Left at `rail + 32` = 252, width 280. | Left at 96, width 256. | Bottom sheet at 46vh. Shown only on the **Inputs** tab. |
| Results panel | Right 16, width `min(360px,28vw)`. | Right 16, width 300. | Bottom sheet at 46vh. Shown only on the **Results** tab. |
| Results/Inputs tabs | — | — | Shown when `ws`, centred above the sheet at `bottom: calc(46vh + 24px)`. |
| Numeral strip | Bottom bar between rail and results, **Dashboard only**. In workspace stages it becomes a 2×2 tile grid inside the results panel. | Same as wide. | Always 2×2 tiles inside the results panel. |

Top-bar thresholds, independent of mode:
- brand wordmark ≥ 640
- lens/pause/replay pill ≥ 760
- health text ≥ 1100
- the export label reads "Export report" at ≥ 640 and "Export" below

When the **Welcome** overlay is open, the top bar, rail, panels, tabs and strip are all hidden. The background depends on width:
- ≥ 900: a left-to-right gradient, solid from 0–42%.
- < 900: `bg` at 92%, with the layout stacked.

---

## 4. Stages → `<bridge-twin stage>`

The twin's `stage` attribute is the stage `id`. While Welcome is open the Studio passes `welcome`, which is not in the twin's table. The twin then falls back to the `dashboard` camera and settings and shows **no labels**.

| # | id (= twin `stage`) | Display name | Lens label | Twin behaviour (`ST` table) |
|---|---|---|---|---|
| 00 | `dashboard` | Dashboard | Studio | auto-orbit .06, traffic, value pins |
| 01 | `config` | Configuration | Blueprint · exploded | exploded view, blueprint edges, dimensions |
| 02 | `analysis` | Analysis & design | Load · ×50 | 70R truck only, deflection ×, stress heat |
| 03 | `prestress` | Prestressing | X-ray | glass girders, tendons + particles, camber |
| 04 | `baseline` | Healthy baseline | Modes · scan | modes 1→2→3 every 4.5 s, scan plane |
| 05 | `inspection` | Visual inspection | Inspect · soffit | low soffit camera, light traffic, defect callouts |
| 06 | `ndt` | NDT | Heat · UPV | UPV heat on girders |
| 07 | `monitoring` | Monitoring | Sensors | sensors + pulse rings, traffic |
| 08 | `synthetic` | Synthetic data | Damage · ×100 | sag, red damage zone, condition heat |
| 09 | `features` | Features | Pins | auto-orbit, sensors, feature pins |
| 10 | `ml` | AI/ML assessment | Condition | condition heat, damage zone, half sag |
| 11 | `maintenance` | Maintenance | Condition · actions | condition heat, auto-orbit |
| 12 | `report` | Report | Elevation | elevation camera, figure caption |

Other twin attributes:
- `theme`: `light` or `dark`.
- `paused`: the string `"true"` or `"false"`. Pausing freezes physics and orbit; camera flights still finish.
- `replay`: any changing value replays the 4.6 s build intro.
- `geom`: the JSON described below.

Camera flights use cubic in-out over 1.9 s with a 22% pull-back arc. Labels fade in from +1.3 s, 120 ms apart.

---

## 5. `geom` JSON schema

`<bridge-twin geom='{"span":33,...}'>`. All lengths are metres. Missing keys fall back to the defaults below. Changes are debounced by 120 ms, then the scene is rebuilt.

| Key | Meaning | Default (33 m) | Studio slider range |
|---|---|---|---|
| `span` | Effective span L | 33 | 30 / 33 / 36 (segmented) |
| `depth` | Overall girder depth D | 1.65 | 1.2–2.2 |
| `web` | Web thickness t_w | 0.30 | 0.16–0.40 |
| `tfw` | Top flange width | 1.10 | 0.8–1.4 |
| `tft` | Top flange thickness | 0.18 | 0.12–0.28 |
| `bfw` | Bottom flange width | 0.75 | 0.5–1.0 |
| `bft` | Bottom flange thickness | 0.25 | 0.15–0.35 |
| `slab` | Deck slab thickness | 0.22 | 0.18–0.30 |
| `nG` | Number of girders (integer) | 5 | 4 / 5 / 6; the twin clamps to 3–8 |
| `sp` | Girder spacing c/c | 3.2 | 2.6–3.6 |

Derived values:
- Deck width: `W = (nG−1)·sp + 3.2`.
- Tendon end and mid heights scale with D. The three profiles are 0.27/0.08, 0.52/0.08 and 0.76/0.18 of D.

---

## 6. Hover and interactive states to port

The runtime's `style-hover="…"` becomes a real `:hover` rule. There are 5 occurrences:

| File | Line | Element | Hover rule |
|---|---|---|---|
| Studio | 40 | `<button>` onClick `togglePause` (Pause / Play) | `background:var(--hover)` |
| Studio | 41 | `<button>` onClick `doReplay` ("Replay") | `background:var(--hover)` |
| Studio | 106 | `<div>` onClick `it.go` (pick-list row, Inspection component list) | `background:var(--hover)` |
| Studio | 706 | `<div>` onClick `r.go` (Welcome → recent project card) | `border-color:var(--ink)` |
| Design System | 111 | `<button>` "Replay build" (quiet button spec) | `background:var(--hover)` |

Other states that are not `style-hover` but must be reproduced:
- **Links:** the `<helmet>` sets `a{color:inherit}` and `a:hover{color:var(--acc)}`.
- **Selected states (computed in JS):** rail rows, segmented buttons, chips and tabs. Active = `background var(--ink)` with `color var(--inv)`; inactive = transparent with `var(--ink)`. Chips also switch `border-color` between `var(--ink)` and `var(--line)`.
- **Rail rows:** `transition: background .2s, color .2s`.
- **Rail status dots:**
  - done: filled `--ink` (`--inv` when the row is active)
  - progress: `--acc`
  - ready: ring `--faint`
  - locked: ring `--line`, with the name at .5 opacity
- **Validation:** an invalid slider turns its value `#E0442F` and shows a red helper line.
- **Range inputs:** `accent-color: var(--acc)`.
- **3D canvas:**
  - cursor `grab`, `grabbing` while dragging
  - drag orbits, wheel zooms (r 10–150)
  - double-click re-flies to the stage view
  - auto-orbit resumes 4 s after the last user input
- **3D callout dot:** a 1.8 s pulse ring (`@keyframes pl` in the twin's shadow CSS).
- **Keyboard:** ↑/↓ change stage and T toggles the theme. Keys are ignored while focus is in an INPUT, TEXTAREA or SELECT.

---

## 7. 3D label values: hardcoded or data-driven

These are the labels drawn in `_labelDefs()` in `bridge-twin.js`. **Most are hardcoded sample strings** and do not follow Studio state.

| Stage | Data-driven | Hardcoded |
|---|---|---|
| config | `SPAN` (`geom.span`), `D` (`geom.depth`), `n × spacing` (`nG−1`, `sp`), web in mm (`geom.web`), slab in mm (`geom.slab`) | the "I-girder · M45" and "Deck slab" key text |
| analysis | the 70R callout's **position** follows the truck; the mid-span δ **value** is live, computed from the animated deflection and normalised so full load reads 18.4 | 70R "700 kN", M_max "6,840", the "δ ×50" tag |
| baseline | the mode number cycles 1→2→3 | frequency strings "3.21 / 5.86 / 8.41" |
| monitoring | A4/A5/A6 g values animate from a synthetic sine formula, not from data | sensor names |
| dashboard, prestress, inspection, ndt, synthetic, features, ml, maintenance, report | — | **all values** (f₁ 3.21, Pₑ 6,310, UPV 3.28, scenario S-07, ML "Deteriorated 0.81", etc.) |

Pin and callout **positions** do scale with `geom`, because they're anchored to `L`, `D`, `yT` and the girder z-positions. For production, add a `labels` attribute (JSON) or a JS property so the host supplies values; don't keep them in `_labelDefs`.

In the Studio panels, the numbers on these stages are calculated from inputs: Configuration, Analysis, Prestress, Baseline, Monitoring (Δf₁) and AI/ML (live predict). Analysis, Prestress and Baseline use simplified formulas, calibrated by `cal()` so the default inputs reproduce the sample values. The Maintenance evidence tags and the Dashboard rows are fixed text.
