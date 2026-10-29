# SESSION HANDOFF — BridgeLife Studio
_Cross-session resume doc. Last updated: 2026-10-28. Read this first after clearing/starting a session._

## What this project is
A cross-platform (Mac/Windows) **desktop app** for an IIT-KGP civil assignment (CE60258, Prof. Nirjhar
Dhang) about a **33 m post-tensioned PSC I-girder bridge**. The frontend is being built as an
**explorable 3D "game"** (React Three Fiber) so the user can **learn game development** while building
it. The backend does all the real engineering + AI/ML.

- Project root: `/Users/apple/big_prob`
- Source assignment PDF: `AIML_SIS_Problem_BIG_v01_One_Month_Integrated.pdf`
- Full plan / Game Design Doc / learning curriculum / milestones:
  `/Users/apple/.claude/plans/so-i-wanted-it-frolicking-lighthouse.md`

## Decisions locked (do NOT re-ask)
- **Span = 33 m.**
- **Stack = Electron + React + Python.**
- **3D = React Three Fiber (Three.js)** — keeps the Python backend; chosen to learn game dev.
- **Scope = full guided studio, all stages, as a full explorable 3D world.**
- App is the primary goal, **long timeline** (not the Oct 31 academic deadline).
- User is **designing the 2D HUD/overlays in Claude Design** separately. The 3D world is built in
  code, NOT in Figma/Claude Design.
- **⭐ NON-NEGOTIABLE (2026-10-28): design is not to be compromised.** #1 priority = frontend HUD
  **pixel-perfect to the Claude Design** (tokens, spacing, type, color, icons, states matched exactly).
  If the validated backend's API/data shape doesn't fit the design, **change the backend to serve the
  design** (reshape endpoints/fields/formats) — NOT the reverse. Guardrail: engineering values stay
  IRC/IS-correct (honesty gates remain); "align backend" = its interface/data contracts, never fudging
  numbers to match a mockup. Frontend build order is **design-led**: port design tokens → build HUD
  components → pixel-diff vs Claude Design → then wire data. (Saved in memory:
  `design-pixel-perfect-priority`.)
- Design access authorized this session via `/design-login` (standalone claude.ai/design; closes
  **Dec 14, 2026** — pull the design before then). `list_projects` empty as of handoff (user still
  finalizing / not yet published).

## Status
**DONE & VALIDATED — do not rebuild:**
- Backend compute core + FastAPI at `backend/`. Python 3.12 venv at `.venv/`.
- **7/7 verification tests pass.** All stage endpoints smoke-tested over HTTP.
- Engines: `openseespy` ✓, `pyoma2` ✓, analytical fallback ✓.
  (`opstool` broken on missing `_tkinter` — not needed, skip it.)
- Validated physics (33 m): f₁≈3.54 Hz (modes 1:4:9), Pₑ<P₀, synthetic Healthy→Severe separates
  cleanly, FFT recovers f₁.

**NEW (2026-10-28):** backend mesh endpoint for the 3D is **done & tested (8/8 pass)**.
- `GET /api/geometry/mesh` → default 33 m section; `POST /api/geometry/mesh` (SectionConfig body) →
  tuned section (Foundry live re-extrude). Returns `nodes` (beam nodes on neutral axis, m, x=span),
  `elements` (line connectivity), `girder_polygon`/`deck_polygon` ((z,y) outlines in m to extrude
  along x), and `modes[k] = {mode, frequency, node_disp:[[dx,dy,dz]...]}` peak-normalised to 1.0
  (bending = vertical dy). World convention: x=span, y=up, z=transverse.
- New file `backend/app/compute/mesh.py`; schema `GeometryMeshResponse` in `models/schemas.py`;
  endpoints + `_mesh_for()` in `routers/stages.py`; test `test_mesh_nodes_elements_and_modal_vectors`.
- Verified: default f₁=3.536 Hz (1:4:9), mode-1 ends≈0/mid=1.0; POST(30 m, web 1100)→f₁=4.65 Hz.

**NEW (2026-10-29): Claude Design fully pulled & frontend plan written — building NOT started.**
- Design project `776b87c4-0e1d-4f67-898a-74e06eb7f202` read in full (memory `claude-design-source`).
  It's not a mockup: `bridge-twin.js` = the entire 3D as a self-contained Three.js web component
  (13 stages/lenses, geom-driven); `BridgeLife Studio.dc.html` = a complete functional prototype
  (state model, all stages, responsive layout, welcome, placeholder physics); `Design System.dc.html`
  = tokens + components.
- **`/Users/apple/big_prob/FRONTEND_PLAN.md`** = the detailed pixel-perfect port plan (read it first for
  the frontend). Decisions LOCKED: reuse `bridge-twin.js` verbatim (wrap in React); bundle Geist fonts
  locally; drop Claude Design's runtime (support.js) and replace with React + zustand; backend bends to
  the design. Contains F0–F6 milestones, pixel-diff methodology, and **18 edge cases (E1–E18)** — the
  critical ones: E1 vendor three.js for offline/CSP, E2 section-model mismatch (design 5-param no-fillet
  vs backend 7-zone — backend must adopt design's section), E3 wire OpenSeesPy modes (analytical 1:4:9
  ≠ design's realistic 3.21/5.86/8.41), E4 twin labels are hardcoded (needs a data channel for real
  values), E5 pixel-diff must pause the moving 3D.
- **User is reviewing the plan; will resume building after the usage limit resets. Do NOT start F0 yet.**

**NEW (2026-10-29): pixel-oracle method verified + two gaps surfaced (feasibility of FRONTEND_PLAN §9).**
- **Oracle method PROVEN.** A Claude Design *handoff export* is a self-contained bundle (`design/*.dc.html`
  + `design/support.js` + `tokens/css/*`). Rendered a sample export (`~/Downloads/design_handoff_wanderly_journal`)
  standalone over local HTTP (`python3 -m http.server`, open `http://127.0.0.1:<port>/<file>.dc.html` — note
  `file://` is blocked by the Chrome tool) → renders faithfully (fonts, icons, SVG, layout), **zero console
  errors**. So FRONTEND_PLAN §9's "diff React app vs. a live reference" gate is executable. `support.js` has
  **no claude.ai/API calls** — not platform-locked.
- **CAVEAT — oracle needs internet.** `support.js` loads React 18.3.1 + ReactDOM + Babel-standalone from
  unpkg, and fonts from Google Fonts, at runtime. Fine on a dev machine; the *reference* can't run air-gapped
  (this is separate from E1, which is about the *shipped app* being offline).
- **✅ RESOLVED (2026-10-29) — BridgeLife handoff now ON DISK, byte-exact, and rendered.** The gap below is
  closed. Canonical bundle at **`/Users/apple/big_prob/design_export/`** (22 files, 5.8 MB), pristine copy also
  at `~/Downloads/BridgeLife-handoff`. Structure: `src/` (BridgeLife Studio.dc.html, BridgeLife Design
  System.dc.html, bridge-twin.js, support.js), `tokens/` (tokens.json + css/tokens.css — both themes verbatim +
  condition ramp + instrument cyan + type/radii/glass), `fonts/` (Geist 300/400/500/600 + Geist Mono 400/500
  woff2 + fonts.css + OFL), `references/` (6 PNGs), `docs/` (3D plan), `README.md` (file manifest + the exact
  one-line three.js change for offline).
  - **Byte-exactness verified:** handoff `support.js` + `Studio.dc.html` diff-identical to independent DesignSync
    API pulls (only diff = a trailing newline my `jq` added) → Claude Design did NOT modify any source file.
  - **Oracle rendered from the on-disk bundle:** served `design_export/src/` over local HTTP, opened
    `BridgeLife Studio.dc.html` in Chrome → welcome screen AND full dashboard HUD (top bar, 13-stage rail,
    3D bridge + pins/traffic, results panel, numeral strip) render identically to the live claude.ai design,
    **zero console errors**. The §9 pixel-diff gate now has its reference oracle.
  - **Bonus — two edge cases pre-solved by the handoff:** **E1** (README gives the exact single line to change —
    `bridge-twin.js` `SRC` const → local `three@0.160.0`); **E13** (real Geist/Geist Mono woff2 bundled).
    tokens.json/css also pre-solve the §4 token port (drop-in for Tailwind/CSS vars).
- **⚠️ ORIGINAL GAP (now resolved, kept for history) — BridgeLife design was NOT exported to disk.** It had only
  been *read* via the DesignSync API; there was no local bundle, so the §9 gate had nothing to compare against.
- **Residual pixel-perfect risk is unchanged and localized:** the hand-ported **HUD chrome + Tailwind**
  (preflight reset + utility rounding fight exact fidelity), NOT the 3D (verbatim reuse = identical) and NOT
  the oracle. With the oracle working the risk is now *catchable per-stage* instead of discovered at F6 —
  provided (a) BridgeLife is exported first and (b) the chrome is built diff-driven. See FRONTEND_PLAN §0/§3.

**FRONTEND — F0 COMPLETE (2026-10-29).** Scaffold at **`/Users/apple/big_prob/frontend/`** (electron-vite +
React 18 + TS + zustand). Structure: `src/main/index.ts` (window + tolerant free-port uvicorn sidecar spawn + IPC,
E12), `src/preload/index.ts` (contextBridge `window.bridgeApi.getApiBase`), `src/renderer/src/` (`main.tsx`,
`App.tsx` + `App.module.css`, `canvas/BridgeTwin.tsx` + vendored `bridge-twin.js`, `state/store.ts` [13 stages +
geom], `theme/` [tokens.css + fonts.css + 6 Geist woff2, copied from `design_export`]).
- **Styling = raw CSS + tokens.css, NOT Tailwind** (locked; preflight/rounding fight pixel-fidelity).
- **E1 solved & verified:** `bridge-twin.js` three.js import repointed to npm `three@0.160.0`; build output shows
  `three.module` bundled locally (no CDN). **E13:** real Geist woff2 bundled. **E9/E12** handled (see above).
- **Verified:** `npm run typecheck` + offline `vite build` green; rendered at `http://127.0.0.1:5199`
  (`npm run dev:web`) in Chrome → full 3D bridge + token glass chrome, theme toggle drives twin + HUD in both
  themes, **zero console errors**. F0 gate met.
- **Run frontend:** `cd frontend && npm run dev` (Electron desktop) OR `npm run dev:web` (browser, for pixel-diff
  vs. the oracle at `design_export/src`). `npm run build` = offline production bundle.
- **F1 COMPLETE (2026-10-29).** Real HUD chrome, all ported from the Studio source (raw CSS + tokens, no Tailwind):
  `hud/TopBar.tsx` (project pill/hamburger, lens pill + Pause/Replay with `:hover`, health gauge conic 82%, theme
  toggle, Export), `hud/StageRail.tsx` (wide header + 13 items with exact status→dot/bg/fg/opacity), `hud/Tabs.tsx`
  (Results/Inputs, narrow+paneled only), `layout/responsive.ts` + `useLayout.ts` (verbatim port of `layout()`:
  wide ≥1280 / mid ≥960 / narrow <960). Store grew `w`/`tab`/`welcome`/`setW`/`setTab`/`openWelcome`; STAGES now
  carry real `status` + `lens`. App wires ↑/↓ + `t` keys, resize→breakpoints, rail click; F0 scaffold strip gone.
  - **Verified:** typecheck + offline build green; wide light+dark pixel-match the oracle (zero console errors);
    mid/narrow logic-verified by running `responsive.ts` (rail 220px→64px icons→horizontal pill row). NOTE: the
    Chrome screenshot tool normalizes capture to 1440px, so mid/narrow can't be photographed via `resize_window`
    — verify them by resizing a real browser window on `npm run dev:web`, or in the Electron app.
- **F2 COMPLETE (2026-10-29).** `hud/ResultsPanel.tsx` (eyebrow + status chip, title/desc, bigInPanel grid,
  generic rows + action/Save) and `hud/NumeralStrip.tsx` (orbit/keys hint + 4-col numeral grid), ported from the
  Studio results panel (markup 175–213) and numeral strip (748–764). Store now holds all 13 stages' full
  descriptors (title/desc/rows/big/action/ws) + `STATUS_META` + `stageEyebrow` helpers (ports of data()/SL/cur).
  App renders ResultsPanel + NumeralStrip, `ws` read from the stage.
  - **Verified:** typecheck + offline build green; dashboard pixel-matches the oracle (panel + bottom strip),
    zero console errors; a ws stage (Analysis) renders the shared header/title/desc/big-grid partial cleanly
    (lens pill + twin lens switch correct). Inputs panel + per-stage result content intentionally deferred.
- **F3 COMPLETE (2026-10-29).** Vertical slice: Config, Analysis, Baseline, Monitoring — full inputs + results +
  charts, driven by the ported design physics. New files: `physics/physics.ts` (verbatim section/cal/calcAna/
  calcPre/calcF1 — a calibrated fidelity port, NOT IRC/IS-correct; backend replaces it in F5), `stage/inputs.ts`,
  `stage/results.ts`, `stage/useStage.ts`, `hud/InputsPanel.tsx` (+ .module.css), `hud/StageResults.tsx`
  (+ .module.css). Store slices added: `ana`/`base`/`mon` + `jobs`/`tick` + setters/`job`/`bumpTick`.
  - **Verified in-browser:** Config (Span/Girders segs + 8 sliders → live section props + cross-section SVG),
    Analysis (BM/SF SVG charts + M_max 6,840/V_max 1,120/δ 18.4), Baseline (3 mode-shape SVGs + f 3.21/5.86/8.41,
    engine toggle flips to 1:4:9 → 12.84/28.89 = E3 live), Monitoring (animated a(t) + FFT peaks, Records
    120,000). Reactive input→physics→chart loop confirmed; typecheck + offline build green; zero console errors.
  - Charts use inline SVG from computed path strings (ports of the design's SVG generators).
- **F4 COMPLETE (2026-10-29).** All 8 remaining stages + Welcome + HonestyBanner, full inputs + results, ported
  from the design. New files: `stage/data.ts` (FEATURES/COMPS/SEC/SEC_PG/NDT_TESTS/COL/SEVN), `hud/Welcome.tsx`
  (+ .module.css). Big extensions: `stage/inputs.ts` (chips/pickList/textFields/predSliders + 8 stage branches),
  `stage/results.ts` (cable+loss-waterfall, inspection elevation+log, NDT grid+bands, synthetic met-charts+preview
  table, features correlation-matrix+distribution+importance, ML confusion-matrix+importance, maintenance
  decision-tree+actions+timeline, report thumbs+TOC — all computed via ported physics/formulas), `hud/StageResults.tsx`
  + `.module.css` (11 branches), `hud/InputsPanel.tsx` (textFields + ML train/predict), `hud/ResultsPanel.tsx`
  (honesty banner via `cur.ai`). Store: added pre/ins/ndt/syn/feat/ml/mnt/rep/wz slices + generic `setK` + `train`
  + `createProject`/`skipWelcome`; `ai` flag; **welcome defaults ON** (first-run); App hides chrome + shows Welcome
  when welcome, twin stage = 'welcome'.
  - **Verified in-browser:** Welcome, Prestressing, ML (+honesty banner +confusion matrix +live-predict sliders),
    Maintenance (+decision tree +honesty), Report (+thumbs/TOC), Inspection (+pickList +clickable elevation +log)
    all pixel-match the oracle with live values; typecheck + offline build green; zero console errors. NDT/Synthetic/
    Features use the same patterns (built, typecheck-clean; not individually screenshotted).
  - **Export** is a visual stub (matches the design — it never produced files); **"Toasts"** = the inline job
    progress bars inside stage results (ndt/syn/ana/base/ml/report), driven by store `jobs` + `job()`.
- **FULL HUD IS NOW COMPLETE** (F0–F4). The entire 13-stage Studio renders faithfully from the ported physics with
  no backend. Remaining: wire the real backend + package.
- **F5 REVIEWED (2026-10-29) — not started; decisions locked.** Reviewed the real backend (`routers/stages.py`,
  `models/schemas.py`, `compute/engine.py`) against the F4 frontend. Findings: the design *anticipates* the backend
  swap (its panels say "the backend replaces these"), so real values are intended and **numbers will shift from the
  placeholders to real IRC/IS values**; UI stays pixel-perfect. Clean matches: config/properties, monitoring/signal,
  ml/train+predict. Need reshaping (E6): analysis (vehicle pos/distribution/barrier/footpath + M split + L/800 +
  BM/SF arrays + "70R + A"), prestress (camber + jacking input), baseline (engine/Ec/mass/ζ in; mass+EI out),
  monitoring (baseline spectrum), synthetic (mechanism/loc/extent/severity), features (new endpoint). Stay
  client-side: inspection/maintenance/report/dashboard-aggregate. **E2** section mismatch (design 5-param-no-fillet m
  vs backend 7-zone-fillet mm) → adopt design's section in backend + units adapter. **⚠️ E3: `app/compute/
  openseespy_engine.py` is MISSING** — `make_engine` only returns analytical 1:4:9 (even kind="openseespy" falls
  back); realistic 3.2/5.85/8.4 modes require WRITING that engine. **Decisions locked:** (1) write the OpenSeesPy
  engine now; (2) interaction = instant local `physics.ts` preview + ~150 ms debounce → backend reconcile (keep both
  paths). New FE files planned: `api/client.ts` (sidecar URL via `window.bridgeApi.getApiBase`), `api/adapter.ts`,
  `api/types.ts`. Full F5 plan in FRONTEND_PLAN.md §10 + decisions §11.
- **(original NEXT) F5** (backend wiring): geom adapter (design `g` ↔ `SectionConfig`), endpoint reshaping so each panel
  gets its fields, drive the twin's heat/modes from `/geometry/mesh`, **swap `physics/physics.ts` for real FastAPI
  calls** — addresses E2 (backend adopt 5-param section), E3 (OpenSeesPy modes), E4 (twin data channel), E6 (missing
  endpoints). Backend is validated & running-ready (see "How to resume the backend"). **THEN F6** (polish + offline
  packaging .dmg/.exe with sidecar auto-start; the main-process sidecar spawn is already stubbed in `electron/`).

**EARLIER NOT-STARTED note (superseded):** the entire frontend had no code.

## How to resume the backend
```bash
cd /Users/apple/big_prob && source .venv/bin/activate
cd backend && PYTHONPATH=. pytest -q                  # expect: 7 passed
uvicorn app.main:app --host 127.0.0.1 --port 8077     # /docs = API, /health = engines
```

## Next steps (design-led order — see NON-NEGOTIABLE above)
1. **Pull the Claude Design HUD** once the user says it's ready: `/design-login` (done) →
   DesignSync `list_projects → list_files → get_file`. This is the source of truth for the UI.
2. ~~**Backend touch-up:** `GET/POST /api/geometry/mesh`~~ **DONE 2026-10-28** (see above).
3. **Port the design first:** translate Claude Design tokens → Tailwind theme; build HUD components
   to match pixel-for-pixel; pixel-diff against the design BEFORE wiring any data.
4. **Scaffold `frontend/`** by forking `ttonway/electron-python-boilerplate`; swap renderer for R3F
   (`@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`,
   `@react-three/postprocessing`, `zustand`, `r3f-perf`, `leva`). HUD layer = React + Tailwind over
   the canvas, matching the design.
5. **M0 grey-box vertical slice:** box-bridge in Electron, orbit camera, press key → bridge vibrates
   in f₁ pulled live from `/api/geometry/mesh`. Proves the physics→visual loop.
6. Follow the learning curriculum + production milestones (M1 three zones → M2 all zones → M3
   art/perf → M4 package .dmg/.exe). Details in the plan file. Reshape any backend endpoint if the
   design/HUD needs a different payload (allowed & expected under the design-first priority).

## The 3D world (zones = assignment stages)
Foundry (configuration) · Load Yard (analysis) · Tensioning Bay (prestress) · Baseline Lab (modal
fingerprint) · Inspection Walk (first-person defect tagging) · Test Rig (NDT) · Sensor Net
(monitoring) · Time Machine (synthetic data/deterioration) · Diagnosis Deck (features + AI/ML) ·
Verdict (maintenance) · Report Terminal. Every visual is driven by real backend physics.

## Key files
- Compute core: `backend/app/compute/*` (geometry, materials, engine, loads, prestress, ndt,
  synthetic, features, ml)
- API: `backend/app/routers/stages.py`, `backend/app/main.py`
- Schemas: `backend/app/models/schemas.py`
- Tests: `backend/tests/test_compute.py`
- Backend docs: `backend/README.md`
- Deps: `backend/requirements.txt` (+ `requirements-lock.txt`)

## Open threads / caveats
- Analytical engine gives modes **1:4:9**; real deck is tighter (like the PDF's 3.2/5.85/8.4) — wire
  **OpenSeesPy** modes for realism.
- Synthetic-data ML accuracy ~100% because classes are separable by design — the value is the
  **interpretation**, not the number (the assignment rewards reasoning).
- Every engineering value must be verified against **paywalled IRC/IS codes** — no invented clause
  numbers anywhere in the code.
