# E3 — OpenSeesPy Grillage Engine · Scope

**Status: BUILT & VERIFIED (2026-10-30).** This file was the pre-build scope; the
"as-built" summary is at the top, the original plan follows for reference.

## As built
- **`app/compute/geometry.py`** — `SectionProps` gained `J` (thin-walled open-section
  St-Venant torsion `Σ b·t³/3`), `Iy` (lateral, trapezoid formula per segment), `Ip`
  (= I + Iy); computed in both `girder_properties` and `composite_properties` (composite
  adds the transformed deck strip). `CompositeSection` gained `n_girders` (set by
  `build_section` from the config).
- **`app/compute/openseespy_engine.py`** (NEW) — `OpenSeesEngine(AnalyticalEngine)`:
  builds a 3-D grillage (N girder lines × ~11 stations, 6-DOF nodes; longitudinal
  composite-girder members with A/E/G/J/Iy/Iz, transverse deck-strip members coupling
  them; nodal translational + polar-rotational mass; pin/roller simple supports), runs
  `ops.eigen('-fullGenLapack', n)`, and overrides `natural_frequencies` + `modal`.
  Inherits `midspan_deflection` and `acceleration_response` — and because the inherited
  `acceleration_response` calls `self.natural_frequencies()`, a vibration signal computed
  with this engine automatically resonates at the grillage frequencies. Eigen results are
  cached per (n_modes, ei_factor, mass_factor). `make_engine('openseespy')` now imports it
  successfully (the fallback remains for any error).
- **Validation** (`tests/test_compute.py::test_grillage_modes_are_closely_spaced`, pytest
  **9 passed**): grillage f₂/f₁ < 4 (vs the beam's exact 4.0), f₁ in 2–6 Hz, ordered,
  and f₁ drops with `ei_factor`.
- **Verified end-to-end:** `/baseline/establish` with `engine:openseespy` → 2.67/2.79/3.54
  Hz (f₂/f₁ = 1.04, `engine:"openseespy"`); `analytical` → 2.67/10.68/24.04 (1:4:9). In
  Chrome the Baseline engine toggle flips between the two live; the twin callout (E4) shows
  the real grillage mode. No console errors. Default section grillage: 3.32/3.46/4.40/7.15/
  11.50 Hz — the realistic closely-spaced triplet the design anticipated.
- **✅ RESOLVED (2026-10-30) — grillage now drives the WHOLE SHM pipeline.** The open
  decision below was answered "go with grillage, I need realistic results." Monitoring,
  Synthetic, Features and ML now use the selected engine (default `openseespy`) instead of
  the hardcoded analytical default:
  - `SyntheticConfig` gained `engine` (default `"openseespy"`); `generate_dataset`,
    `scenario_preview`, `baseline_fingerprint` take an `engine` kind and build via
    `make_engine(section, kind=…)` instead of `AnalyticalEngine(section)`.
  - Schemas: `SignalRequest`/`SyntheticRequest`/`FeaturesRequest`/`MLPipelineRequest`
    gained `engine: str = "openseespy"`. Routers thread `req.engine` through (monitoring,
    synthetic preview + dataset, features, ml/pipeline, and the baseline fingerprint).
  - Frontend `api/verify.ts`: one `engKind` (from the Baseline stage's engine toggle) now
    feeds baseline + monitoring + synthetic + features + ML, so the whole pipeline shares
    one structural model (toggle analytical↔grillage flips all of them together).
  - **Performance fix (makes this viable):** the grillage stiffness matrix scales uniformly
    with `ei_factor` and the mass matrix with `mass_factor`, so `omega(ei,mass) =
    omega(1,1)·√(ei/mass)` EXACTLY and mode shapes are invariant. `OpenSeesEngine._eigen`
    now runs OpenSees ONCE per `n_modes` (`_eigen_base`, cached) and scales analytically —
    the synthetic/features/ML stages sweep hundreds of distinct `ei_factor`s per call, which
    would otherwise be hundreds of FE solves. Verified exact (max rel err 0.0e+00) and fast
    (200-row grillage dataset ≈1.0s; ml/pipeline ≈2.8s over HTTP). pytest still 9/9.
  - Verified over HTTP: features(grillage) Healthy f₁/f₂/f₃ = 3.50/3.74/5.69 (closely-spaced
    triplet), Severe 2.92/3.11/4.81; features(analytical) 3.50/14.05/31.41 (1:4:9) — the
    engine field genuinely switches the physics across every SHM stage.
  - **Honest caveat (unchanged):** a global `ei_factor` loss scales all modes together, so
    f₁/f₂/f₃ stay correlated even on the grillage; the grillage decouples the mode *spacing*
    and *shapes* (not 1:4:9), but localized damage decoupling the modes is beyond this
    reduced model. Consistent with the existing feature-correlation honesty note.

---

### Original open decision (now resolved, kept for history)
- **Was analytical:** Monitoring/Synthetic/Features/ML used `make_engine(sec)` (analytical
  default) and were NOT switched to the grillage — doing so shifts the whole SHM feature set
  to the grillage frequencies; confirm before changing.

---

## Original scope (pre-build, for reference)

## Why this exists
The "Healthy baseline" stage offers an **engine toggle: Analytical ↔ OpenSeesPy**. Today
both produce the **same** result, because:

- `make_engine(sec, kind="openseespy")` does `from .openseespy_engine import OpenSeesEngine`
  inside a `try/except` and **falls back to analytical on any error** (engine.py).
- **`app/compute/openseespy_engine.py` does not exist** → the import always fails → the
  toggle silently uses the analytical engine.
- **OpenSeesPy itself IS installed** in the project venv
  (`.venv/.../openseespy/opensees`), so the only blocker is the missing engine file.

The analytical engine is a simply-supported Euler–Bernoulli **beam**, which gives modal
ratios **f₁:f₂:f₃ = 1:4:9** (3.32 / 13.3 / 29.8 Hz for the default section). The design
anticipates the **realistic closely-spaced triplet** (mockup 3.21 / 5.86 / 8.41 ≈ 1 : 1.8 : 2.6)
that only a **grillage / 3-D model** produces, because real multi-girder decks couple
**bending + torsion + transverse bending** — a beam cannot represent that.

## What a grillage needs that we don't have yet
`SectionProps` (geometry.py) currently has: `A, I (horizontal axis), y_bot, y_top, Z_bot,
Z_top, depth`. A 3-D/grillage model additionally needs, per member:

1. **J — torsional constant** of the composite I-section. Thin-walled open-section
   approximation `J ≈ Σ bᵢ·tᵢ³ / 3` over the flanges+web, plus the deck strip's `b·t³/3`.
   (Torsion is what splits the modes away from 1:4:9.)
2. **Iᵧ — lateral second moment** (about the vertical axis) for transverse/grillage members.
3. **Rotational (polar) mass inertia** per unit length for the lumped-mass eigen analysis.

These are new fields on `SectionProps` + new formulas in `girder_properties` /
`composite_properties`.

## Interface contract (drop-in for `make_engine`)
`OpenSeesEngine` must match `AnalyticalEngine` so every wired stage keeps working:

- **attrs:** `name` (="openseespy"), `L` (m), `EI0` (N·m²), `m0` (kg/m), `zeta`, `props`
- **methods:**
  - `natural_frequencies(n_modes=3, ei_factor=1.0, mass_factor=1.0) -> list[float]` (Hz)
  - `modal(n_modes=3, n_stations=41, ei_factor=1.0, mass_factor=1.0) -> ModalResult`
    (`frequencies`, `mode_shape_x`, `mode_shapes`)
  - `midspan_deflection(w_udl_kN_m=0, p_point_kN=0, ei_factor=1.0) -> float` (mm)
  - `acceleration_response(duration, fs, sensor_x, ei_factor, mass_factor, n_modes,
    noise_frac, excitation, seed) -> ResponseResult`

## Build plan
1. **Section properties:** add `J`, `Iy`, and rotational mass inertia to `SectionProps`
   and compute them (thin-walled J; parallel-axis Iy; polar inertia from A and section
   dimensions). Unit-test against hand calcs.
2. **Grillage model (OpenSeesPy):**
   - 5 longitudinal girder lines × ~21 nodes along the span (3-D `elasticBeamColumn`
     with `A, E, G, J, Iy, Iz`).
   - Transverse members: deck strips between girder lines at each station, plus
     cross-girders at supports (and 1/3 points if detailed). Stiffer deck strips couple
     the girders → torsion/bending interaction → closely-spaced modes.
   - Mass: `-mass` per length including **rotational inertia**, or lumped nodal masses.
   - BCs: simply supported at the 5 girder ends (pin one line, rollers elsewhere).
   - `ops.eigen(n)` → ω² → frequencies; pull mode shapes at the reference girder's nodes.
3. **ei_factor / mass_factor:** scale element E·I and mass so the damage knob and the
   baseline stage's Ec/mass-mode inputs stay consistent with analytical/monitoring.
4. **acceleration_response:** **reuse the existing modal-superposition** (engine.py), but
   feed it the grillage's **real frequencies + mode-shape weights** instead of 1:4:9.
   (Avoid a full OpenSees transient per request — too slow for the live stages.)
5. **Factory:** create the file so `make_engine("openseespy")` loads it; keep the
   transparent analytical fallback on any OpenSees exception.

## Validation (do this in isolation BEFORE wiring the UI)
- A pytest that builds the grillage for the default section and asserts:
  - f₁ in a sane range (~3–4 Hz) and **f₂/f₁ < 4** (i.e. NOT the 1:4:9 beam ratio) —
    the whole point.
  - mode 1 ≈ first bending, mode 2 ≈ first torsion (antisymmetric transverse shape).
  - Monotonic f₁ drop with `ei_factor`.
- Compare against the analytical beam to confirm the grillage genuinely decouples the modes.

## Effort / risk
- **~1 focused session.** Real work: OpenSeesPy 3-D grid assembly, eigen extraction,
  the new section properties (J especially), BC + transverse-stiffness tuning, and the
  isolation tests. Eigen analysis is fast; the risk is model-fidelity/tuning, not speed.

## Downstream decisions (flag to user)
- Baseline stage already sends `engine: 'openseespy'|'analytical'` to `/baseline/establish`;
  once the engine exists, the toggle produces real grillage modes there immediately.
- **Monitoring / Synthetic / Features / ML currently use `make_engine(sec)` (analytical
  default).** Decide whether those should also switch to the grillage when selected — if so,
  their frequencies (and the whole SHM feature set) shift to the realistic triplet. That is
  a larger, cross-stage behavioural change worth confirming before doing.
