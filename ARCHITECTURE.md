# BridgeLife Studio — Architecture & Design Rationale

> An in-depth explanation of **what** this project is, **how** it is built, and —
> more importantly — **why** it is built the way it is. Read `SESSION_HANDOFF.md`
> for the live build status; read this for the reasoning behind the structure.

---

## 1. The problem, in one paragraph

The assignment (IIT-KGP CE60258, Prof. Nirjhar Dhang) is not "design a bridge." It
takes **one real structure — a 33 m post-tensioned prestressed-concrete I-girder
bridge — through its entire life**, and bolts **AI/ML-based Structural Health
Monitoring (SHM)** onto the health-assessment part. The real intellectual question
being graded is: *can a model read a bridge's vibration signature and tell you it is
deteriorating before the damage is visible — and can you do it honestly, grounded in
real civil-engineering codes (IRC/IS) rather than invented numbers?*

So the work is a **pipeline of engineering questions**:

| # | Stage (assignment) | Question it answers |
|---|---|---|
| 1 | Configuration | What *is* the bridge? (section, materials, geometry) |
| 2 | Analysis | Does it stand up under IRC loads? (moment, shear, deflection) |
| 3 | Prestress | Does the post-tensioning work? (jacking force, losses, camber) |
| 4 | Baseline | What is its healthy vibration *fingerprint*? (modes) |
| 5 | Inspection | How do we find defects in the field? |
| 6/7 | NDT | What do non-destructive tests say about the concrete? |
| 8 | Monitoring | What do the sensors stream over time? (vibration) |
| 9 | Synthetic | We can't damage a real bridge — so *simulate* damage for training data |
| 9b | Features | Turn raw signals into meaningful numbers |
| 10/11 | AI/ML | Train a model to classify healthy vs. damaged, and how badly |
| 12/13 | Maintenance / Report | So what do we *do* about it, and write it up |

---

## 2. The solution, in one paragraph

**BridgeLife Studio** is a cross-platform (Mac/Windows) **desktop app** that turns
every assignment stage into an **explorable 3-D "digital twin"** — a live 3-D bridge
you orbit, with a polished heads-up display (HUD), where **every number on screen is
computed by a real Python engineering + AI/ML backend**, never faked. It has two
halves joined by a thin HTTP contract:

- **Backend = the truth.** Real section properties, IRC/IS load analysis, prestress
  loss calculations, a real **OpenSeesPy 3-D grillage** for the vibration modes, and
  real ML (RandomForest / GradientBoosting / IsolationForest). Honesty gates throughout.
- **Frontend = the experience.** A pixel-perfect 3-D HUD (React Three Fiber) built to
  match a Claude Design exactly, 13 stages, with the twin's 3-D callouts driven live
  by the backend.

---

## 3. Guiding design principles (the "why" behind everything)

These are the load-bearing decisions. Most of the structure falls out of them.

### 3.1 Design is non-negotiable; the backend bends to the design
The #1 priority is that the HUD is **pixel-perfect to the Claude Design** (tokens,
spacing, type, color, icons, states). When the backend's data shape doesn't fit the
design, **the backend is reshaped to serve the design** — its *interface* (endpoint
fields, formats), never its *numbers*. This is why endpoints like `/baseline/establish`
and `/analysis/run` carry design-specific fields (e.g. `camber_mm`, `70R+A`,
`deflection_limit_mm`): the panel needed them, so the API grew them.

**Why:** a beautiful twin that the examiner remembers is worth more than a generic
dashboard — but only if the engineering underneath stays honest. Hence the guardrail:
reshape contracts, never fudge values.

### 3.2 Honesty gates — no invented codes, no fake accuracy
Every engineering value must be defensible against the (paywalled) IRC/IS codes; no
clause numbers are invented anywhere. The ML deliberately **does not** report a fake
99–100% accuracy: condition classes are made to **overlap** at their boundaries and
**measurement noise** is injected, because real SHM classification is non-trivial.

**Why:** in an SHM/ML assignment, "99.9% accuracy!" is the classic tell that a student
didn't understand the problem. Honest, explained, sub-100% accuracy with an informative
confusion matrix is the single strongest signal of real competence.

### 3.3 One structural model, scaled by dimensionless factors
Deterioration is never a different model — it is the *same* model scaled by
dimensionless factors:

- `ei_factor < 1` → stiffness loss (lowers frequency, raises deflection)
- `mass_factor` → added-mass effects
- `ps_factor` → fraction of effective prestress remaining

**Why:** this keeps every stage physically consistent. The healthy baseline, the
monitored signal, and each synthetic damage case all come from one calibrated model —
so comparing them (the whole point of SHM) is meaningful.

### 3.4 Instant local preview, then backend "becomes real"
The UI never blocks on the network. Each stage shows an **instant local preview**
(ported design physics) and then, after a short debounce, a backend call **reconciles**
the headline numbers to the real IRC/IS values. The user sees the number *become real*.

**Why:** a 3-D "game" must feel immediate; engineering truth can arrive ~150 ms later
without hurting the experience.

### 3.5 Offline-capable desktop app
The shipped app runs air-gapped: three.js is vendored locally, Geist fonts are bundled,
and the Python backend runs as a spawned **sidecar** process on a free local port.

**Why:** it's a desktop deliverable, not a hosted site; it must work on an examiner's
laptop with no internet.

---

## 4. System architecture (the big picture)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ELECTRON DESKTOP APP                                                  │
│                                                                        │
│  ┌──────────────┐   IPC    ┌──────────────────────────────────────┐   │
│  │ main process │◄────────►│ renderer (React 18 + TS + zustand)    │   │
│  │ - window     │          │                                       │   │
│  │ - spawns     │          │  ┌─────────────┐  ┌────────────────┐  │   │
│  │   sidecar    │          │  │ 3-D twin    │  │ HUD (raw CSS +  │  │   │
│  │ - free port  │          │  │ React Three │  │ design tokens)  │  │   │
│  └──────┬───────┘          │  │ Fiber +     │  │ TopBar/StageRail│  │   │
│         │                  │  │ bridge-     │  │ Results/Inputs/ │  │   │
│         │ getApiBase       │  │ twin.js     │  │ Numeral strip   │  │   │
│         │                  │  └─────────────┘  └────────────────┘  │   │
│         │                  │         ▲   state (zustand store)      │   │
│         │                  │         │   api/ layer (preview→verify)│   │
│         │                  └─────────┼─────────────────────────────┘   │
│         │                            │ HTTP (localhost:<port>/api/...)  │
│  ┌──────▼─────────────────────────── ▼ ─────────────────────────────┐  │
│  │ PYTHON SIDECAR — FastAPI (uvicorn)                               │  │
│  │                                                                  │  │
│  │  routers/stages.py  ── 13 stage endpoints                        │  │
│  │  models/schemas.py  ── request/response contracts (Pydantic)     │  │
│  │  compute/           ── the real engineering + ML                 │  │
│  │     geometry · materials · engine · openseespy_engine ·          │  │
│  │     loads · prestress · ndt · synthetic · features · ml · mesh   │  │
│  └──────────────────────────────────────────────────────────────── ┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Why a sidecar instead of rewriting the physics in JS?** OpenSeesPy, NumPy, and
scikit-learn have no serious browser equivalent, and the engineering must be real. So
the Python stays authoritative; the frontend is a (gorgeous) client.

---

## 5. Backend deep dive

### 5.1 Layering
- **`compute/`** — pure engineering/ML, no web concerns. Importable and unit-tested in
  isolation.
- **`models/schemas.py`** — Pydantic request/response models = the typed contract the
  frontend codes against.
- **`routers/stages.py`** — thin HTTP layer: validate → call `compute` → shape response.
  Stages hold almost no logic; they orchestrate.

**Why:** the compute core can be tested (and trusted) without standing up a server, and
the API can be reshaped for the design without touching the physics.

### 5.2 The engine abstraction — the keystone
Everything structural goes through one interface so no other code cares which solver is
active. Two interchangeable implementations:

- **`AnalyticalEngine`** — a simply-supported Euler–Bernoulli composite *beam*.
  Closed-form: `f₁:f₂:f₃ = 1:4:9`, `φₙ(x)=sin(nπx/L)`, closed-form deflection, and a
  modal-superposition acceleration response. Zero heavy dependencies — the always-works
  fallback.
- **`OpenSeesEngine`** — a real **3-D grillage** (N longitudinal composite-girder lines
  coupled by transverse deck strips, 6-DOF nodes, simple supports), solved with
  `ops.eigen('-fullGenLapack')`. It *subclasses* `AnalyticalEngine` and overrides only
  the modal methods, inheriting deflection and acceleration response.

```
make_engine(section, kind="analytical"|"openseespy")
   └─ "openseespy": import OpenSeesEngine inside try/except → fall back to
      analytical on ANY error (missing solver, numerical failure, …)
```

**Why a grillage at all?** A single beam *mathematically forces* `1:4:9`. A real
multi-girder deck couples **bending + torsion + transverse bending**, which splits the
modes into a realistic **closely-spaced triplet** (≈ 1 : 1.06 : 1.6, not 1 : 4 : 9). A
beam physically *cannot* produce that. Modelling it correctly is the single most
sophisticated engineering choice in the project — and exactly what distinguishes it.

**Why subclass + fallback?** The grillage must be a drop-in for the beam so every wired
stage keeps working, and the app must never break if OpenSees misbehaves on a given
machine. Transparent fallback buys realism with zero fragility.

### 5.3 The grillage performance trick (the recent, important one)
Problem: the SHM stages (synthetic / features / ML) sweep **hundreds of distinct
`ei_factor` draws per call** to build a labelled dataset. A naïve grillage would run a
full FE eigen-solve for each draw → minutes per call → unusable live sliders.

Insight: in the grillage, **every** element's stiffness scales with `ei_factor` and
**every** nodal mass with `mass_factor`. So the stiffness matrix scales uniformly as
`K(ei)=ei·K(1)` and mass as `M(mass)=mass·M(1)`. For the generalized eigenproblem
`Kφ=ω²Mφ` this gives, *exactly*:

```
ω²(ei, mass) = (ei / mass_factor) · ω²(1, 1)      ⇒   f = f(1,1) · √(ei / mass_factor)
```

and the mode shapes are **unchanged** (uniform scaling doesn't move eigenvectors).

Implementation: `OpenSeesEngine._eigen_base(n_modes)` runs OpenSees **once** per
`n_modes` (cached); `_eigen(n_modes, ei, mass)` just scales the cached frequencies by
`√(ei/mass)`. Verified: reproduces a full solve bit-for-bit (`max rel err = 0.0`), and a
200-row grillage dataset drops from "minutes" to **≈ 1.0 s**.

**Why this is correct, not a shortcut:** it's exact linear algebra given uniform scaling,
not an approximation. It's *why* "grillage everywhere" is affordable.

### 5.4 The SHM / ML pipeline (`synthetic.py` → `features.py` → `ml.py`)
1. **`generate_dataset`** draws, per condition class (Healthy / Minor / Deteriorated /
   Severe), random `(ei, ps, upv, rebound)` within that class's range, runs the engine to
   get `(f₁,f₂,f₃, δ, strain)`, synthesizes a vibration signal and extracts signal
   features → a labelled row of 10 features.
2. **Deliberate realism:** class ranges **overlap** at boundaries, and **measurement
   noise** is added to `f/δ`. Without these, the model hits a fake 100% accuracy.
3. **`/features/matrix`** computes the real Pearson correlation matrix, per-class
   distributions, and RandomForest feature importances.
4. **`/ml/pipeline`** is self-contained: generate dataset → train the chosen model
   (RandomForest / GradientBoosting-as-"XGBoost" / IsolationForest) → predict a *live*
   feature vector built from the prediction sliders. A fixed dataset seed keeps the
   confusion matrix/accuracy stable while the prediction sliders move.

**Why generate synthetic data at all?** You cannot damage a real bridge to get training
labels. Simulating damage on the validated model *is* the standard SHM approach — and the
assignment rewards the reasoning, not a headline accuracy.

### 5.5 Engine selection now spans the whole pipeline
Originally only **Baseline** honored the analytical↔grillage toggle; the SHM stages
silently used the beam. That split-brain (grillage baseline vs. beam monitoring) would
make the Δf comparison meaningless. Now an `engine` field (default `openseespy`) flows
through `SignalRequest`/`SyntheticRequest`/`FeaturesRequest`/`MLPipelineRequest` and
`SyntheticConfig`, and the frontend feeds one `engKind` (from the Baseline toggle) to
baseline + monitoring + synthetic + features + ML. **One model, one set of frequencies,
whole pipeline.**

---

## 6. Frontend deep dive

### 6.1 Stack and why
- **electron-vite + React 18 + TypeScript + zustand.** Lightweight store (no Redux
  ceremony), fast HMR, typed throughout.
- **React Three Fiber** wrapping the design's **`bridge-twin.js`** (a self-contained
  Three.js web component) **verbatim** — the 3-D is reused, not reimplemented, so it is
  identical to the design by construction.
- **Raw CSS + design tokens, NOT Tailwind.** Tailwind's preflight reset and utility
  rounding fight exact pixel fidelity; raw CSS honors the tokens precisely.

### 6.2 The HUD
Ported stage-by-stage from the Claude Design source: `TopBar` (project pill, lens pill,
health gauge, theme toggle), `StageRail` (13 stages with exact status→dot/opacity),
`ResultsPanel` + `NumeralStrip`, `InputsPanel`, `StageResults` (per-stage charts as
inline SVG from computed path strings). A responsive layout switches wide ≥1280 /
mid ≥960 / narrow <960.

### 6.3 The state → physics → render loop, and the `preview → verify` pattern
This is the heart of the client:

```
inputs (store)
   │  instant
   ▼
physics.ts (ported local preview)  ──►  useStage() builds a ResultsModel  ──►  HUD + twin
   │  debounced (~150 ms)
   ▼
api/verify.ts: useBackend() → POST /api/<stage>  ──►  patch (partial ResultsModel)
   │                                                      merged over the preview
   ▼
headline numbers "become real" (IRC/IS values swap in)
```

- **`api/client.ts`** — base URL from `window.bridgeApi.getApiBase()` (the sidecar port),
  dev fallback `:8077`, paths under `/api`.
- **`api/adapter.ts`** — maps the design's section params ↔ the backend `SectionConfig`
  (solves the 5-param-vs-zone section mismatch with unit conversions).
- **`api/useBackend.ts`** — debounced, `enabled`-gated, abortable fetch.
- **`api/verify.ts`** — per-stage: a `useBackend` call + a branch that produces a patch
  merged over the local preview. *Add a stage = add a gated `useBackend` + a patch branch.*

**Why this pattern?** It cleanly separates "feels instant" (local) from "is correct"
(backend), and it keeps the UI pixel-identical whether or not the backend is up.

### 6.4 The twin data channel (E4)
The 3-D twin's callouts read real values through a `data` attribute (JSON) published by
`ResultsPanel` from the *same* verified results the HUD shows — so no extra backend
calls. Baseline modes animate from the real grillage mode shapes; prestress/analysis/
synthetic/ML callouts show real values live.

---

## 7. How the architecture maps to the assignment stages

| Stage | Endpoint | Compute module | Client-side? |
|---|---|---|---|
| Config | `/config/properties` | `geometry` | backend-verified |
| Analysis | `/analysis/run` | `loads`, `engine` | backend-verified |
| Prestress | `/prestress/compute` | `prestress` | backend-verified |
| Baseline | `/baseline/establish` | `engine`/`openseespy_engine`, `synthetic.baseline_fingerprint` | backend-verified |
| Monitoring | `/monitoring/signal` | `engine`, `features` | backend-verified |
| NDT | `/ndt/assess` | `ndt` | backend-verified |
| Synthetic | `/synthetic/generate` | `synthetic` | backend-verified |
| Features | `/features/matrix` | `synthetic`, `features`, `ml` | backend-verified |
| AI/ML | `/ml/pipeline` | `synthetic`, `ml` | backend-verified |
| Inspection / Maintenance / Report / Dashboard | — | — | client-side by design |
| 3-D geometry/modes | `/geometry/mesh` | `mesh`, `engine` | drives the twin |

Inspection, NDT logging, maintenance decision, and the report are deliberately
client-side: they are *interpretation* layers over already-computed engineering, so a
round-trip buys nothing.

---

## 8. Engineering-integrity ("honesty") summary

- **No invented IRC/IS clause numbers** anywhere in the code.
- **ML accuracy is honestly < 100%** via overlapping class ranges + measurement noise;
  the confusion matrix is informative, not a perfect diagonal.
- **Known, stated idealizations:** (a) the grillage's `acceleration_response` reuses the
  modal-superposition with analytical sin mode-shape weighting (grillage frequencies,
  beam shape weights) — accepted and documented; (b) a *global* `ei_factor` loss scales
  all modes together, so f₁/f₂/f₃ stay correlated even on the grillage — the grillage
  fixes mode *spacing/shape* (not 1:4:9), but localized-damage modal decoupling is beyond
  this reduced model. Naming these limits is itself part of the deliverable.

---

## 9. Build, run, package

```bash
# Backend
cd /Users/apple/big_prob && source .venv/bin/activate
cd backend && PYTHONPATH=. pytest -q                       # expect 9 passed
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8077   # /docs, /health

# Frontend
cd frontend && npm run dev          # Electron desktop (spawns the sidecar)
npm run dev:web                     # browser (for pixel-diff vs the design oracle)
npm run build                       # offline production bundle
npm run typecheck                   # tsc --noEmit
```

- **Sidecar:** the Electron main process spawns uvicorn on a free port and hands the base
  URL to the renderer via IPC — so packaged `.dmg`/`.exe` builds run the backend
  automatically, offline.
- **Pixel-diff oracle:** the Claude Design handoff bundle in `design_export/` is served
  over local HTTP and compared against the running app per stage.

---

## 10. Key files

| Path | Role |
|---|---|
| `backend/app/compute/engine.py` | engine interface + `AnalyticalEngine` + `make_engine` factory |
| `backend/app/compute/openseespy_engine.py` | 3-D grillage engine (+ the solve-once/scale trick) |
| `backend/app/compute/synthetic.py` | dataset generation, damage scenarios, baseline fingerprint |
| `backend/app/compute/{geometry,loads,prestress,ndt,features,ml,mesh}.py` | the rest of the physics/ML |
| `backend/app/models/schemas.py` | typed request/response contracts |
| `backend/app/routers/stages.py` | the 13 stage endpoints (thin orchestration) |
| `frontend/src/renderer/src/api/verify.ts` | the preview→verify backend bridge for every stage |
| `frontend/src/renderer/src/canvas/bridge-twin.js` | the verbatim 3-D twin web component |
| `frontend/src/renderer/src/state/store.ts` | zustand store (13 stages + geometry + slices) |
| `SESSION_HANDOFF.md` | live build status / resume doc |
| `E3_SCOPE.md` | the grillage engine as-built record |
| `FRONTEND_PLAN.md` | the pixel-perfect port plan + edge cases E1–E18 |

---

*This document explains the reasoning; the code is the source of truth. When they
disagree, fix one of them.*
