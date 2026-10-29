# FRONTEND PLAN — Pixel-Perfect Port of the BridgeLife Studio Claude Design
_Created 2026-10-29. Companion to SESSION_HANDOFF.md and the plan file. Governed by the memory rule
`design-pixel-perfect-priority`: the design is the source of truth; the backend bends to it; engineering
values stay IRC/IS-correct._

## 0. Fidelity principle (non-negotiable)
Port, do not reinterpret. Every colour, px, radius, blur, gap, font weight, and value in the three design
files is canonical. Where the validated backend and the design disagree, **change the backend contract to
serve the design** — never soften the design. The only thing the backend keeps authority over is the
*correctness of engineering numbers* (we wire real values into the design's shapes; we never fudge physics
to match the design's placeholder numbers).

## 1. What the design actually is (inventory — all pulled & read)
Source: claude.ai/design project `776b87c4-0e1d-4f67-898a-74e06eb7f202` (see memory `claude-design-source`).

1. **`BridgeLife Design System.dc.html`** — tokens + component specs, both themes. The foundation.
2. **`BridgeLife Studio.dc.html`** (1310 lines) — a **complete functional prototype**, not a static screen:
   - A `DCLogic` `Component` (lines ~770–1310) holding all app state, all 13 stages' inputs/results,
     responsive `layout()` (wide ≥1280 / mid ≥960 / narrow <960), welcome screen, keyboard nav
     (↑/↓ = prev/next stage), a `jobs`/toast system, a tour auto-advance, and its **own approximate JS
     physics** (`section(g)`, `cal()`, `calcF1`, ML scoring) used to populate the UI.
   - An `x-dc` template (lines ~22–767) = the markup, with every style inline and exact.
3. **`bridge-twin.js`** — the **entire 3D** as one self-contained Three.js custom element `<bridge-twin>`,
   driven by attributes `stage, theme, paused, replay, geom`. Implements all 6 lenses, camera flies, the
   build-in intro, vertex-displacement deflection/mode shapes, heat colouring, X-ray tendons + sparks,
   sensors + pulse rings, IRC traffic, 3D pins/callouts/leaders/dimensions, damage glow, scan plane.
   `geom` is a JSON string: `{span, depth, web, tfw, tft, bfw, bft, slab, nG, sp}` (metres).
4. **`support.js`** — Claude Design's proprietary runtime (`DCLogic`, `x-dc`, `sc-for`, `sc-if`,
   `x-import`). **Not ported.** We replace it with React + state + `.map()`/conditionals. The inline
   *styles and values* are ported verbatim; the *runtime* is not.
5. **`uploads/*.png`** — 6 reference screenshots (visual acceptance targets).

## 2. Key architectural decision — reuse `bridge-twin.js` verbatim
`bridge-twin.js` **is** the design's 3D. Re-deriving it in R3F would risk the pixel-perfect goal and cost
weeks. Decision: **wrap the existing `<bridge-twin>` web component in a thin React component** and feed it
`stage/theme/paused/replay/geom` from the store. This guarantees the 3D matches the design exactly and loads
Three.js from a pinned CDN (it imports `three@0.160.0`; for offline packaging we vendor it locally).
- Tension with the "learn R3F" goal in the original plan: resolved by shipping pixel-perfect first with the
  web component, then (optional later milestone) re-implementing it in R3F as a *learning exercise that must
  produce identical output*. **User decision point — see §11.**

## 3. Stack & scaffold
- **electron-vite + React + TypeScript** (fork `ttonway/electron-python-boilerplate`, swap renderer).
- Renderer = one persistent `<bridge-twin>` canvas (position:fixed, inset:0) + a React HUD overlay above it.
- **zustand** store = the app state (direct port of the DCLogic `state`).
- **Styling: RAW CSS + the bundled `tokens.css`** (LOCKED 2026-10-29 — NOT Tailwind). The design is pure inline
  CSS over CSS variables; porting it as CSS Modules that reference `var(--glass)`, `var(--acc)`, etc. byte-matches
  the design's own model with no framework preflight/reset or utility rounding fighting pixel-fidelity. Port each
  element's inline styles verbatim into a component `.module.css`, then de-duplicate shared values into the token
  layer without changing output. No Tailwind, no preflight. (See §11 decision 4; the Tailwind option was rejected
  for the preflight/rounding pixel-risk.)
- **Fonts bundled locally** (Geist, Geist Mono woff2) — the Electron app must render offline; no Google
  Fonts CDN at runtime.
- **Python sidecar**: `electron/main.ts` spawns `uvicorn app.main:app` (dev) / the PyInstaller binary
  (packaged) on 127.0.0.1:8077; renderer calls it via a typed `src/api/` client.
- Proposed structure:
  ```
  frontend/
    electron/ main.ts (sidecar spawn + supervise), preload.ts
    src/
      canvas/BridgeTwin.tsx        # React wrapper around <bridge-twin>; vendored bridge-twin.js
      hud/                         # ported chrome
        TopBar.tsx ProjectPill.tsx LensPill.tsx HealthGauge.tsx ThemeToggle.tsx ExportButton.tsx
        StageRail.tsx Tabs.tsx InputsPanel.tsx ResultsPanel.tsx NumeralStrip.tsx
        Welcome.tsx Toasts.tsx HonestyBanner.tsx
        stages/<stageId>.tsx       # per-stage inputs+results content (13)
        primitives/                # Button, Chip, ParameterRow, NumeralTile, Card, Slider…
      state/store.ts               # zustand — port of DCLogic state + actions
      theme/tokens.css             # copied from design_export/tokens/css/tokens.css (both [data-theme] blocks)
      theme/fonts.css + fonts/*    # copied from design_export/fonts/ (Geist + Geist Mono woff2, local @font-face)
      hud/**/*.module.css          # per-component raw CSS (ports the design's inline styles)
      api/client.ts, types.ts      # backend client + response types
      layout/responsive.ts         # port of layout() breakpoints
    vite config, electron-builder config   # (no tailwind.config — raw CSS)
  ```

## 4. Tokens → theme layer (exact) — ALREADY ON DISK
**Done for us by the handoff.** Copy `design_export/tokens/css/tokens.css` into `src/theme/tokens.css` (both
`[data-theme]` blocks verbatim + condition ramp `#4FAE7F #D9B443 #E6893C #E0442F` + instrument cyan `#2FB3CC` +
type scale + radii panel 24/card 20/tile 16/input 10/pill 999 + glass `blur(18px) saturate(1.2)`), and
`design_export/fonts/` (woff2 + `fonts.css` with local `@font-face`) into `src/theme/fonts/`. `tokens.json` is the
machine-readable mirror if needed. No manual token transcription required. Theme is set by `data-theme` on the root
div; toggling updates both the HUD and `<bridge-twin theme>`. Consumed as plain CSS vars (`var(--acc)` …) — no build-tool config.

## 5. State model → zustand (port of DCLogic `state`)
Port these slices exactly (names kept so values map 1:1): `i` (stage index 0–12), `theme`, `paused`,
`tab` (results/inputs or 2D/3D), `w` (viewport width for breakpoints), `welcome` + `wz` (welcome form),
`g` (**geom** `{span,depth,web,tfw,tft,bfw,bft,slab,nG,sp}` — the single object that drives `<bridge-twin>`),
and the per-stage slices `ana, pre, base, mon, ndt, syn, feat, ml, mnt, rep, ins`, plus `jobs` (async
toasts) and `tick` (monitoring animation). Actions: `go(i)`, `setK(slice,k,v)`, `toggleTheme`,
`togglePause`, `doReplay`, `job(key,fn)`, `train()`. `data()` → the 13 stage descriptors (id, name, lens).

## 6. Component tree (port of the `x-dc` template)
- **`<BridgeTwin/>`** persistent 3D (props from store). Its 3D pins/leaders/dimension labels render inside
  its own shadow DOM — we do **not** rebuild those; we only build the 2D chrome around it.
- **TopBar** (top:16, height:52): ProjectPill (hamburger glyph + "BridgeLife Studio", opens Welcome),
  LensPill ("LENS" + current lens + Pause + Replay), HealthGauge (conic-gradient ring `#d9b443 0 82%`),
  ThemeToggle, Export (ink pill).
- **StageRail** (left:16): glass panel, optional header ("NH-16 Mahananda Bridge", project line,
  "LIFECYCLE 9/12"), 13 items each = mono num + name + status dot (active = ink bg/inv fg; done = ink dot;
  in-progress = acc dot; ready = faint ring; locked = line ring). Collapses to icon-only in narrow mode.
- **Tabs** (2D/3D or Results/Inputs) — glass pill, centered.
- **InputsPanel** (right or bottom per breakpoint): "INPUTS" eyebrow + per-stage controls — `pickList`
  (radio list w/ dots), `chipGroups` (pill toggles), sliders, and **ParameterRow** (label + mono value +
  unit + validation line that turns red `#e0442f` + 1.5px red border when out of range).
- **ResultsPanel**: result rows (label/value with hairline dividers) + **NumeralTile** (glass, big Geist-300
  number + mono unit) + stage charts (BM/SF/δ, loss waterfall, mode plots, a(t)+FFT, confusion/SHAP).
- **NumeralStrip** (bottom): 3–4 big key numbers for the stage.
- **Welcome** modal: project name / student / roll / span (30/33/36) / grade (M45…), "Start".
- **Toasts** (job progress bars) + **HonestyBanner** ("AI-generated, not a verified engineering result…")
  on ML & Maintenance.
Every per-stage `stages/<id>.tsx` reproduces that stage's exact inputs, result rows, numeral tiles, charts,
and callout copy from the Studio file (lines are indexed per stage in §1).

## 7. Responsive layout (port `layout()`)
Breakpoints: **wide ≥1280** (rail left, inputs right, numeral strip bottom), **mid ≥960** (narrower rail/
panels), **narrow <960** (rail collapses to icons, inputs dock to a bottom sheet). Port the `L` object's
fields (chrome display, rail top/right/bottom/width/dir/radius/pad, item justify/gap/pad, name display,
inputs top/left/right/width/height, tabs on/off) to a `responsive.ts` returning the same values by width.

## 8. Backend reconciliation (backend bends to design)
The design currently fills the UI from its own inline JS. We replace those with the real sidecar while
keeping the UI data shapes the design expects:
- **Geom adapter**: map design `g` (metres, keys above) ↔ backend `SectionConfig` (mm, GirderIn). One
  module converts both ways so the same `g` drives both `<bridge-twin>` and the API.
- **Endpoint reshaping (allowed & expected under the priority):** extend/reshape responses so each stage
  panel gets exactly its fields. Most compute exists (`/config/properties`, `/analysis/run`,
  `/prestress/compute`, `/baseline/establish`, `/monitoring/signal`, `/ndt/assess`, `/synthetic/generate`,
  `/ml/train`, `/ml/predict`, `/geometry/mesh`). Add fields/endpoints where a panel needs something not yet
  returned; keep names aligned to the UI.
- **Drive the 3D from real physics** (second pass, required for the "real physics" pillar, not for pixel
  fidelity): replace `bridge-twin`'s procedural `_heatCols` / mode shapes with arrays from
  `/geometry/mesh` (per-node `node_disp`, condition/NDT/stress heat). Feed via a new `geom`/data channel.
- **Stage count**: the design defines **13 stages**; the backend's current stage set differs — the design
  wins; the adapter maps each stage to the right endpoint(s). No backend physics is weakened.
- Preserve honesty gates: banner stays; every value flagged for IRC/IS; mode-ratio caveat until OpenSeesPy
  modes are wired.

## 9. Pixel-perfect verification methodology (the acceptance gate)

> **✅ ORACLE ON DISK (done 2026-10-29).** The BridgeLife handoff is exported, byte-exact, and verified. Canonical
> bundle: **`/Users/apple/big_prob/design_export/`** — `src/` (Studio.dc.html, Design System.dc.html,
> bridge-twin.js, support.js), `tokens/` (tokens.json + css/tokens.css), `fonts/` (Geist + Geist Mono woff2),
> `references/` (6 PNGs), `docs/`, `README.md`. Byte-exactness confirmed by diff against independent DesignSync
> pulls (Claude Design modified nothing).
>
> **Run the reference oracle:** `cd /Users/apple/big_prob/design_export/src && python3 -m http.server 8099`,
> then open `http://127.0.0.1:8099/BridgeLife%20Studio.dc.html` in Chrome (`file://` is blocked by the Chrome
> tool). Verified: welcome screen + full dashboard HUD render identically to the live design, zero console errors.
> **Caveat:** `support.js` pulls React/Babel from unpkg and `bridge-twin.js` pulls three@0.160.0 from jsDelivr at
> runtime, so the *reference* needs internet (distinct from E1, the *shipped app* offline concern — README gives
> the exact one-line fix). Geist/Geist Mono woff2 are bundled locally (pre-solves E13); tokens.json/css are a
> drop-in for §4.

1. **Reference harness**: serve the exported bundle locally (`<file>.dc.html` + `bridge-twin.js` +
   `support.js`) over HTTP to render the *actual* design, and/or use the 6 upload screenshots, as ground truth.
2. **Compare**: screenshot the React app and the reference at identical viewport via the Chrome browser
   tools, for **every stage × {light,dark} × {wide,mid,narrow}**. Overlay/diff.
3. **Tolerance**: exact on colour, spacing, radius, blur, font weight/size, letter-spacing. Any deviation
   is a bug, not a judgement call (per §0).
4. **Per-screen checklist** committed alongside each `stages/<id>.tsx`.

## 10. Milestones (ordered, each ends with a pixel-diff pass)
- **F0 — Scaffold + foundation. ✅ DONE 2026-10-29.** electron-vite+React+TS at `frontend/`; raw-CSS tokens +
  local Geist woff2 (copied from `design_export`); tolerant free-port sidecar spawn + preload IPC (E12); vendored
  `bridge-twin.js` mounted with the E1 offline fix (`import('three')` → three@0.160.0 **bundled**, verified in the
  build output, no CDN); zustand store (13 stages + geom); theme toggle drives twin + HUD; ↑/↓ nav; pointer
  pass-through (E9). *Gate MET:* typecheck + offline build green; rendered at `http://127.0.0.1:5199` (`npm run
  dev:web`) → 3D + token-styled shell match the design in **both** themes, **zero console errors**. (Real HUD
  chrome is F1; F0 chrome is a labelled "F0 scaffold" control strip.)
- **F1 — Chrome shell. ✅ DONE 2026-10-29.** TopBar (project pill/hamburger, lens pill + Pause/Replay with CSS
  `:hover`, health gauge conic 82%, theme toggle, Export) + StageRail (wide header + 13 items, exact status→
  dot/bg/fg/opacity rules) + Tabs (Results/Inputs, narrow+paneled only) + `responsive.ts` (verbatim port of
  `layout()`). All raw CSS + token vars (no Tailwind). Nav: ↑/↓ stage, `t` theme, rail click, resize→breakpoints;
  lens/pause/replay wired to twin. *Gate MET:* typecheck + offline build green; **wide** light+dark pixel-match
  the oracle (zero console errors); **mid/narrow** breakpoints logic-verified against the design's `layout()`
  (rail 220→64px icons→horizontal pill row) — screenshots couldn't photograph them (Chrome capture normalizes to
  1440px), but the port is 1:1 and the components consume it. F0 scaffold strip removed.
- **F2 — Dashboard stage end-to-end. ✅ DONE 2026-10-29.** `hud/ResultsPanel.tsx` (eyebrow + status chip, title/
  desc, bigInPanel grid, generic rows + action/Save) + `hud/NumeralStrip.tsx` (orbit/keys hint + 4-col big-numeral
  grid), ported from markup 175–213 & 748–764. Store now carries all 13 stages' full descriptors (title/desc/rows/
  big/action/ws) + `STATUS_META` + `stageEyebrow` (ports of `data()`/`SL`/`cur.eyebrow`). Health gauge already in
  TopBar (F1). *Gate MET:* dashboard pixel-matches the oracle (panel rows + bottom strip), zero console errors; ws
  stages render the shared header/title/desc/big-grid partial (inputs + per-stage charts deferred to F3).
- **F3 — Vertical slice. ✅ DONE 2026-10-29.** Config, Analysis, Baseline, Monitoring — inputs + results +
  charts, all driven by ported physics. New: `physics/physics.ts` (verbatim port of section/cal/calcAna/calcPre/
  calcF1), `stage/inputs.ts` (seg/sl builders + per-stage input defs), `stage/results.ts` (per-stage chart/row/
  check/big computation), `stage/useStage.ts`, `hud/InputsPanel.tsx` (segs, sliders w/ red validation, pickList,
  chipGroups, inAction) and `hud/StageResults.tsx` (config cross-section SVG; analysis BM/SF; baseline mode
  shapes; monitoring animated a(t)+FFT). Store gained ana/base/mon slices, jobs (async progress), tick, and
  setG/setAna/setBase/setMon/job/bumpTick. ResultsPanel now renders computed big + per-stage content; Tabs live
  in narrow. *Gate MET:* all 4 stages pixel-match the oracle with live-computed values (section props; M_max 6,840/
  V_max 1,120/δ 18.4; modes 3.21/5.86/8.41; measured f₁ 3.12 + FFT peaks), input→recompute verified (engine toggle
  flips modes 1:1.826:2.62 ↔ 1:4:9 = E3), monitoring trace animates, zero console errors.
- **F4 — Remaining stages. ✅ DONE 2026-10-29.** All 8 remaining stages (Prestress, Inspection, NDT, Synthetic,
  Features, ML, Maintenance, Report) built as full inputs + results, plus Welcome modal + HonestyBanner (cur.ai on
  ML & Maintenance). New: `stage/data.ts` (FEATURES/COMPS/SEC/NDT_TESTS/COL/SEVN), big additions to `stage/inputs.ts`
  (chips/pickList/textFields/predSliders/ML-train branches) and `stage/results.ts` (cable+waterfall, elevation+log,
  NDT grid+bands, synthetic met charts+preview, correlation matrix, confusion matrix, decision tree+actions+
  timeline, report thumbs+TOC — all computed), `hud/Welcome.tsx`. Store gained pre/ins/ndt/syn/feat/ml/mnt/rep/wz
  slices + generic `setK` + `train` + `createProject`/`skipWelcome`; `ai` flag on stages; welcome defaults on.
  Export = visual stub (as in the design); "Toasts" = the inline job progress bars (ndt/syn/ana/base/ml/report).
  *Gate MET:* verified in-browser — Welcome, Prestressing (cable/waterfall), ML (confusion matrix + predSliders +
  honesty banner), Maintenance (decision tree + actions + honesty), Report (thumbs/TOC), Inspection (pickList +
  clickable elevation + log) all pixel-match the oracle with live-computed values; typecheck + offline build green,
  zero console errors. (NDT/Synthetic/Features share the same verified patterns.)
- **F5 — Backend wiring** (reviewed against the real backend 2026-10-29). The design *anticipates* this swap (its
  own panels say "the backend replaces these"), so wiring real values is intended; **displayed numbers shift from
  the calibrated placeholders to real IRC/IS values** — UI stays pixel-perfect.
  - **Interaction (LOCKED):** keep `physics.ts` for instant slider preview, then debounce (~150 ms) → backend and
    replace with the real value (preview→verified). Both paths coexist.
  - **Clean matches (wire first):** Config `POST /config/properties`, Monitoring `POST /monitoring/signal` (real
    a(t)+FFT), ML `POST /ml/train`+`/ml/predict` (real confusion matrix/importance).
  - **E2 section:** adopt the design's 5-param no-fillet section in the backend so twin geometry = computed
    properties; adapter maps `g` (m) ↔ `SectionConfig`/`GirderIn` (mm) + units module (E14).
  - **E3 modes (LOCKED: write now):** `app/compute/openseespy_engine.py` is MISSING — backend only makes analytical
    1:4:9 today. Write a real FE modal engine for the realistic 3.2/5.85/8.4 triplet + real mode shapes.
  - **Reshape (E6):** Analysis (vehicle position/distribution/barrier/footpath; M_dead+M_live split + L/800 limit +
    BM/SF arrays; "70R + A"); Prestress (camber + jacking input); Baseline (engine/Ec/mass-mode/ζ in; mass+EI out);
    Monitoring (baseline spectrum too); Synthetic (mechanism/location/extent/severity); Features (new/derive).
  - **Stays client-side:** Inspection, Maintenance (rule engine), Report, Dashboard aggregate.
  - **E4 twin labels:** HUD shows real values; twin 3D callout numbers stay illustrative until `bridge-twin.js` gets
    a data channel (deferred, user call).
  - New: `api/client.ts` (sidecar URL via `window.bridgeApi.getApiBase`), `api/adapter.ts`, `api/types.ts`. Keep
    backend green (`pytest -q`) after each change.
- **F6 — Polish + package**: full pixel-diff sweep; offline packaging `.dmg`/`.exe` with sidecar
  auto-start; report export.

## 11. Decisions — LOCKED (2026-10-29)
1. **3D approach: reuse `bridge-twin.js` verbatim** (wrap in React). R3F rewrite is an optional later
   learning exercise that must reproduce identical output.
2. **Fonts: bundle Geist / Geist Mono locally** (offline-correct). ✅ woff2 already on disk (`design_export/fonts`).
3. **Pixel oracle: ON DISK + verified** (`design_export/`, byte-exact, renders with zero console errors). See §9.
4. **Chrome styling: RAW CSS + `tokens.css` — NOT Tailwind** (LOCKED 2026-10-29). Tailwind rejected because
   its preflight reset + utility value-rounding fight pixel-fidelity (the #1 priority); the design is pure inline
   CSS over variables, so CSS Modules referencing the token vars byte-match it with nothing to neutralize. See §3/§4.
5. **Plan status: FINALISED — F0 is cleared to start.** All architectural decisions locked; oracle in place;
   tokens + fonts pre-built; remaining edge cases (E2/E3/E4/E6) are milestone-scoped (F5), not F0 blockers.
6. **F5 modes (2026-10-29): write the OpenSeesPy engine now** for realistic modes (E3) — backend's
   `openseespy_engine.py` is missing and it only makes analytical 1:4:9 today.
7. **F5 interaction (2026-10-29): instant local preview + backend reconcile** — keep `physics.ts` for immediate
   slider feedback; debounce → backend → replace with the real value. (Full F5 plan in §10.)

## 12. Edge cases & traps (grounded in the actual design code — resolve before/within each milestone)

### CRITICAL — affect feasibility or fidelity
- **E1 · Three.js offline + CSP.** `bridge-twin.js` does `import('https://cdn.jsdelivr.net/npm/three@0.160.0…')`
  at runtime. A packaged Electron app is offline and its CSP will block remote imports. → **Vendor
  three@0.160.0 locally** and rewrite the `SRC` constant to a bundled module URL; set renderer CSP to allow
  it. Decide dev strategy too (bundle vs CDN in dev).
- **E2 · Section-model mismatch (biggest backend-bends item).** The design's 3D + its `section(g)` use a
  **5-parameter I-section** (`bfw,bft,web,tfw,tft`) with **no fillets**. The backend uses a **7-zone section
  with 150 mm fillets** (`GirderIn`). Same inputs → different A, I, and therefore different f₁. For
  pixel-perfect + consistent numbers, **the backend must adopt the design's section model** (accept the
  5-param section; fillets optional/zero) so the twin's geometry and the computed properties agree. Concrete
  change to `geometry.py` / `SectionConfig`.
- **E3 · Mode character (analytical 1:4:9 vs design's realistic triplet).** The design shows modes
  **3.21 / 5.86 / 8.41 Hz** (≈1 : 1.82 : 2.62 — closely spaced, realistic). The analytical engine returns
  **1 : 4 : 9** (3.54 / 14.1 / 31.8). Side by side, analytical will look wrong. → **Wire the OpenSeesPy
  engine for modes** (already an open thread) or calibrate; needed for the design's displayed physics to
  read true.
- **E4 · The twin's labels are hardcoded.** `_labelDefs` embeds literal values ('3.21', '6,310', etc.) and
  `<bridge-twin>` only accepts `geom` — it has **no data channel** for real results. So "reuse verbatim"
  gives pixel-perfect visuals but **static 3D numbers**. To show real backend values *in the 3D callouts*
  we must **extend `bridge-twin.js`** with a `data`/`results` attribute (a deliberate, documented deviation
  from verbatim). Interim: HUD panels show real values; twin pins stay illustrative. **User call** on when
  to extend the twin.
- **E5 · Pixel-diff against a moving 3D.** The scene auto-rotates (`cfg.auto`), runs traffic, modes, scan,
  and a 4.6 s build-in intro — screenshots are never frame-identical. → Diff methodology must **pause the
  twin, skip the intro, and compare the HUD layer** (and treat 3D as visual-only acceptance via the 6
  reference screenshots), not naive full-frame pixel diff.

### IMPORTANT
- **E6 · Missing backend endpoints for 4 stages.** Backend covers config/analysis/prestress/baseline/
  monitoring/ndt/synthetic/ml. The design's **dashboard (aggregate), inspection (defect log), features
  (feature view), maintenance (decision), report (compile)** have no endpoint. → Add them (backend bends to
  the design's 13-stage model).
- **E7 · Templating is not find/replace.** `sc-for`, `sc-if`, `{{ expr }}`, `onClick="{{ fn }}"`,
  `style-hover="…"` (a Claude Design pseudo) and `x-import` are `support.js` runtime features. Each becomes
  React (`.map`, conditionals, handlers, real `:hover`/`onMouseEnter`). Hover states on nearly every
  button rely on `style-hover` — must be reproduced as CSS `:hover`.
- **E8 · Custom element in React/TS.** Import `bridge-twin.js` once so it self-registers; declare
  `<bridge-twin>` in JSX intrinsic elements; pass **string** attributes (`paused="true"`, `geom="{…}"`) —
  React sets attributes (not properties) for hyphenated tags, which matches the component's
  `observedAttributes`. The 120 ms geom-rebuild debounce disposes/recreates the whole scene on each slider
  change — acceptable, watch perf.
- **E9 · Pointer-event pass-through.** Orbit/zoom live on the canvas; the HUD is `pointer-events:none`
  except interactive pills (`pointer-events:auto`). Must preserve exactly or dragging-to-orbit breaks.
- **E10 · backdrop-filter perf.** Many `blur(18px) saturate(1.2)` glass panels composited over an animating
  WebGL canvas can cost FPS. Profile; keep within the 60 fps budget (low-power fallback per the design).
- **E11 · Cross-platform packaging of heavy native deps.** PyInstaller bundling `openseespy`, `pyoma2`,
  `scipy` into both `.dmg` and `.exe` is the known-hard part; plan platform-specific CI.
- **E12 · Sidecar port management.** We already hit a stale `uvicorn` on :8077 this session. Main process
  must pick a free port (or kill-stale) and hand the URL to the renderer over IPC, not assume 8077.

### MINOR / polish
- **E13 · Font metrics.** Use the official Vercel **Geist** woff2 so tabular-nums and metrics match Google's
  served copy; verify numerals don't shift.
- **E14 · Units discipline.** Design = metres, backend = mm. One tested adapter module; every field audited.
- **E15 · Welcome inputs → backend.** Welcome collects name/roll/span(30/33/36)/grade(M45). Map grade→`fck`,
  span→`g.span`; `carriageway_width`/other `SectionConfig` fields need defaults or UI.
- **E16 · Reduce-motion.** Honor `prefers-reduced-motion` → pause twin motion, cut idle rotation (design
  specifies this).
- **E17 · Export + save.** Export is a stub; real export needs a twin **snapshot API** (not present yet) +
  HUD capture → PNG/report. `.bridgeproj` save/load format is undefined in the prototype — design it.
- **E18 · Monitoring stream.** Design animates a synthetic trace on a 70 ms `tick`; real data is a fetched
  `a(t)` array from `/monitoring/signal`. Reconcile static-fetch vs animated-stream presentation.

## Verification (overall)
- Backend stays green: `cd backend && PYTHONPATH=. pytest -q` (8 checks) after every API change.
- Each stage renders identically to the reference (both themes, 3 breakpoints).
- End-to-end: new 33 m project → traverse all 13 stages → real backend values shown → export → packaged
  app launches offline with the sidecar auto-starting.
