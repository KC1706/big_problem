# BridgeLife — Integrated Report, Fully Explained

_Last updated: 2026-10-31. This document explains the whole project and traces **every number and chart** in the report back to the exact backend code, formula, input and computed value — so you can defend any figure on any page._

---

## 0. Read this first — how "real" the report is

| Question | Answer |
|---|---|
| Are the numbers computed from the input? | **Yes.** Every physics figure is produced by the validated backend compute core (`backend/app/compute/`), run against the default input (`SectionConfig()` — a 33 m PSC I-girder bridge). None of the physics is typed by hand. |
| Does the report recompute when opened? | **No.** The report is a static paged HTML document (`src/BridgeLife Report.dc.html`). I ran the backend once, read the outputs, and wrote those exact values into the HTML. Change the input and the report will **not** update by itself — you re-run the backend and update the values (see §7). |
| Is anything still "dummy"? | **No fabricated results.** The field-survey layer (UPV grid, inspection conditions, defect counts, maintenance dates) is now **generated from the backend** by `tools/field_layer.py` (§6, §8). The only values that are not *computed* are the **bearing / expansion-joint / abutment visual conditions** — the backend models no bearing element, so those are genuine visual-inspection inputs (flagged `[V]`), not fabrications. |
| Verification status | Backend compute core passes **9/9** tests (`cd backend && PYTHONPATH=. pytest -q`). |

**One-line summary:** the report is a snapshot of a real backend run on the default bridge, with a clearly-marked illustrative field-inspection layer on top.

---

## 1. What the project is

**BridgeLife Studio** is a desktop application (Electron + React frontend, Python/FastAPI backend) built for an IIT-KGP civil-engineering assignment (CE60258, Prof. Nirjhar Dhang). The subject is a **33 m simply-supported post-tensioned PSC I-girder highway bridge**.

The app is a "digital twin studio": the user walks a bridge through its whole **lifecycle** — design → prestress → baseline → inspection → NDT → monitoring → feature engineering → AI/ML condition assessment → maintenance decision — as an explorable 3-D scene, while the Python backend does all the real engineering and machine learning.

- **Project root:** `/Users/apple/big_prob`
- **Backend compute core:** `backend/app/compute/` (the engineering + ML)
- **API layer:** `backend/app/routers/stages.py` (one endpoint per lifecycle stage)
- **This report package:** `BridgeLife-Report-handoff/`

### What the report is and what it's for

The **Integrated Report** (`BL-MAH-RPT-001`) is the printable deliverable of the studio: a 7-page A4 engineering assessment of the bridge (named "NH-16 Mahananda Bridge" as the worked example). It condenses the entire lifecycle run into one document an examiner or an asset owner would read — design checks, prestress losses, the healthy dynamic fingerprint, the inspection/NDT condition, the vibration-based damage detection, and the AI/ML maintenance recommendation.

**Uses:** (1) the assignment submission artefact; (2) a template for a real bridge condition report; (3) proof that the whole compute pipeline produces a coherent, code-referenced story end to end.

---

## 2. The input — exactly what is given

Every physics figure comes from running the backend with its **default configuration**, i.e. `SectionConfig()` plus each stage's default request. These defaults ARE the "inputs given." Here they are in full.

### 2.1 Geometry & materials — `SectionConfig` (`backend/app/models/schemas.py`, `compute/geometry.py`, `compute/materials.py`)

| Input | Value | Where |
|---|---|---|
| Span L | 33 000 mm (33.0 m) | `SectionConfig.span` |
| Girder spacing (c/c) | 2 500 mm | `girder_spacing` |
| Number of girders | 5 | `n_girders` |
| Carriageway width | 11.0 m | `carriageway_width` |
| Deck slab thickness | 230 mm | `deck_thickness` |
| Girder concrete | M45 (f_ck 45 MPa) | `Concrete.fck` |
| Deck concrete | M40 (f_ck 40 MPa) | `deck_concrete` |
| Prestressing steel | 15.2 mm 7-wire LR strand, f_pk 1860 MPa, E_p 195 GPa, 140 mm²/strand | `PrestressingSteel` |
| Rebar | Fe500, E_s 200 GPa | `Rebar` |

**I-girder shape** (`GirderSection`, five classic zones, mm): bottom bulb 600×250 → bottom fillet 150 high (600→200) → web 200×950 → top fillet 150 high (200→500) → top flange 500×200. **Overall girder depth = 250+150+950+150+200 = 1 700 mm.**

### 2.2 Per-stage inputs (defaults used for the report)

| Stage | Key inputs | Source |
|---|---|---|
| Analysis | Live load **IRC Class 70R**, distribution **Courbon** (factor 0.32), impact 0.25, SIDL (wearing coat 1.65 kN/m², 2 crash barriers 20 kN/m each, footpath 5 kN/m²×1.5 m) | `AnalysisRequest`, `compute/loads.py` |
| Prestress | **6 cables × 12 strands** (A_p 10 080 mm²), duct 90 mm, e_mid 650 mm, μ 0.17, K 0.002 /m, anchorage slip 6 mm, creep φ 1.6, shrinkage 2.0e-4, relaxation 2.5 % | `PrestressRequest`, `compute/prestress.py` |
| Baseline | Engine **OpenSeesPy grillage**, mass mode "incl" (adds SIDL mass), damping ζ 2 % | `BaselineRequest`, `compute/openseespy_engine.py` |
| Monitoring / S-07 | Damage scenario: localized stiffness loss, **EI → 0.84×** over ~6 m at G5 mid-span | `compute/synthetic.py scenario_stiffness_loss` |
| Synthetic | 150 records per class × 4 classes = **600 records**, service UDL 45 kN/m, seed 42 | `SyntheticRequest`, `compute/synthetic.py` |
| ML | RandomForest, 25 % test split, 300 trees | `MLTrainRequest`, `compute/ml.py` |
| NDT grading | IS 13311 Pt.1 bands | `compute/ndt.py` |

---

## 3. How a number flows from input to the page

```
SectionConfig() + stage request
        │
        ▼
backend/app/compute/*.py        ← the engineering + ML (formulas below)
        │   (called via)
        ▼
backend/app/routers/stages.py   ← one endpoint per stage, rounds/returns JSON
        │   (run once, offline, by me)
        ▼
values read and written into
src/BridgeLife Report.dc.html   ← static text + inline SVG charts
        │   (renderVals() holds the tabular/heatmap/matrix data)
        ▼
doc-page.js + support.js render 7 A4 pages in the browser
```

The report's data logic class `renderVals()` (bottom of the `.dc.html`) holds the **inspection table, UPV heatmap, confusion matrix, feature bars and maintenance timeline**. All other numbers are inline in the page markup. Charts are **hand-authored inline SVG** whose coordinates I computed to match the real values (the prestress waterfall and the FFT were regenerated programmatically — see §6).

---

## 4. The formulas (so you can explain the "how")

All from `backend/app/compute/`. SI: N, mm, MPa.

**Concrete modulus** (`materials.py`): `Ecm = 22000·((f_ck+8)/10)^0.3` → M45 ⇒ **36 074 MPa**, M40 ⇒ 34 962 MPa. Deck→girder transform ratio n = 34962/36074 = 0.969.

**Section properties** (`geometry.py`): trapezoid stack + parallel-axis theorem; composite adds the deck transformed by n over the effective width `b_eff = min(spacing, L/4) = min(2500, 8250) = 2 500 mm`.

**Natural frequency — beam** (`engine.py`): `f_n = (n²·π/2)·√(EI /(m·L⁴))` ⇒ ratio 1:4:9 for a simply-supported beam.

**Natural frequency — grillage** (`openseespy_engine.py`): a 3-D FE grillage (5 girder lines + transverse deck strips). Eigen-solve gives **closely-spaced** modes (1st bending / 1st torsion / 2nd bending) — not 1:4:9. Frequencies scale exactly as `ω² ∝ EI_factor / mass_factor`, so one FE solve is reused for every deterioration draw.

**Mid-span deflection** (`engine.py`): `δ = 5wL⁴/(384EI) + PL³/(48EI)`.

**Dead-load effects** (`loads.py`): `M = wL²/8`, `V = wL/2`.

**Live load (70R, Courbon)** (`loads.py`): total 1000 kN × distribution 0.32 × (1+0.25 impact) = 400 kN per girder ⇒ equiv UDL 400/33 = 12.12 kN/m ⇒ M = 12.12·33²/8 = 1 650 kN·m.

**Prestress losses** (`prestress.py`): friction/wobble `σ·(1−e^−(μα+Kx))`, anchorage slip `(Δ/L)·E_p` (capped), elastic shortening `0.5·n_p·f_c,tendon`, creep `φ·n_p·f_c`, shrinkage `ε_sh·E_p`, relaxation `2.5%·σ`. Loss in **MPa**; the report's **kN** waterfall = σ_loss × A_p.

**NDT grading** (`ndt.py`, IS 13311 Pt.1): UPV ≥4.5 Excellent · 3.5–4.5 Good · 3.0–3.5 Doubtful · <3.0 Poor. `condition_from_ndt()` maps UPV+rebound grades → Healthy/Minor/Deteriorated/Severe.

**Synthetic dataset** (`synthetic.py`): each condition class draws (EI, prestress, UPV, rebound) from physically-reasoned ranges, runs them through the **same** engine to get f1/f2/f3, deflection, strain, and vibration-signal features. Deliberately overlapping class ranges make the classification non-trivial.

**Features** (`features.py`): RMS, peak, kurtosis, crest factor (time); FFT dominant peaks + spectrum (frequency).

**ML** (`ml.py`): RandomForest classifier (accuracy, confusion, feature importances) + IsolationForest anomaly detector trained on healthy-only data. `mlScoreOf`/`HEALTH_BY_CLASS` (frontend `results.ts`) map the predicted class to a health score: Healthy 0.95 / **Minor 0.82** / Deteriorated 0.60 / Severe 0.35.

---

## 5. The numbers that came out (the report's values)

Produced by `SectionConfig()` through the endpoints (OpenSeesPy engine, mass "incl", seed 42):

**Geometry:** A = 1.11 m² · I = 0.476 m⁴ · y_bot 1307 mm / y_top 623 mm · Z_bot 3.64e8 / Z_top 7.65e8 mm³ · overall depth 1 930 mm (girder 1700 + deck 230) · L/d = 19.4 · self-weight 28.2 kN/m.

**Analysis:** M_dead 5 828.5 + M_live 1 650 = **M_max 7 478.5 ≈ 7 479 kN·m** · **V_max 906.5 ≈ 907 kN** · δ live **10.8 mm** vs L/800 = **41.2 mm** (ratio **0.26** ✓) · σ_bot service **+5.4 MPa** (compression, no tension).

**Prestress:** A_p 10 080 mm² · P₀ **14 249 kN** → Pₑ **9 640 kN** (Pₑ/P₀ **0.677**) · total loss **32.4 %** · losses (kN) friction 646 · anchorage 357 · elastic 690 · creep 2 208 · shrinkage 393 · relaxation 314 · camber **16 mm**.

**Baseline (grillage, incl SIDL mass):** modes **2.87 / 3.05 / 4.68 Hz** (closely spaced) · mass 4 365 kg/m · EI 17.3 GN·m² · ζ 2 %. _(Structure-only f₁ would be 3.54 Hz; the SIDL mass lowers it to 2.87.)_

**Monitoring / S-07 (EI→0.84 at G5):** f₁ 2.87 → **2.63 Hz** (**Δf₁ −8.3 %**) · δ 40.2 → **47.9 mm**.

**Dataset:** **600 records**, 4 classes × 150.

**ML:** **98.0 %** test accuracy · 450 train / 150 test · confusion (H/MI/D/S) [[38,0,0,0],[0,36,1,0],[0,0,37,1],[0,0,1,36]].

**Features:** importance UPV 0.243 > rebound 0.233 > ε_max 0.169 > δ_max 0.159 > f₁ 0.062 > f₃ 0.061 … · f₁↔δ_max correlation **−0.93**.

**Field ML prediction (scenario → classifier):** **Minor, p 0.48** (Deteriorated p 0.41 close behind) ⇒ health score **0.82**.

**NDT grid:** mean **4.23 km/s**, min **3.28 km/s**.

---

## 6. Page-by-page — every chart & datum, and its source

Legend: **[C] computed** by the backend from the input · **[D] derived** (simple arithmetic on computed values) · **[G] generated** by `tools/field_layer.py` from the backend models + the S-07 scenario (deterministic, re-runnable) · **[V] visual input** (a genuine visual-inspection rating the backend cannot compute — bearings/joints/abutments).

The field layer (pages 5 & 7) is produced by **`tools/field_layer.py`**, which imports the backend compute core, classifies the S-07 scenario with the real ML pipeline (→ **Minor, p 0.48**, health 0.82 — the same call as page 7), and derives the UPV grid, inspection conditions, defect counts and maintenance dates from that. Re-run it to regenerate.

### Page 1 — Cover
| Element | Type | Source / note |
|---|---|---|
| Span "33.0 m", "33 000" dimension | [C] | `SectionConfig.span` |
| Deflected-shape SVG (cyan dashed), G5 marker | illustration | Schematic of the damaged mid-span shape; not scaled from FE |
| CONDITION "Minor · 0.82" | [C/D] | ML field prediction class Minor → `HEALTH_BY_CLASS[Minor]`=0.82 |
| PRIORITY "High", ISSUED 31 Oct 2026, ENGINE "OpenSeesPy" | [F] / fact | Priority is an editorial call; engine is the real solver used |
| Document no., "Prepared by" | naming | Report identity (not data) |

### Page 2 — Executive summary
| Element | Type | Source |
|---|---|---|
| Verdict headline (Minor at G5, investigate in 6 months) | [D] | Narrative of the Minor prediction |
| Body: δ 10.8 mm < 41.2 mm, Pₑ/P₀ 0.68, 32.4 % loss | [C] | analysis + prestress endpoints |
| KPI "0.82 Minor" | [C/D] | predicted class → health |
| KPI "δ/L800 0.26 (10.8/41.2)" | [C] | analysis |
| KPI "Pₑ/P₀ 0.677 · 32.4 % loss" | [C] | prestress |
| KPI "Δf₁ −8.3 % (2.87→2.63 Hz)" | [C] | baseline vs damaged grillage |
| Condition ramp, marker at 82 % | [D] | health score position |
| Key finding 1 (δ within limit) | [C] | analysis |
| Key finding 3 (four UPV points Doubtful, min 3.27) | [G] | `field_layer.py` UPV grid + IS bands |
| Key finding 2, recommended actions | [G]/[V] | Inspection layer (see Page 5) |
| Key finding 4 (S-07 reproduces drop) | [C] | scenario |
| Lifecycle bar (12 stages) | illustration | Progress indicator |

### Page 3 — Configuration & Analysis
| Element | Type | Source |
|---|---|---|
| Cross-section SVG (5 girders @ 2 500, depth 1 930) | [C] | geometry; dimensions match `SectionConfig`/`GirderSection` |
| Parameter table (span, girders, M45, depth 1 700, deck 230, web 200) | [C] | `SectionConfig` + `GirderSection` |
| Analysis text (impact 1.25, SIDL 14.6, self-wt 28.2, Courbon 0.32) | [C] | `loads.py` |
| BM envelope SVG + "M_max 7 479 kN·m" | [C] | analysis `moment_mid_kNm` |
| Stats M_MAX 7 479 / V_MAX 907 / σ_bot +5.4 / δ 10.8 | [C] | analysis + prestress (σ_bot service) |
| Utilization bar "δ live / L800 = 0.26" | [C] | analysis |

### Page 4 — Prestressing & Healthy baseline
| Element | Type | Source |
|---|---|---|
| Cable-profile elevation SVG (C1–C3 shown) | illustration | Representative parabolic profile; real spec is 6×12 strands (text) |
| Prestress text (6×12 cables, A_p 10 080, e 650, μ/K/slip) | [C] | prestress inputs |
| **Loss waterfall** (P₀ 14 249 → losses → Pₑ 9 640) | [C] | `prestress` losses × A_p; bar geometry **recomputed** on a 9 000–14 500 kN axis so each step aligns to its running total |
| Caption "32.4 % loss · camber 16 mm" | [C] | prestress |
| Mode cards 2.87 / 3.05 / 4.68 Hz | [C] | baseline grillage modes |
| Reference line (UPV 4.30, rebound 38, δ 10.8) | [C]/nominal | δ from analysis; UPV/rebound are the baseline nominals in `baseline_fingerprint` |

### Page 5 — Inspection & NDT
| Element | Type | Source |
|---|---|---|
| "9 components, 20 observations, 29 photos" | [G] | `field_layer.py` (counts from the inspection layer) |
| Defect tiles (cracks 5, spalling 2, corrosion 3, other 4) | [G] | Scaled from scenario severity (`field_layer.py` `defects`) |
| Component condition table — **girder rows** (Deck, G1–G5, cross-girders) | [G] | Conditions from the ML class (G5 = Minor; G4 one step milder, etc.) |
| Component condition table — **bearing / joint / abutment rows** | [V] | Visual-inspection ratings (B5 Deteriorated) — the backend models no bearing element |
| **UPV 4×12 heatmap — cell values** | [G] | Physical localized-damage field anchored to backend UPV 4.30 + scenario location/severity (`field_layer.py` `upv_grid`); mean 4.06, min 3.27 |
| **UPV heatmap — colours & legend** | [C] | Graded by the **real IS 13311 bands** from `ndt.py` (≥4.5 / 3.5–4.5 / 3.0–3.5 / <3.0) |
| NDT text (mean 4.06, min 3.27) | [D] | Computed from the generated grid |
| SonReb strength | [C] | **Intentionally omitted** — the `sonreb_strength()` formula is explicitly uncalibrated (gives a meaningless ~8 MPa), so the report states it is deferred until core calibration rather than printing a fake MPa value |

### Page 6 — Monitoring & Features
| Element | Type | Source |
|---|---|---|
| Monitoring text (S-07, EI loss over 6 m at G5) | [C] | scenario |
| **FFT chart** (baseline dashed vs S-07 cyan, peaks 2.63/2.87, 4.29/4.68) | [C] | Both spectrum paths **regenerated programmatically** as Lorentzian peaks at the real grillage modal frequencies (baseline 2.87/3.05/4.68, damaged 2.63/2.80/4.29); x-axis 0–12 Hz, x = 30 + f·50 |
| Stats RECORDS 600 / CLASSES 4 / f₁·S-07 2.63 / δ·S-07 47.9 | [C] | synthetic + scenario |
| Features text (r = −0.93) | [C] | f₁↔δ_max correlation |
| **Feature-importance bars** | [C] | Real RandomForest importances, normalised to the top feature (UPV); values are the representative S-07 feature vector |

### Page 7 — AI/ML & Maintenance
| Element | Type | Source |
|---|---|---|
| **Confusion matrix** (150 test, diag 38/36/37/36) | [C] | `ml_train`, reordered from sklearn's [D,H,Mi,S] to display order H/MI/D/S |
| Test accuracy 98.0 % | [C] | `ml_train` |
| Field prediction "Minor p 0.48, Deteriorated p 0.41" | [C] | `ml_pipeline` on the scenario feature vector |
| AI disclaimer box | fact | Required caveat — the ML result is advisory |
| Maintenance timeline (NOV 2026 → APR 2027) | [G] | Dates = issue date + interval table keyed to the ML class (Minor ⇒ NDT +1 / bearing +2 / seal +3 / reinspect +6 months); `field_layer.py` `maintenance` |
| Signature lines | template | — |

**So the only non-computed data left is the `[V]` visual layer — bearing / expansion-joint / abutment conditions** (e.g. B5 Deteriorated). The backend has no bearing element to assess, so these are genuine visual-inspection inputs, not fabrications. Everything else on pages 5 & 7 is now generated from the backend by `tools/field_layer.py` (see §8). Note text on the girder rows is a fixed phrase keyed to the computed condition label.

---

## 7. How to regenerate the numbers (change the input → new report)

**Fastest path — one command.** `tools/report_values.py` recomputes EVERY value the report
needs (core physics + the field-survey layer) from the validated compute core and prints it
grouped by report page, plus a machine-readable JSON block:

```bash
cd backend
PYTHONPATH=. ../.venv/bin/python ../BridgeLife-Report-handoff/tools/report_values.py   # ~2-3 min
```

Edit `CFG` (and the per-stage requests) at the top of that script to change the input. It is
deterministic (seed 42), so it is the source of truth — if a printed value differs from what is
baked in the `.dc.html`, update the HTML to match it. Then follow the manual steps below to copy
the values in and regenerate the two computed charts. (`report_values.py` reuses
`field_layer.py`, so you do not need to run `field_layer.py` separately.)

The longer manual route, if you want to call the stages yourself:

1. Activate the backend venv and run the compute for your input:
   ```bash
   cd /Users/apple/big_prob/backend
   PYTHONPATH=. ../.venv/bin/python     # then call the stage functions, e.g.
   # from app.models.schemas import SectionConfig, AnalysisRequest
   # from app.routers import stages
   # stages.run_analysis(AnalysisRequest(section=SectionConfig(span=36000)))
   ```
   (Or start the API — `uvicorn app.main:app` — and POST to `/api/analysis/run`, `/api/prestress/compute`, `/api/baseline/establish`, `/api/synthetic/generate`, `/api/features/matrix`, `/api/ml/train`.)
2. Read the returned JSON and update the matching values in `src/BridgeLife Report.dc.html` (inline text + the chart SVGs + the `renderVals()` block).
3. Re-open the HTML to check; print to PDF for the final (one A4 page per sheet).

The report is **not** auto-wired to the live backend — it is a document, by design (works offline, no server needed to read it). A future enhancement could fetch the endpoints at render time.

---

## 8. The field layer is wired to the backend — `tools/field_layer.py`

The field-survey layer is now **generated**, not hand-written. Run:

```bash
cd backend
PYTHONPATH=. ../.venv/bin/python ../BridgeLife-Report-handoff/tools/field_layer.py   # ~2 min
```

It imports the backend compute core and, for the one canonical **S-07 scenario** (`[Cracking, Prestress loss]`, mid-span, 6 m, 28 % severity):

1. **Classifies it with the real ML pipeline** → `Minor, p 0.48` (Deteriorated 0.41 close behind), health 0.82 — the *same* call that produces page 7. This one class drives the whole field layer, so every page agrees.
2. **UPV grid (48 cells)** — a physical localized-damage field: UPV dips from the backend nominal 4.30 km/s to a cracked-soffit minimum at the damage location, graded by the real IS 13311 bands. Output: mean 4.06, min 3.27, four Doubtful cells (the page-2 finding and page-5 caption read these back).
3. **Inspection** — girder conditions from the ML class (G5 = Minor, G4 one step milder = Healthy, …); defect counts scaled from scenario severity (cracks 5 / spalling 2 / corrosion 3 / other 4).
4. **Maintenance** — action dates = issue date + an interval table keyed to the predicted class.

**What it does NOT compute:** bearing / expansion-joint / abutment visual conditions (`[V]`) — there is no bearing element in the grillage model, so those remain honest visual-inspection inputs. The script tags each inspection row `src: "ml"` or `src: "visual"` so the distinction is explicit.

To regenerate the report for a different scenario or input, edit the constants at the top of `field_layer.py` (and re-run the physics in §7), then copy the JSON values into `renderVals()` and the page text.

---

## 9. Honesty gates (what is deliberately NOT faked)

- Engineering values stay **IRC/IS-consistent**; no clause numbers are invented (the codes are paywalled — the code comments say so explicitly and flag every coefficient as "verify against the current code").
- The **SonReb strength** is not printed because its formula is uncalibrated.
- The **grillage modes are closely spaced** (2.87/3.05/4.68), not the textbook 1:4:9 — that is the real multi-girder result, kept even though 1:4:9 would look "cleaner".
- The **field prediction is reported as borderline** (Minor 0.48 vs Deteriorated 0.41), not rounded up to a confident-looking number.
- The **loss is 32.4 %** and **Pₑ/P₀ 0.68** — the real computed values, not the rounder placeholder figures the design mock-up originally showed.
