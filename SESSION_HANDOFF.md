# SESSION HANDOFF — BridgeLife Studio
_Cross-session resume doc. Last updated: 2026-10-30. Read this first after clearing/starting a session._

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
- **F5 IN PROGRESS — increment 1 DONE & VERIFIED (2026-10-29).** API layer built + pipeline proven end-to-end.
  New FE files: `api/types.ts`, `api/client.ts` (base via `window.bridgeApi.getApiBase` → dev fallback :8077,
  paths under `/api`), `api/adapter.ts` (**E2 solved by adapter alone** — backend's 5-zone trapezoid section == the
  design's 5-param section; map params + fillets 150/120 mm + `hw=depth−bft−tft−0.27`; unit helpers), `api/useBackend.ts`
  (debounced `enabled`-gated abortable fetch), `api/verify.ts` (preview→verified: swaps headline `big`). `useStage`
  now returns verified `big` when it arrives.
  - **Verified in Chrome (both servers up):** Config → `POST /api/config/properties` 200, no CORS/console errors;
    the verified big (Area 1.517 m² transformed) correctly differs from local preview (1.537 m² raw geometry) —
    the "numbers become real" behavior works. Debounce fires on input change.
  - **To run F5 locally:** backend `cd /Users/apple/big_prob && source .venv/bin/activate && cd backend &&
    PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8077`; frontend `cd frontend && npm run dev:web`.
  - **Increments 1–8 DONE & VERIFIED (2026-10-29/30), in Chrome with both servers up (200 + OPTIONS preflight):**
    1. **Config** `/config/properties` — verified big = real transformed section props (vs raw preview 1.537→1.517).
    2. **Baseline** `/baseline/establish` reshaped (new `BaselineRequest`: engine/ec_gpa/mass_mode/zeta; response
       adds mass_per_girder_kg_m/EI_composite_GNm2/damping_percent). Real freqs 2.67/10.68/24.04 Hz + real
       mode-shape arrays + mass 5,577 kg/m + EI 19.1 (vs placeholders 3.21/5.86/8.41). Full-model-swap.
    3. **Analysis** `/analysis/run` reshaped (AnalysisRequest adds distribution/barrier_kN_m/footpath_kN_m2 + "70R+A";
       response adds moment_dead/live + deflection_limit; δ = live-only). Real M_max 9,098 / V 1,103 / δ 9.0 /
       δ-limit 0.22; Courbon/Grillage/barrier/fp drive it. BM/SF shapes stay local, M_max label real.
    4. **Prestress** `/prestress/compute` reshaped (PrestressRequest adds `jack_fraction` → σ_p0 = frac×fpk;
       response adds `camber_mm` + `sigma_bot_transfer` + `sigma_bot_service`; camber = prestress hog − self-weight
       sag in SI; transfer/service bottom-fibre via `stage_stresses`). Real P₀ 11,132 kN / loss 24.7% / Pₑ 8,380 /
       camber 1 mm at 3 cables; cables→4 live-swapped to P₀ 14,843 / loss 28.9% / camber 9 mm. Loss-waterfall bars
       rebuilt in verify.ts from the real per-loss %s; cable-profile geometry stays local. Real loss > preview 19.6%
       because creep dominates (correct for PT). `useVerify(id, g, base, ana, pre)`.
    5. **Monitoring** `/monitoring/signal` — real ambient/impact acceleration + FFT spectrum + modal tracking.
       `useVerify(id, g, base, ana, pre, mon)`. Two signal calls (seed 2 = measured, seed 101 = baseline overlay
       realization) + the `bsl` baseline/modal call enabled for monitoring too. Measured f₁ = dominant peak NEAREST
       the analytical modal f₁ (modal tracking, rejects spurious bins); a peak is labelled only where one actually
       sits near a mode (mode 2 is a node at L/2 → correctly unlabelled). Verified: Ambient f₁ 2.66 vs baseline
       2.67 → Δf₁ −0.6%; Impact live-swaps to a decaying ring-down, a_max 0.080→0.922 g, razor-sharp FFT, Δf₁ 0.1%.
       **TWO backend fixes were required for physical consistency (both kept pytest 8/8):**
       (a) `engine.acceleration_response` was double-`np.gradient`-ing the displacement → spurious dominant peaks
       (3.33/31 Hz) unrelated to the model. Now records pseudo-acceleration `wn²·x` (∝ modal displacement) → a clean
       sharp resonance exactly at ωₙ. (b) `SignalRequest`/`monitoring_signal` now take `ec_gpa`+`mass_mode`+`zeta`
       and apply the SAME `ei_factor`(=Ec/Ec_default)·`mass_factor`(+SIDL) as `/baseline/establish`; previously the
       signal used engine defaults (f₁ 3.316) while baseline scaled to 2.67 → a false 20% Δf₁. Frontend `sigBody`
       sends `ec_gpa: base.Ec, mass_mode: base.mass, zeta: base.zeta`. a(t)/a_RMS/a_max use the design's cosmetic
       "g" amplitude scale (0.02 factor is arbitrary on both sides); the real content is the frequencies/features.
    6. **Synthetic** `/synthetic/generate` reshaped (SyntheticRequest adds `mechanisms`/`location`/`extent_m`/
       `severity_pct`/`preview_only`). New `synthetic.scenario_preview()` applies the user's damage scenario to the
       REAL engine: stiffness loss `x = (sev/100)·(ext/L)·sin(π·loc)·stiff·2.533 (+0.02 bearing), cap 0.6`
       (stiff=1 for Cracking/Stiffness/Corrosion else 0.3) → ei=1−x → real f₁/δ; UPV drops with cracking; +sag for
       prestress loss. Returns scenario + baseline + deterministic per-class summary (condition-range midpoints via
       engine) + 6 real sample preview rows. `useVerify(…, syn)` patches big/met/prev/label/labCol. Verified: sev 35
       → Deteriorated, f₁ 3.04, δ 43.0, lines Δf₁ −8.4/Δδ +28.2/ΔUPV −14.0; sev→55 live-swaps to Severe, f₁ 2.87,
       δ 49.6, Δf₁ −13.6/Δδ +48.0/ΔUPV −22.0. Per-class bars match summary exactly. **`L=eng.L` (metres) — section.span
       is mm (caused an x≈0 bug, fixed).** `preview_only=true` is the live path; `generate_dataset` (unchanged, test-
       covered) is the full ML dataset path (preview_only=false), **not yet wired** — see below.
       **⚠️ Synthetic→ML data flow still TODO:** `/ml/train` takes `rows`/`labels`/`feature_order` IN THE REQUEST, so
       the frontend must hold the dataset. There is NO dataset slot in the store yet, and the "Generate dataset" button
       (`inputs.ts:202`) still only bumps `syn.ver` (fake job). The ML increment must: add a store slot, wire the button
       to `d.job('syn', …)` calling `/synthetic/generate` with `preview_only:false` (~17s for 2400 rows — use the
       progress bar), store rows/labels, then feed `/ml/train` + `/ml/predict`.
    7. **Features** NEW endpoint `/features/matrix` (FeaturesRequest: section + n_per_condition(50) + noise + seed).
       Generates a labelled multi-condition dataset via `generate_dataset`, returns REAL Pearson `correlation` (10×10),
       `by_class` per-feature mean/std, RandomForest `importance` (same `train_classifier` the ML stage uses),
       `strongest` off-diagonal pair, `conditions`, `n`. `useVerify(…, feat)` patches cm/dist/imp/big/sel/meaning/
       lo/hi/cols. Backend call deps = [geometry, noise] only; **feature toggles + inspect-feature are client-side
       subsetting (no refetch)** — verified switching inspect f₁→δ_max made no network call. FEATURES display order is
       positional-identical to backend FEATURE_ORDER (f₁↔f1 … RH↔rebound). Verified: f₁-by-condition 3.30/3.23/3.08/2.77
       (declines), δ_max 33.5→47 (rises), importance ε_max 0.18/δ_max 0.17/f₂ 0.17/f₁ 0.17/f₃ 0.16, corr(f₁,δ)=−0.996.
       **Strongest |r| = f₂↔f₃ 1.00** — honest: analytical modes are all ∝ √EI so perfectly correlated (another E3
       idealization; a real grillage would decouple them). ~1.25s/call.
    8. **ML (AI/ML assessment)** NEW endpoint `/ml/pipeline` (MLPipelineRequest: section + model + split + n_estimators
       + df_pct/delta_mm/upv live sliders). Self-contained: generates a labelled dataset → trains the chosen model →
       predicts the live feature vector, ALL in one call. Models: 'Random Forest'(RF), 'XGBoost'(→sklearn
       GradientBoosting, added `kind` param to `train_classifier`), 'IsoForest'(→`train_anomaly_detector`, 2×2
       Normal/Anomaly confusion built from scores vs threshold). Live feature vector built in the endpoint from the 3
       sliders + healthy-class means for the other 7 features (f2/f3 scaled with f1 ∝√EI; eps from delta). `useVerify(…,
       ml)` patches model/pred/predCol/confS/nTest/cm/cmCols/imp/big. Fixed dataset seed → confusion/accuracy/importance
       stable while prediction sliders move. **Confusion reordered to severity order in FE (clf.classes_ is
       alphabetical).** Verified: RF acc 92.5%, pred Minor conf 0.65, confusion with real off-diagonal errors, importance
       UPV 0.23/RH 0.18/ε_max 0.17/δ_max 0.15/f₃.10/f₁.08/f₂.06/vibration≈0; IsoForest acc 90.5%, 2×2 [[47,3],[16,134]],
       pred Anomaly score 0.60; Δf₁ −8.4→−0.7 live-flipped IsoForest to Normal (score 0.51). AI honesty banner present.
       twin callout still hardcoded (E4). ~1.4s/call (n_per_condition=50).
       **TWO shared-code changes for ML realism (pytest 8/8, re-verified Synthetic+Features still sensible):**
       (a) `CONDITION_RANGES` now OVERLAP slightly at class boundaries (condition labels are human bins over a continuous
       spectrum — realistic, and makes classification non-trivial). (b) `generate_dataset` adds `meas_noise`(=0.02)
       measurement scatter to f1/f2/f3/delta (temperature/operational variability — the real reason SHM ML isn't 100%).
       Without these, RF/XGBoost hit a perfect diagonal (acc 1.0). NOTE: these changed Features corr(f₁,δ) −0.996→−0.939
       and the strongest pair is now δ_max↔ε_max=1.0 (ε is defined ∝ δ — an honest identity). `scenario_preview`
       (Synthetic stage) does NOT use generate_dataset, so Synthetic is unaffected.
       **NOTE — "Generate dataset" button + store dataset slot still NOT wired** (Increment 6 TODO): the ML stage is now
       self-contained via `/ml/pipeline` (generates its own dataset each call), so the button/slot are no longer required
       for ML to work — but the Synthetic "Generate dataset" button (`inputs.ts:202`) still only bumps `syn.ver`. If a
       persisted shared dataset is ever wanted, wire it then; otherwise this item can be dropped.
    - **Pattern:** `api/verify.ts` builds a per-stage patch (partial ResultsModel) merged over the local preview in
      `useStage`. Add a stage = add a `useBackend` gated by `enabled` + a patch branch.
      Backend edits kept green (pytest 8 passed each time); run uvicorn with `--reload`.
  - **E4 DONE & VERIFIED (2026-10-30):** the twin's 3D callouts now read real values via a new `data` channel.
    `<bridge-twin>` gained a `data` observed attribute (JSON); `_labelDefs` reads values through `V(key,fallback)`
    (falls back to design defaults for unmapped keys); `_refreshLabelValues()` updates callout text in place on data
    change (no re-animation); baseline modes read `this._data.modes` live per-frame. Producer: `ResultsPanel` publishes
    `twinDataFor(stageId, results, pre, syn)` (frontend/src/renderer/src/stage/twinData.ts) to the new store field
    `twinData` via an effect — built from the SAME verified `results` the HUD has, so NO extra backend calls.
    `BridgeTwin.tsx` passes `data={twinData}`. Wired stages: analysis(M_max), prestress(cableF/pe_p0/camber),
    baseline(modes f₁/f₂/f₃), synthetic(ei/ext/f1), ml(pred/conf/anom/topf/topfv). Verified in Chrome: prestress twin
    callout Pₑ/P₀ 0.753 → 0.711 live on cables 3→4 (=8380/11132); ml callout "Minor 0.65" (was hardcoded "Deteriorated
    0.81"); no console errors. **Not wired (graceful design-default fallback):** dashboard (cross-stage aggregate — no
    single-stage source), features (no direct callout mapping), monitoring (animated acc values kept), and the
    client-side stages (inspection/ndt/maintenance/report).
  - **E3 BUILT & VERIFIED (2026-10-30) → see `E3_SCOPE.md` (as-built summary at top).** `SectionProps` gained J/Iy/Ip;
    NEW `app/compute/openseespy_engine.py` `OpenSeesEngine(AnalyticalEngine)` builds a 5-girder 3-D grillage (longitudinal
    composite girders + transverse deck strips → coupled bending/torsion), `ops.eigen('-fullGenLapack')`, overrides
    natural_frequencies/modal, inherits deflection + acceleration_response (which auto-uses grillage freqs). `make_engine
    ('openseespy')` now loads it (fallback kept). pytest **9 passed** (added test_grillage_modes_are_closely_spaced:
    f₂/f₁<4). Verified in Chrome: Baseline engine toggle flips live between OpenSeesPy (2.67/2.79/3.54, f₂/f₁=1.04 — the
    realistic closely-spaced triplet) and Analytical (2.67/10.68/24.04, 1:4:9); twin callout shows the real grillage mode;
    no console errors. **✅ OPEN DECISION RESOLVED (2026-10-30): grillage now drives the WHOLE SHM pipeline** (user:
    "go with grillage, I need realistic results"). Monitoring/Synthetic/Features/ML switched off the analytical default —
    `engine` field (default `openseespy`) added to SignalRequest/SyntheticRequest/FeaturesRequest/MLPipelineRequest +
    `SyntheticConfig.engine`; `generate_dataset`/`scenario_preview`/`baseline_fingerprint` build via `make_engine(kind=…)`;
    routers thread `req.engine`; FE `verify.ts` feeds one `engKind` (Baseline toggle) to all five stages. **Grillage made
    cheap + exact:** stiffness ∝ ei_factor, mass ∝ mass_factor uniformly → f = f(1,1)·√(ei/mass) EXACTLY, shapes invariant,
    so `OpenSeesEngine` solves ONCE per n_modes (`_eigen_base`, cached) and scales analytically (the SHM stages sweep 100s of
    ei_factors/call). Verified: exact (rel err 0.0), 200-row grillage dataset ≈1.0s, ml/pipeline ≈2.8s, pytest 9/9; HTTP
    features(grillage) 3.50/3.74/5.69 closely-spaced vs analytical 3.50/14.05/31.41 (1:4:9). See `E3_SCOPE.md`.
  - **Remaining F5: effectively complete.** E3 (grillage engine) and E4 (twin data channel) are both DONE. All 8
    compute/AI stages wired to the real backend. Open/optional items only: (a) ✅ DONE — Monitoring/Synthetic/Features/ML
    now use the selected (grillage-by-default) engine; the Baseline toggle drives the whole SHM pipeline; (b) maintenance/dashboard could read the real ML
    class instead of the mlScoreOf heuristic; (c) the Synthetic "Generate dataset" button + persisted store dataset slot
    (not needed — ML is self-contained). Client-side by design: inspection, NDT, maintenance, report, dashboard.
  - **✅ FUNCTIONAL GAPS CLOSED (2026-10-30) — verified in Chrome, zero console errors:**
    1. **Maintenance → real ML.** `verify.ts` persists the real `/ml/pipeline` outcome to new store field `mlReal`
       (`{pred,conf,anom,iso,cls}`) via a `useEffect`; `results.ts` maintenance branch consumes it (falls back to the
       `mlScoreOf` slider heuristic only before ML has ever run). Verified: ML predicts **Minor** (cls 1) → Maintenance
       Path flips to **Monitor** (was "Investigate" under the old heuristic's cls≈2). `mlReal` threaded via `useStage`
       → `ResultDeps`.
    2. **Export → real JSON.** New store action `exportJSON()` (TopBar "Export report" + Features "Export feature
       matrix") downloads `bridgelife-<project>.json` via a Blob — full inputs (13 slices) + results (`mlReal`,
       `dataset`). Offline, client-side. Verified: 3.7 KB file written to ~/Downloads with real ML (`pred:"Minor"`) +
       dataset summary. TopBar stub comment removed.
    3. **"Generate dataset" → real.** New store action `genDataset()` POSTs `/synthetic/generate` `preview_only:false`
       (`n_per_condition=round(syn.n/4)`, engine from Baseline toggle), drives the progress bar to ~90 % while running,
       then stores `dataset` summary ({n, conditions, perClass}) and bumps `syn.ver`. Verified: button → POST pending
       ≈18 s → 200, stage shows **Dataset v8 · 2,400 records** (600/class). `SyntheticDatasetResponse` type added.
    4. **Features/Synthetic charts on grillage** re-verified in-browser: Synthetic preview Deteriorated/f₁ 3.04/δ 43.0 +
       all three by-class charts render; ML confusion/importance render with real values. No regressions.
    - Files touched (FE only): `state/store.ts` (mlReal/dataset fields + setMlReal/genDataset/exportJSON),
      `api/verify.ts` (persist effect), `api/types.ts` (SyntheticDatasetResponse), `stage/useStage.ts` (thread deps),
      `stage/results.ts` + `stage/inputs.ts` (consume), `hud/TopBar.tsx` (wire Export). typecheck + offline build green.
    - Mid/narrow responsive breakpoints unaffected by this work (no layout changes); still logic-verified only.
  - **✅ DASHBOARD LIVE + FULL BUTTON/DATA AUDIT (2026-10-30) — verified in Chrome, zero console errors:**
    - **Dashboard (stage 00) is now a LIVE aggregate** (was static 0.82/Minor). New `DashRes` kind in `results.ts`
      (dashboard branch); `verify.ts` enables the baseline + prestress calls for the dashboard and overlays real
      grillage **f₁ (2.67 Hz)** and **Pₑ/P₀ (0.753)**; Span/Engine are exact; Condition reads the persisted real ML
      class (`mlReal`) or the live heuristic before ML runs. Rows are real too: "Stages complete N/12" (new `seen`
      tracking in `go/next/prev`), "Last run" (new `lastSeen`), Engine, Span. ResultsPanel generic branch renders
      `results.big`/`results.rows`; NumeralStrip reads a store-published `dashBig` (see concurrency fix below).
    - **TopBar health gauge is live** (was hard-coded 0.82/Minor): value + label + conic-fill % + colour all derive
      from the real condition class (`HEALTH_BY_CLASS`, `COL[cls]`).
    - **Dead buttons wired (no more no-ops):** dashboard "Resume · AI/ML" → navigates to the ML stage; generic
      "Save" → `exportJSON`; Synthetic "Export CSV" → downloads the preview rows as CSV (`stage/download.ts`
      `downloadText`/`toCsv`); Maintenance "Confirm decision" + Report "Download" → `exportJSON`; Welcome
      "Open .bridgeproj" → relabeled "Open project", opens a file picker → new `importJSON()` store action hydrates
      every slice (defensive per-key merge) from a previously exported project .json.
    - **⚠️→✅ Concurrency fix (backend robustness):** making the SHM stages use the grillage + the dashboard firing
      baseline/prestress exposed that **OpenSeesPy keeps ONE global model**, so concurrent solves (dashboard's two
      former useStage calls; monitoring's two simultaneous signal calls) raced → intermittent **503**. Fixed two ways:
      (1) NumeralStrip no longer calls `useStage` — ResultsPanel publishes `dashBig` to the store (one backend call);
      (2) a process-wide `threading.Lock` (`_OPS_LOCK`) in `openseespy_engine._eigen_base` serializes every OpenSees
      model-build + eigen. Verified in Chrome: dashboard + monitoring now all 200, no 503, no console errors. pytest 9/9.
    - **Reactive-stage action buttons left as cosmetic replays (NOT fake data):** analysis "Run full FE analysis",
      baseline "Establish baseline", ml "Retrain", ndt/report job bars animate `d.job(...)` — those stages already
      compute LIVE/reactively (verify.ts fires on every input change), so the displayed values are real; the button
      just replays the progress animation. Flagged here so it is not mistaken for fake data; convert to a forced
      re-fetch later if a real re-trigger is wanted.
    - **Still static (low-value design chrome):** Welcome "RECENT" project list (3 sample rows → skip to dashboard);
      the 3D twin's dashboard callouts (E4 design defaults — the HUD condition is live, the in-twin pin is not).
    - Files touched (FE): `state/store.ts` (seen/lastSeen/dashBig/importJSON + setters), `stage/results.ts`
      (DashRes + dashboard branch, export mlScoreOf), `api/verify.ts` (dashboard patch, enable bsl/prs), `stage/useStage.ts`,
      `hud/ResultsPanel.tsx` (live rows/big + publish dashBig + wire Resume/Save), `hud/NumeralStrip.tsx` (read dashBig),
      `hud/TopBar.tsx` (live gauge), `hud/StageResults.tsx` (CSV/Confirm/Download), `hud/Welcome.tsx` (import),
      `stage/download.ts` (new). Backend: `compute/openseespy_engine.py` (_OPS_LOCK). typecheck + offline build green.
  - **✅ REMAINING FAKES RESOLVED (2026-10-30, turn 3) — typecheck + offline build green:**
    1. **3D twin dashboard callouts now LIVE** (were hardcoded 3.21/6,310/18.4/4.31/Minor·0.82). `bridge-twin.js`
       dashboard `_labelDefs` switched to the `V(key,fallback)` data channel; `verify.ts` dashboard patch now also
       emits a `twin` map (`DashRes.twin`) with real f₁ / Pₑ-per-girder (`Pe_kN/pre.n`) / δ (baseline fingerprint
       `delta_max`) / UPV (`upv_nominal`) / condition+conf; `twinData.ts` returns `r.twin` for the dashboard.
       **VERIFIED in Chrome:** loading the 30 m template, the twin showed "Condition Deteriorated 0.65 / Pₑ per
       girder 2,722 / Mid-span δ 28.6 / Baseline f₁ 2.92" — all live, matching the HUD.
    2. **Welcome "RECENT" → "TEMPLATES"** (were fake "edited 4 min ago" rows that just skipped). Now 3 real starting
       templates (`loadTemplate(name, span)` → sets `wz.name/span` + `createProject()`). **VERIFIED:** clicking Kosi
       (30 m) entered the studio with span 30 everywhere.
    3. **Sidebar project name** was hardcoded "NH-16 Mahananda Bridge" in `StageRail.tsx` → now reads `wz.name`.
    4. **Reactive-stage action buttons now genuinely re-fire the backend** (were cosmetic job bars only). New store
       `recompute: Record<string,number>` + `bump(key)`; the nonce is in the `anl`/`bsl`/`mlp` useBackend deps in
       `verify.ts`; "Run full FE analysis" → `bump('ana')`, "Establish baseline" → `bump('base')`, "Retrain" →
       `bump('ml')` (each still shows its progress bar). **⚠️ NOT yet verified in Chrome** — the browser test was
       interrupted by a page reload before I confirmed the `/analysis/run` re-fire. Logic is simple (nonce in deps →
       useBackend effect re-runs) and typecheck+build pass; **re-verify this one in-browser next session** (go to
       Analysis, clear network, click "Run full FE analysis", expect a fresh `POST /api/analysis/run`).
    - Files touched (FE): `canvas/bridge-twin.js`, `api/verify.ts`, `stage/results.ts`, `stage/twinData.ts`,
      `stage/inputs.ts`, `stage/useStage.ts`, `state/store.ts`, `hud/Welcome.tsx`, `hud/StageRail.tsx`.
    - **Remaining known-static (acceptable):** the New-project form defaults; nothing else fake found in the HUD.
  - **HOW TO RUN (both servers) for next session:** backend `cd /Users/apple/big_prob && source .venv/bin/activate &&
    cd backend && PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8077`; frontend `cd frontend && npm run
    dev:web` (browser, port 5199) or `npm run dev` (Electron). pytest: `cd backend && PYTHONPATH=. pytest -q` → 9 passed.
    - **Note for Synthetic/ML:** those stages call `acceleration_response` via `synthetic.py`; the engine signal-
      shape fix (pseudo-accel) changed feature distributions — fine (not yet wired), but re-check feature plots once
      wired. The `ei_factor` arg is the damage knob there (stiffness reduction); Ec-consistency is a separate factor.
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
