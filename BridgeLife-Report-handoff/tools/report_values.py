"""Regenerate EVERY number the Integrated Report needs, in one command.

The report (`src/BridgeLife Report.dc.html`) is a static document: its numbers are baked
in. When the input changes you must re-run the backend and copy the new values back. This
script does the "re-run the backend" half -- it computes the whole report (core physics +
field-survey layer) from the validated compute core and prints it grouped by report page,
so updating the HTML is copy-the-number, not re-derive-it.

It reproduces the canonical report run: default `SectionConfig()` (33 m PSC I-girder),
OpenSeesPy grillage, mass "incl" SIDL, seed 42, the S-07 field scenario. Change CFG below
(or the per-stage requests) to regenerate for a different bridge, then update:
  1. the inline page text,
  2. the `renderVals()` block at the bottom of the .dc.html (tables/heatmap/matrix/timeline),
  3. the hand-authored chart SVGs (loss waterfall + FFT -- see REPORT_EXPLAINED.md §6).

Run (from backend/, ~2-3 min -- trains two 600-record grillage datasets):
  cd backend && PYTHONPATH=. ../.venv/bin/python ../BridgeLife-Report-handoff/tools/report_values.py

Cross-check the printed values against REPORT_EXPLAINED.md §5. If any differ, the script is
the source of truth (it is deterministic) -- update the report to match it.
"""
from __future__ import annotations

import json
import math

from app.models.schemas import (AnalysisRequest, BaselineRequest, FeaturesRequest,
                                 MLPipelineRequest, PrestressRequest, SectionConfig)
from app.routers import stages

import field_layer  # same directory (tools/)

CFG = SectionConfig()            # <-- the input. Edit span/girders/etc. to regenerate.
ENGINE = "openseespy"            # grillage (realistic closely-spaced modes); report default
ML_SPLIT = 0.75                  # 25% test -> 150 of 600 records, matches the page-7 confusion
EI_FACTOR_MON = 0.84             # page-6 monitoring: direct EI->0.84 serviceability worst case
                                 # (distinct from the field_layer S-07 mechanism scenario; see note)


def _r(x, n=2):
    return round(float(x), n)


def main() -> None:
    cfg = CFG
    out: dict = {}

    # ---- Page 3: Configuration & geometry ---------------------------------
    g = stages.section_properties(cfg)
    out["geometry"] = {
        "span_m": cfg.span / 1000.0, "n_girders": cfg.n_girders,
        "girder_spacing_mm": cfg.girder_spacing, "deck_thickness_mm": cfg.deck_thickness,
        "A_m2": _r(g.A / 1e6, 3), "I_m4": _r(g.I / 1e12, 3),
        "y_bot_mm": _r(g.y_bot, 0), "y_top_mm": _r(g.y_top, 0),
        "Z_bot_mm3": f"{g.Z_bot:.3e}", "Z_top_mm3": f"{g.Z_top:.3e}",
        "girder_depth_mm": _r(g.girder_depth, 0), "overall_depth_mm": _r(g.depth, 0),
        "span_depth_ratio": _r(g.span_depth_ratio, 1),
        "self_weight_kN_m": _r(g.self_weight_kN_m, 1),
        "warnings": g.warnings,
    }

    # ---- Page 3: Structural analysis --------------------------------------
    a = stages.run_analysis(AnalysisRequest(section=cfg))
    out["analysis"] = {
        "dead_load_kN_m": a.dead_load_kN_m, "sidl_kN_m": a.sidl_kN_m,
        "live_udl_kN_m": a.live_load_udl_kN_m, "impact_factor": a.impact_factor,
        "M_dead_kNm": a.moment_dead_kNm, "M_live_kNm": a.moment_live_kNm,
        "M_max_kNm": a.moment_mid_kNm, "V_max_kN": a.shear_end_kN,
        "sigma_bot_bending_MPa": a.sigma_bot, "sigma_top_bending_MPa": a.sigma_top,
        "delta_live_mm": a.deflection_mm, "delta_limit_mm": a.deflection_limit_mm,
        "delta_ratio": _r(a.deflection_mm / a.deflection_limit_mm, 2),
    }

    # ---- Page 4: Prestress ------------------------------------------------
    # The report's page-3/4 "σ_bot service +5.4 MPa" is the COMBINED (prestress + bending)
    # bottom-fibre service stress, not the analysis bending-only σ_bot above.
    p = stages.prestress(PrestressRequest(section=cfg))
    out["prestress"] = {
        "Ap_mm2": p.Ap_mm2, "P0_kN": p.P0_kN, "Pe_kN": p.Pe_kN,
        "pe_over_p0": _r(p.Pe_kN / p.P0_kN, 3), "loss_percent": p.loss_percent,
        "losses_kN": {k: _r(v * p.Ap_mm2 / 1000.0, 0) for k, v in p.losses.items()},
        "losses_MPa": p.losses, "camber_mm": p.camber_mm,
        "sigma_bot_service_MPa": p.sigma_bot_service,
        "sigma_bot_transfer_MPa": p.sigma_bot_transfer,
    }

    # ---- Page 4: Healthy baseline (grillage, incl SIDL mass) --------------
    b = stages.baseline(BaselineRequest(section=cfg, engine=ENGINE, mass_mode="incl", zeta=2.0))
    modes = [_r(f, 2) for f in b.modal.frequencies]
    out["baseline"] = {
        "engine": b.modal.engine, "modes_hz": modes,
        "mass_per_girder_kg_m": b.mass_per_girder_kg_m,
        "EI_composite_GNm2": b.EI_composite_GNm2, "damping_percent": b.damping_percent,
    }

    # ---- Field-survey layer (scenario + ML + UPV + inspection + plan) -----
    fl = field_layer.generate(cfg)
    scn = fl["scenario"]
    out["scenario_S07"] = scn

    # ---- Page 6: Monitoring / FFT peaks -----------------------------------
    # Page 6 uses a DIRECT EI->0.84 serviceability worst case (the report's "S-07" on this
    # page). Grillage modes ∝ √EI, so the damaged triplet = baseline × √0.84; δ ∝ 1/EI.
    # NOTE: this is a different parameterization from the field_layer S-07 mechanism
    # scenario (Cracking+Prestress-loss, sev 28% -> Δf1 ≈ -6.7%) that drives the ML/field
    # layer below. They are both labelled "S-07" in the report but do not numerically agree
    # (-8.3% vs -6.7%). See report_values output / REPORT_EXPLAINED §6 and reconcile if desired.
    r_mon = math.sqrt(EI_FACTOR_MON)
    out["monitoring"] = {
        "ei_factor": EI_FACTOR_MON,
        "df1_percent": _r((r_mon - 1.0) * 100.0, 1),
        "f1_baseline_hz": modes[0], "f1_scenario_hz": _r(modes[0] * r_mon, 2),
        "delta_baseline_mm": scn["delta_baseline"],
        "delta_scenario_mm": _r(scn["delta_baseline"] / EI_FACTOR_MON, 1),
        "fft_peaks_baseline_hz": modes,
        "fft_peaks_scenario_hz": [_r(m * r_mon, 2) for m in modes],
        "field_scenario_df1_percent": scn["df_pct"],   # the mechanism S-07 (for comparison)
    }

    # ---- Page 6: Features -------------------------------------------------
    f = stages.features_matrix(FeaturesRequest(section=cfg, engine=ENGINE))
    imp = dict(sorted(f["importance"].items(), key=lambda kv: -kv[1]))
    order = f["feature_order"]
    corr = f["correlation"]
    def _corr(a, b):
        return corr[order.index(a)][order.index(b)] if a in order and b in order else None
    out["features"] = {
        "n_records": f["n"], "importance_sorted": imp,
        "strongest_pair": f["strongest"],
        "corr_f1_delta": _corr("f1", "delta_max"),   # page-6 cites this pair (~ -0.93)
    }

    # ---- Page 7: AI/ML + field prediction ---------------------------------
    # One pipeline call gives BOTH the confusion matrix (150 test of 600) and the field
    # prediction for the S-07 feature vector -- self-consistent, matches the report page.
    mlp = stages.ml_pipeline(MLPipelineRequest(
        section=cfg, engine=ENGINE, model="Random Forest", split=ML_SPLIT,
        df_pct=scn["df_pct"], delta_mm=scn["delta_scenario"], upv=scn["upv_member"],
        n_per_condition=150))
    out["ml"] = {
        "accuracy_percent": _r(mlp["accuracy"] * 100.0, 1),
        "n_train": mlp["n_train"], "n_test": mlp["n_test"],
        "classes_sklearn_order": [str(c) for c in mlp["classes"]],
        "confusion_sklearn_order": [[int(v) for v in row] for row in mlp["confusion"]],
        "field_prediction": str(mlp["prediction"]), "field_confidence": _r(mlp["confidence"], 2),
        "field_probabilities": {str(k): _r(v, 2) for k, v in mlp.get("probabilities", {}).items()},
        "health_score": fl["ml"]["health_score"],
    }

    # ---- Pages 2/5/7: field-survey layer (UPV grid, inspection, plan) -----
    out["field_layer"] = {
        "upv_grid": fl["upv_grid"], "inspection": fl["inspection"],
        "maintenance": fl["maintenance"],
    }

    _print_report(out)
    print("\n\n===== MACHINE-READABLE (full JSON) =====\n")
    print(json.dumps(out, indent=2, default=float))


def _print_report(o: dict) -> None:
    G, A, P, B = o["geometry"], o["analysis"], o["prestress"], o["baseline"]
    S, M, F, ML = o["scenario_S07"], o["monitoring"], o["features"], o["ml"]
    UPV = o["field_layer"]["upv_grid"]
    print("=" * 70)
    print(f"  BridgeLife Integrated Report — regenerated values  (engine: {B['engine']})")
    print(f"  Input: span {G['span_m']} m · {G['n_girders']} girders @ {G['girder_spacing_mm']} mm")
    print("=" * 70)
    if G["warnings"]:
        print("  ! section warnings:", "; ".join(G["warnings"]))

    print("\n-- Page 3: Configuration & Analysis -------------------------------")
    print(f"  A = {G['A_m2']} m²   I = {G['I_m4']} m⁴   depth {G['overall_depth_mm']:.0f} mm "
          f"(girder {G['girder_depth_mm']:.0f} + deck {G['deck_thickness_mm']:.0f})   L/d = {G['span_depth_ratio']}")
    print(f"  self-weight {G['self_weight_kN_m']} kN/m · SIDL {A['sidl_kN_m']} · live {A['live_udl_kN_m']} kN/m")
    print(f"  M_dead {A['M_dead_kNm']} + M_live {A['M_live_kNm']} = M_max {A['M_max_kNm']} kN·m   V_max {A['V_max_kN']} kN")
    print(f"  σ_bot service {P['sigma_bot_service_MPa']} MPa (prestress+bending; +ve = compression) · "
          f"δ live {A['delta_live_mm']} mm vs L/800 {A['delta_limit_mm']} mm (ratio {A['delta_ratio']})")

    print("\n-- Page 4: Prestress & Baseline -----------------------------------")
    print(f"  A_p {P['Ap_mm2']} mm² · P0 {P['P0_kN']} → Pe {P['Pe_kN']} kN "
          f"(Pe/P0 {P['pe_over_p0']}, loss {P['loss_percent']} %) · camber {P['camber_mm']} mm")
    print(f"  losses kN: " + " · ".join(f"{k} {v:.0f}" for k, v in P['losses_kN'].items()))
    print(f"  baseline modes {B['modes_hz']} Hz · mass {B['mass_per_girder_kg_m']} kg/m · "
          f"EI {B['EI_composite_GNm2']} GN·m² · ζ {B['damping_percent']} %")

    print("\n-- Page 6: Monitoring / S-07 scenario -----------------------------")
    print(f"  page-6 worst case: EI→{M['ei_factor']}×  →  f1 {M['f1_baseline_hz']} → {M['f1_scenario_hz']} Hz "
          f"(Δf1 {M['df1_percent']} %) · δ {M['delta_baseline_mm']} → {M['delta_scenario_mm']} mm")
    print(f"  FFT peaks baseline {M['fft_peaks_baseline_hz']} · scenario {M['fft_peaks_scenario_hz']} Hz")
    print(f"  (field S-07 mechanism scenario {S['mechanisms']} sev {S['severity_pct']}% gives "
          f"Δf1 {M['field_scenario_df1_percent']} % — differs from the -8.3% page-6 worst case)")

    print("\n-- Page 6: Features -----------------------------------------------")
    print(f"  {F['n_records']} records · importance (desc): " +
          ", ".join(f"{k} {v:.3f}" for k, v in F['importance_sorted'].items()))
    sp = F["strongest_pair"]
    print(f"  strongest |r|: {sp['a']} ↔ {sp['b']} = {sp['r']} · corr(f1,δ_max) = {F['corr_f1_delta']}")

    print("\n-- Page 7: AI/ML & field prediction -------------------------------")
    print(f"  accuracy {ML['accuracy_percent']} % · {ML['n_train']} train / {ML['n_test']} test")
    print(f"  confusion (sklearn order {ML['classes_sklearn_order']}): {ML['confusion_sklearn_order']}")
    print(f"  field prediction: {ML['field_prediction']} p {ML['field_confidence']} "
          f"{ML['field_probabilities']} → health {ML['health_score']}")

    print("\n-- Pages 5: NDT / UPV grid ----------------------------------------")
    print(f"  UPV mean {UPV['mean']} · min {UPV['min']} km/s · {UPV['n_doubtful_word']} Doubtful cells")
    insp = o["field_layer"]["inspection"]
    print(f"  inspection: {insp['n_components']} components · {insp['n_observations']} observations · "
          f"{insp['photos']} photos · defects {insp['defects']}")


if __name__ == "__main__":
    main()
