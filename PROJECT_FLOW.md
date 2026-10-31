# BridgeLife Studio — Project Flow

_A chronological record of how the whole project was built, end to end. Written for the assignment
submission (CE60258, IIT-KGP, Prof. Nirjhar Dhang). Last updated: 2026-10-31._

## The problem
A full **lifecycle engineering + AI/ML study** of a **33 m simply-supported post-tensioned PSC
I-girder highway bridge**: design → prestress → dynamic baseline → inspection → NDT → monitoring →
synthetic deterioration → feature engineering → AI/ML condition assessment → maintenance decision →
report. Delivered as a cross-platform desktop "digital twin studio" (Electron + React frontend,
Python/FastAPI backend) with an explorable 3-D scene, while the backend does all the real
engineering and machine learning.

## 1 — Backend compute core (built first, validated)
Python 3.12 / FastAPI. Modules under `backend/app/compute/`:
- Section geometry & transformed properties, M45/M40 materials.
- IRC **Class 70R** live load with **Courbon** transverse distribution; SIDL (wearing coat, crash
  barriers, footpath).
- Post-tensioning: friction/wobble/slip/elastic-shortening + time-dependent (creep/shrinkage/
  relaxation) losses.
- NDT grading to **IS 13311**; synthetic SHM dataset generation; feature engineering; ML classifier.

Two structural engines: an **analytical** engine (transparent 1:4:9 modes) and an **OpenSeesPy
5-girder grillage** (realistic closely-spaced modes). All physics kept IRC/IS-correct with honesty
gates — no invented clause numbers. **9/9 compute tests pass.**

## 2 — Design as source of truth (non-negotiable)
The HUD was designed separately in Claude Design and pulled **byte-exact** to disk
(`design_export/` — design tokens, Geist fonts, the self-contained Three.js `bridge-twin.js`, and a
full functional prototype). Locked rule: **the UI is pixel-perfect to the design; the backend bends
to serve it, never the reverse** — while engineering values stay code-correct (interface/data
contracts flex, numbers do not).

## 3 — Frontend build (F0 → F5), design-led
Electron + React 18 + TypeScript + zustand; raw CSS + design tokens (no Tailwind, to protect pixel
fidelity).
- **F0** — scaffold + offline Three.js (vendored `three@0.160.0`, bundled Geist woff2).
- **F1** — HUD chrome: top bar, 13-stage rail, responsive breakpoints.
- **F2** — results panel + numeral strip.
- **F3 / F4** — all 13 stages with inputs, results, and inline-SVG charts, driven first by a ported
  client-side physics *preview*.
- **F5** — wired every compute/AI stage to the real FastAPI backend with a debounced
  **preview → verify** pattern (instant local estimate, then real backend values reconcile). Along
  the way: wrote the realistic OpenSeesPy grillage and made it the default engine across the whole
  SHM pipeline; gave the 3-D twin a live data channel for its callouts; replaced every remaining
  placeholder with real backend output (dashboard aggregate, health gauge, export-to-JSON, project
  import, templates).

**Result: the full 13-stage HUD renders faithfully in both themes against the design oracle, with
real backend numbers, zero console errors.**

## 4 — The Integrated Report (deliverable)
`BL-MAH-RPT-001` — a 7-page A4 engineering report in `BridgeLife-Report-handoff/`.

The design's placeholder numbers were replaced with **real values from one backend run** on the
default bridge (OpenSeesPy grillage, seed 42):
- Pₑ/P₀ **0.677** (32.4% loss), M_max **7,479 kN·m**, V **907 kN**, δ **10.8 mm** (L/800 = 0.26).
- Baseline grillage modes **2.87 / 3.05 / 4.68 Hz** (closely-spaced; struct-only f₁ = 3.536 Hz).
- Δf₁ **−8.3%** at ei = 0.84; ML **98.0%** on 150 test / 600 records; field prediction **Minor**
  (p 0.48) → health **0.82**.

Real data **forced honesty corrections**: web 200 mm (not 300), girder depth 1700 (not 2000), deck
230 (not 240), prestress 6×12-strand cables (not 3×19T13), UPV regraded to real **IS 13311** bands,
and the uncalibrated SonReb MPa figure was dropped.

The field-survey layer (UPV grid, inspection conditions, defect counts, maintenance dates) is
**generated** by `tools/field_layer.py`, all keyed to the canonical ML class. The only non-computed
values are the bearing / expansion-joint / abutment **visual** conditions (no bearing element exists
in the grillage) — flagged `[V]`, not faked.

Every chart and number is traced to its source formula, input and value in
`BridgeLife-Report-handoff/REPORT_EXPLAINED.md`, tagged `[C]`omputed / `[D]`erived / `[G]`enerated /
`[V]`isual. The report is **static** — change the input ⇒ re-run the backend + `field_layer.py`,
then copy the new values back in.

## Verification
- Backend compute core: **9/9** tests pass (`cd backend && PYTHONPATH=. pytest -q`).
- All 7 report pages render in Chrome with **zero console errors**.
- Full HUD renders faithfully against the design oracle in light and dark themes.

## Status
**Functionally complete end to end.** The only remaining work is F6 — offline packaging
(`.dmg` / `.exe`) with uvicorn sidecar auto-start (the main-process spawn is already stubbed).

## How to run
```bash
# backend
cd /Users/apple/big_prob && source .venv/bin/activate \
  && cd backend && PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8077
# frontend
cd /Users/apple/big_prob/frontend && npm run dev:web   # or: npm run dev (Electron)
```
