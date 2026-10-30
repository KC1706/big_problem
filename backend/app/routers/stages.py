"""All stage routers for the BridgeLife Studio backend.

One APIRouter per lifecycle stage, each wrapping the validated compute core.
Kept in a single module for the MVP; split per-file later if it grows.
"""
from __future__ import annotations

import numpy as np
from fastapi import APIRouter

from ..compute import ndt as ndt_mod
from ..compute.engine import make_engine
from ..compute.features import dominant_frequencies, signal_features, spectrum
from ..compute.geometry import girder_properties
from ..compute.mesh import build_mesh
from ..compute.loads import (SIDL, dead_load_moment_shear, live_load,
                             superimposed_udl)
from ..compute.ml import (FEATURE_MEANING, predict_condition,
                          train_anomaly_detector, train_classifier)
from ..compute.prestress import (TendonProfile, compute_prestress,
                                 stage_stresses)
from ..compute.synthetic import (SyntheticConfig, baseline_fingerprint,
                                 generate_dataset, scenario_preview)
from ..models.schemas import (AnalysisRequest, AnalysisResponse,
                              BaselineRequest, BaselineResponse,
                              FeaturesRequest, GeometryMeshResponse,
                              MLPipelineRequest, MLPredictRequest,
                              MLTrainRequest, ModalResponse,
                              NDTRequest, PrestressRequest, PrestressResponse,
                              SectionConfig, SectionProperties, SignalRequest,
                              SignalResponse, SyntheticRequest)
from .common import build_section

router = APIRouter()


# ---- 2. Configuration ------------------------------------------------------
@router.post("/config/properties", response_model=SectionProperties, tags=["config"])
def section_properties(cfg: SectionConfig):
    sec = build_section(cfg)
    cp = sec.composite_properties()
    gd = sec.girder.depth
    ratio = sec.span / gd
    warnings = []
    if not (18.0 <= ratio <= 22.0):
        warnings.append(f"Span/depth ratio {ratio:.1f} outside typical 18-22 for SS PSC girders.")
    if sec.girder.tw < 200.0:
        warnings.append("Web thickness < 200 mm; check against duct dia + cover.")
    return SectionProperties(
        A=cp.A, I=cp.I, y_bot=cp.y_bot, y_top=cp.y_top, Z_bot=cp.Z_bot,
        Z_top=cp.Z_top, depth=cp.depth, girder_depth=gd, span_depth_ratio=ratio,
        self_weight_kN_m=sec.self_weight_per_m(), mass_kg_m=sec.mass_per_m(),
        effective_width=sec.effective_width(), warnings=warnings,
    )


# ---- Geometry mesh (for the 3D frontend) -----------------------------------
def _mesh_for(cfg: SectionConfig) -> GeometryMeshResponse:
    sec = build_section(cfg)
    eng = make_engine(sec)
    # sample the modal shapes on the same stations used as beam nodes
    m = eng.modal(n_modes=3, n_stations=41)
    mesh = build_mesh(sec, m)
    return GeometryMeshResponse(engine=eng.name, **mesh)


@router.get("/geometry/mesh", response_model=GeometryMeshResponse, tags=["geometry"])
def geometry_mesh_default():
    """Display mesh + modal vectors for the default 33 m section (M0 grey-box)."""
    return _mesh_for(SectionConfig())


@router.post("/geometry/mesh", response_model=GeometryMeshResponse, tags=["geometry"])
def geometry_mesh(cfg: SectionConfig):
    """Display mesh + modal vectors for a tuned section (Foundry live re-extrude)."""
    return _mesh_for(cfg)


# ---- 3. Structural Analysis ------------------------------------------------
@router.post("/analysis/run", response_model=AnalysisResponse, tags=["analysis"])
def run_analysis(req: AnalysisRequest):
    sec = build_section(req.section)
    cp = sec.composite_properties()
    L = req.section.span / 1000.0
    dl = sec.self_weight_per_m()
    sidl = superimposed_udl(
        SIDL(crash_barrier_kN_m=req.barrier_kN_m, footpath_LL_kN_m2=req.footpath_kN_m2),
        req.section.carriageway_width, req.section.n_girders,
    )
    df = 0.32 if req.distribution == "Courbon" else 0.27
    ll = live_load(req.live_load, L, req.section.n_girders, dist_factor=df)
    dead = dead_load_moment_shear(dl + sidl, L)
    M_dead = dead["moment_mid_kNm"]
    M_live = ll.moment_mid_kNm
    M_total = M_dead + M_live
    V_total = dead["shear_end_kN"] + ll.shear_end_kN
    eng = make_engine(sec)
    # live-load-only deflection (matches the "δ live ≤ L/800" serviceability check)
    defl_live = eng.midspan_deflection(w_udl_kN_m=ll.udl_kN_m, ei_factor=req.ei_factor)
    s_top = M_total * 1e6 / cp.Z_top
    s_bot = M_total * 1e6 / cp.Z_bot
    return AnalysisResponse(
        dead_load_kN_m=round(dl, 2), sidl_kN_m=round(sidl, 2),
        live_load_udl_kN_m=round(ll.udl_kN_m, 2), impact_factor=round(ll.impact_factor, 3),
        moment_mid_kNm=round(M_total, 1), moment_dead_kNm=round(M_dead, 1),
        moment_live_kNm=round(M_live, 1), shear_end_kN=round(V_total, 1),
        sigma_top=round(s_top, 2), sigma_bot=round(s_bot, 2),
        deflection_mm=round(defl_live, 2), deflection_limit_mm=round(L * 1000.0 / 800.0, 1),
    )


# ---- 4. Prestress ----------------------------------------------------------
@router.post("/prestress/compute", response_model=PrestressResponse, tags=["prestress"])
def prestress(req: PrestressRequest):
    sec = build_section(req.section)
    cp = sec.composite_properties()
    profile = TendonProfile(
        n_cables=req.n_cables, strands_per_cable=req.strands_per_cable,
        duct_dia=req.duct_dia, e_mid=req.e_mid, span=req.section.span,
    )
    res = compute_prestress(
        profile, sec.materials, mu=req.mu, K=req.K, anchorage_slip=req.anchorage_slip,
        section_A=cp.A, section_I=cp.I, jack_fraction=req.jack_fraction,
    )
    # --- camber: prestress hog (parabolic drape) minus self-weight sag (SI: N, mm, MPa) ---
    L = req.section.span                         # mm
    E = sec.materials.concrete.Ecm               # MPa = N/mm^2
    I = cp.I                                      # mm^4
    e = req.e_mid                                 # mm, eccentricity at mid-span
    L_m = L / 1000.0
    w_sw = sec.self_weight_per_m()               # kN/m  (== N/mm numerically)
    camber_up = 5.0 * (res.Pe * 1000.0) * e * L * L / (48.0 * E * I)   # mm, parabolic tendon
    sw_sag = 5.0 * w_sw * L ** 4 / (384.0 * E * I)                     # mm
    camber_mm = camber_up - sw_sag
    # --- extreme-fibre bottom stress at transfer (Pi + self-weight) and service (Pe + full) ---
    sigma_transfer = res.sigma_p0 - res.losses.immediate
    Pi_kN = sigma_transfer * res.Ap / 1000.0
    M_sw = dead_load_moment_shear(w_sw, L_m)["moment_mid_kNm"]
    sidl = superimposed_udl(SIDL(), req.section.carriageway_width, req.section.n_girders)
    M_dead = dead_load_moment_shear(w_sw + sidl, L_m)["moment_mid_kNm"]
    M_live = live_load("70R", L_m, req.section.n_girders, dist_factor=0.32).moment_mid_kNm
    M_service = M_dead + M_live
    s_transfer = stage_stresses(Pi_kN, e, cp.A, cp.Z_top, cp.Z_bot, M_sw)
    s_service = stage_stresses(res.Pe, e, cp.A, cp.Z_top, cp.Z_bot, M_service)
    return PrestressResponse(
        P0_kN=round(res.P0, 1), Pe_kN=round(res.Pe, 1),
        sigma_p0=round(res.sigma_p0, 1), sigma_pe=round(res.sigma_pe, 1),
        loss_percent=round(res.loss_percent, 2), pe_lt_p0=res.check_pe_lt_p0(),
        losses={k: round(v, 2) for k, v in res.losses.as_dict().items()},
        Ap_mm2=round(res.Ap, 1),
        camber_mm=round(camber_mm, 1),
        sigma_bot_transfer=round(s_transfer["sigma_bot"], 2),
        sigma_bot_service=round(s_service["sigma_bot"], 2),
    )


# ---- 5. Healthy Baseline ---------------------------------------------------
@router.post("/baseline/establish", response_model=BaselineResponse, tags=["baseline"])
def baseline(req: BaselineRequest):
    sec = build_section(req.section)
    eng = make_engine(sec, kind=req.engine, damping_ratio=req.zeta / 100.0)
    # Ec override -> stiffness factor relative to the section's default modulus.
    ec_default_gpa = sec.materials.concrete.Ecm / 1000.0  # MPa -> GPa
    ei_factor = (req.ec_gpa / ec_default_gpa) if req.ec_gpa else 1.0
    # mass mode: include superimposed dead-load mass or structure only.
    struct_mass = sec.mass_per_m()  # kg/m per girder (structural)
    sidl_kN_m = superimposed_udl(SIDL(), req.section.carriageway_width, req.section.n_girders)
    sidl_mass = sidl_kN_m * 1000.0 / 9.81
    mass_factor = (struct_mass + sidl_mass) / struct_mass if req.mass_mode == "incl" else 1.0
    m = eng.modal(n_modes=3, ei_factor=ei_factor, mass_factor=mass_factor)
    fp = baseline_fingerprint(sec, engine=req.engine)
    return BaselineResponse(
        fingerprint=fp,
        modal=ModalResponse(
            frequencies=[round(f, 4) for f in m.frequencies],
            mode_shape_x=m.mode_shape_x, mode_shapes=m.mode_shapes, engine=eng.name,
        ),
        mass_per_girder_kg_m=round(struct_mass * mass_factor, 1),
        EI_composite_GNm2=round(eng.EI0 * ei_factor / 1e9, 2),
        damping_percent=req.zeta,
    )


# ---- 8. Monitoring / vibration signal --------------------------------------
@router.post("/monitoring/signal", response_model=SignalResponse, tags=["monitoring"])
def monitoring_signal(req: SignalRequest):
    sec = build_section(req.section)
    eng = make_engine(sec, kind=req.engine, damping_ratio=req.zeta / 100.0)
    # Match the Baseline stage's structural assumptions so the measured spectrum
    # resonates at the same modal frequencies as the baseline fingerprint.
    ec_default_gpa = sec.materials.concrete.Ecm / 1000.0
    ei_ec = (req.ec_gpa / ec_default_gpa) if req.ec_gpa else 1.0
    struct_mass = sec.mass_per_m()
    sidl_kN_m = superimposed_udl(SIDL(), req.section.carriageway_width, req.section.n_girders)
    sidl_mass = sidl_kN_m * 1000.0 / 9.81
    mass_factor = (struct_mass + sidl_mass) / struct_mass if req.mass_mode == "incl" else 1.0
    L = req.section.span / 1000.0
    resp = eng.acceleration_response(
        duration=req.duration, fs=req.fs, sensor_x=req.sensor_x_frac * L,
        ei_factor=ei_ec * req.ei_factor, mass_factor=mass_factor, noise_frac=req.noise_frac,
        excitation=req.excitation, seed=req.seed,
    )
    a = np.asarray(resp.a)
    spec = spectrum(a, req.fs)
    # decimate time series for transport if very long
    step = max(1, len(resp.t) // 4000)
    return SignalResponse(
        t=resp.t[::step], a=resp.a[::step], sensor_x=resp.sensor_x,
        spectrum_freq=spec["freq"], spectrum_mag=spec["mag"],
        dominant_frequencies=dominant_frequencies(a, req.fs),
        features=signal_features(a, req.fs),
    )


# ---- 6/7. NDT --------------------------------------------------------------
@router.post("/ndt/assess", tags=["ndt"])
def ndt_assess(req: NDTRequest):
    out = []
    for r in req.readings:
        reading = ndt_mod.NDTReading(location=r.location, upv=r.upv, rebound=r.rebound)
        d = reading.assess()
        d["condition"] = ndt_mod.condition_from_ndt(r.upv, r.rebound)
        out.append(d)
    return {"readings": out, "bands": {
        "upv": [list(b) for b in ndt_mod.UPV_BANDS],
        "rebound": [list(b) for b in ndt_mod.REBOUND_BANDS]}}


# ---- 9. Synthetic data -----------------------------------------------------
@router.post("/synthetic/generate", tags=["synthetic"])
def synthetic(req: SyntheticRequest):
    sec = build_section(req.section)
    if req.preview_only:
        # fast, live: scenario physics + per-class values + a small labelled sample
        return scenario_preview(
            sec, req.mechanisms, req.location, req.extent_m, req.severity_pct,
            service_udl_kN_m=req.service_udl_kN_m, noise_frac=req.noise_frac, seed=req.seed,
            engine=req.engine,
        )
    cfg = SyntheticConfig(
        n_per_condition=req.n_per_condition, duration=req.duration, fs=req.fs,
        service_udl_kN_m=req.service_udl_kN_m, noise_frac=req.noise_frac, seed=req.seed,
        engine=req.engine,
    )
    ds = generate_dataset(sec, cfg)
    # per-condition summary for the comparison plots
    import collections
    by = collections.defaultdict(list)
    for row, lab in zip(ds["rows"], ds["labels"]):
        by[lab].append(row)
    summary = {}
    for c in ds["conditions"]:
        rows = by[c]
        summary[c] = {
            "f1": float(np.mean([r["f1"] for r in rows])),
            "delta_max": float(np.mean([r["delta_max"] for r in rows])),
            "upv": float(np.mean([r["upv"] for r in rows])),
            "n": len(rows),
        }
    return {"rows": ds["rows"], "labels": ds["labels"],
            "feature_order": ds["feature_order"], "conditions": ds["conditions"],
            "summary": summary}


# ---- 9b. Feature engineering (correlation / distributions / importance) ------
@router.post("/features/matrix", tags=["features"])
def features_matrix(req: FeaturesRequest):
    sec = build_section(req.section)
    ds = generate_dataset(sec, SyntheticConfig(
        n_per_condition=req.n_per_condition, duration=req.duration, fs=req.fs,
        noise_frac=req.noise_frac, seed=req.seed, engine=req.engine,
    ))
    order = ds["feature_order"]
    rows, labels, conds = ds["rows"], ds["labels"], ds["conditions"]
    X = np.array([[r[f] for f in order] for r in rows], dtype=float)  # (N, 10)
    corr = np.corrcoef(X.T)
    corr = np.nan_to_num(corr, nan=0.0)
    # per-feature, per-condition mean/std for the distribution bands
    by_class: dict = {}
    for cond in conds:
        Xc = np.array([[r[f] for f in order] for r, lab in zip(rows, labels) if lab == cond], dtype=float)
        by_class[cond] = {
            order[k]: {"mean": float(Xc[:, k].mean()), "std": float(Xc[:, k].std())}
            for k in range(len(order))
        }
    # real feature importance (same RandomForest the ML stage uses)
    tr = train_classifier(rows, labels, order)
    importance = {k: round(float(v), 4) for k, v in tr["result"].feature_importance.items()}
    # strongest off-diagonal correlation
    bi, bj, br = 0, 1, 0.0
    for i in range(len(order)):
        for j in range(i + 1, len(order)):
            if abs(corr[i, j]) > abs(br):
                bi, bj, br = i, j, corr[i, j]
    return {
        "feature_order": order,
        "correlation": [[round(float(v), 3) for v in row] for row in corr],
        "by_class": by_class,
        "conditions": conds,
        "importance": importance,
        "strongest": {"a": order[bi], "b": order[bj], "r": round(float(br), 3)},
        "n": len(rows),
    }


# ---- 10/11. ML / AI condition assessment -----------------------------------
@router.post("/ml/train", tags=["ml"])
def ml_train(req: MLTrainRequest):
    tr = train_classifier(req.rows, req.labels, req.feature_order,
                          n_estimators=req.n_estimators)
    res = tr["result"]
    an = train_anomaly_detector(req.rows, req.labels, req.feature_order)
    return {
        "accuracy": res.accuracy, "classes": res.classes, "confusion": res.confusion,
        "feature_importance": res.feature_importance,
        "n_train": res.n_train, "n_test": res.n_test,
        "feature_meaning": {f: FEATURE_MEANING.get(f, "") for f in req.feature_order},
        "anomaly_scores": an["scores"], "anomaly_threshold": an["threshold"],
    }


@router.post("/ml/predict", tags=["ml"])
def ml_predict(req: MLPredictRequest):
    tr = train_classifier(req.rows, req.labels, req.feature_order)
    return predict_condition(tr, req.feature_vector)


@router.post("/ml/pipeline", tags=["ml"])
def ml_pipeline(req: MLPipelineRequest):
    """Generate dataset -> train the chosen model -> predict the live feature vector."""
    sec = build_section(req.section)
    ds = generate_dataset(sec, SyntheticConfig(
        n_per_condition=req.n_per_condition, duration=12.0, fs=200.0,
        noise_frac=req.noise_frac, seed=42, engine=req.engine,
    ))
    order = ds["feature_order"]
    rows, labels = ds["rows"], ds["labels"]

    # build the live feature vector from the 3 sliders + healthy-class means for the rest
    healthy = [r for r, lab in zip(rows, labels) if lab == "Healthy"]
    fvec = {f: float(np.mean([r[f] for r in healthy])) for f in order}
    eng = make_engine(sec, kind=req.engine)
    f1_0 = eng.natural_frequencies(1)[0]
    ratio = 1.0 + req.df_pct / 100.0
    fvec["f1"] = f1_0 * ratio
    fvec["f2"] = fvec["f2"] * ratio      # modal frequencies scale together (∝ √EI)
    fvec["f3"] = fvec["f3"] * ratio
    fvec["delta_max"] = req.delta_mm
    fvec["eps_max"] = req.delta_mm / req.section.span * 1.0e6 * 0.8  # same proxy as generate_dataset
    fvec["upv"] = req.upv

    if req.model == "IsoForest":
        an = train_anomaly_detector(rows, labels, order)
        scores = np.asarray(an["scores"]); thr = float(an["threshold"])
        pred_anom = scores > thr
        true_anom = np.asarray([lab != "Healthy" for lab in labels])
        tn = int(np.sum(~true_anom & ~pred_anom)); fp = int(np.sum(~true_anom & pred_anom))
        fn = int(np.sum(true_anom & ~pred_anom)); tp = int(np.sum(true_anom & pred_anom))
        total = tn + fp + fn + tp
        live = float(-an["model"].score_samples(an["scaler"].transform([[fvec[f] for f in order]]))[0])
        return {
            "model": req.model, "classes": ["Normal", "Anomaly"],
            "confusion": [[tn, fp], [fn, tp]], "accuracy": (tn + tp) / total if total else 0.0,
            "feature_importance": {}, "feature_order": order,
            "n_train": int(np.sum(~true_anom)), "n_test": total,
            "prediction": "Anomaly" if live > thr else "Normal",
            "confidence": 0.0, "anomaly_score": live, "anomaly_threshold": thr,
        }

    kind = "gb" if req.model == "XGBoost" else "rf"
    tr = train_classifier(rows, labels, order, n_estimators=req.n_estimators,
                          test_size=max(0.05, 1.0 - req.split), kind=kind)
    res = tr["result"]
    pred = predict_condition(tr, fvec)
    conf = max(pred["probabilities"].values()) if pred["probabilities"] else 0.0
    return {
        "model": req.model, "classes": res.classes, "confusion": res.confusion,
        "accuracy": res.accuracy, "feature_importance": res.feature_importance,
        "feature_order": order, "n_train": res.n_train, "n_test": res.n_test,
        "prediction": pred["prediction"], "confidence": conf,
        "probabilities": pred["probabilities"], "anomaly_score": 0.0, "anomaly_threshold": 0.0,
    }
