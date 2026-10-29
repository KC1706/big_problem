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
                                 generate_dataset)
from ..models.schemas import (AnalysisRequest, AnalysisResponse,
                              BaselineResponse, GeometryMeshResponse,
                              MLPredictRequest, MLTrainRequest, ModalResponse,
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
    sidl = superimposed_udl(SIDL(), req.section.carriageway_width, req.section.n_girders)
    ll = live_load(req.live_load, L, req.section.n_girders)
    w_total = dl + sidl + ll.udl_kN_m
    dead = dead_load_moment_shear(dl + sidl, L)
    M_total = dead["moment_mid_kNm"] + ll.moment_mid_kNm
    V_total = dead["shear_end_kN"] + ll.shear_end_kN
    eng = make_engine(sec)
    defl = eng.midspan_deflection(w_udl_kN_m=w_total, ei_factor=req.ei_factor)
    # bending stresses (service, no prestress here -- prestress handled separately)
    s_top = M_total * 1e6 / cp.Z_top
    s_bot = M_total * 1e6 / cp.Z_bot
    return AnalysisResponse(
        dead_load_kN_m=round(dl, 2), sidl_kN_m=round(sidl, 2),
        live_load_udl_kN_m=round(ll.udl_kN_m, 2), impact_factor=round(ll.impact_factor, 3),
        moment_mid_kNm=round(M_total, 1), shear_end_kN=round(V_total, 1),
        sigma_top=round(s_top, 2), sigma_bot=round(s_bot, 2),
        deflection_mm=round(defl, 2),
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
        section_A=cp.A, section_I=cp.I,
    )
    return PrestressResponse(
        P0_kN=round(res.P0, 1), Pe_kN=round(res.Pe, 1),
        sigma_p0=round(res.sigma_p0, 1), sigma_pe=round(res.sigma_pe, 1),
        loss_percent=round(res.loss_percent, 2), pe_lt_p0=res.check_pe_lt_p0(),
        losses={k: round(v, 2) for k, v in res.losses.as_dict().items()},
        Ap_mm2=round(res.Ap, 1),
    )


# ---- 5. Healthy Baseline ---------------------------------------------------
@router.post("/baseline/establish", response_model=BaselineResponse, tags=["baseline"])
def baseline(cfg: SectionConfig):
    sec = build_section(cfg)
    eng = make_engine(sec)
    m = eng.modal(n_modes=3)
    fp = baseline_fingerprint(sec)
    return BaselineResponse(
        fingerprint=fp,
        modal=ModalResponse(
            frequencies=[round(f, 4) for f in m.frequencies],
            mode_shape_x=m.mode_shape_x, mode_shapes=m.mode_shapes, engine=eng.name,
        ),
    )


# ---- 8. Monitoring / vibration signal --------------------------------------
@router.post("/monitoring/signal", response_model=SignalResponse, tags=["monitoring"])
def monitoring_signal(req: SignalRequest):
    sec = build_section(req.section)
    eng = make_engine(sec)
    L = req.section.span / 1000.0
    resp = eng.acceleration_response(
        duration=req.duration, fs=req.fs, sensor_x=req.sensor_x_frac * L,
        ei_factor=req.ei_factor, noise_frac=req.noise_frac,
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
    cfg = SyntheticConfig(
        n_per_condition=req.n_per_condition, duration=req.duration, fs=req.fs,
        service_udl_kN_m=req.service_udl_kN_m, noise_frac=req.noise_frac, seed=req.seed,
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
