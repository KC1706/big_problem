"""Synthetic inspection & monitoring data generator.

Simulates realistic changes in the measured quantities under assumed bridge
conditions by scaling physical factors on the SAME structural model
(ei_factor for stiffness loss, ps_factor for prestress loss) and drawing
correlated NDT values from the IS-band ranges. Produces a labelled dataset for
feature extraction and AI/ML condition assessment.

Condition labels: Healthy / Minor / Deteriorated / Severe. The deterioration
VALUES are not prescribed by the problem -- they are chosen on a physically
reasonable basis (stiffness loss lowers frequency and raises deflection; NDT
grades drop with deterioration) and are fully adjustable by the user.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np

from .engine import make_engine
from .features import signal_features
from .geometry import CompositeSection
from .ndt import sonreb_strength


# condition -> (ei_lo, ei_hi, ps_lo, ps_hi, upv_lo, upv_hi, rn_lo, rn_hi)
# Ranges overlap slightly at the class boundaries: condition labels are human bins
# over a continuous deterioration spectrum, so adjacent classes genuinely share
# feature space. This is what makes classification non-trivial (and the confusion
# matrix informative) rather than perfectly separable.
CONDITION_RANGES: Dict[str, Dict[str, tuple]] = {
    "Healthy":      {"ei": (0.96, 1.00), "ps": (0.95, 1.00), "upv": (4.1, 4.5), "rn": (35, 40)},
    "Minor":        {"ei": (0.90, 0.97), "ps": (0.88, 0.96), "upv": (3.7, 4.25), "rn": (29, 36)},
    "Deteriorated": {"ei": (0.78, 0.915), "ps": (0.73, 0.90), "upv": (3.1, 3.85), "rn": (24, 32)},
    "Severe":       {"ei": (0.60, 0.805), "ps": (0.53, 0.77), "upv": (2.7, 3.35), "rn": (19, 27)},
}

FEATURE_ORDER = ["f1", "f2", "f3", "a_rms", "a_max", "kurtosis",
                 "delta_max", "eps_max", "upv", "rebound"]


@dataclass
class SyntheticConfig:
    n_per_condition: int = 60
    fs: float = 200.0
    duration: float = 30.0
    service_udl_kN_m: float = 45.0      # self + SIDL + LL representative
    noise_frac: float = 0.04
    meas_noise: float = 0.02           # measurement scatter on f/δ (temperature/operational)
    conditions: List[str] = field(default_factory=lambda: list(CONDITION_RANGES))
    seed: Optional[int] = 42
    engine: str = "openseespy"         # structural model: realistic grillage by default


def _u(rng, lohi):
    return float(rng.uniform(lohi[0], lohi[1]))


def generate_dataset(section: CompositeSection, cfg: SyntheticConfig) -> Dict[str, object]:
    rng = np.random.default_rng(cfg.seed)
    eng = make_engine(section, kind=cfg.engine)
    rows: List[Dict[str, float]] = []
    labels: List[str] = []
    for cond in cfg.conditions:
        r = CONDITION_RANGES[cond]
        for _ in range(cfg.n_per_condition):
            ei = _u(rng, r["ei"])
            ps = _u(rng, r["ps"])
            upv = _u(rng, r["upv"])
            rn = _u(rng, r["rn"])
            # structural response
            f1, f2, f3 = eng.natural_frequencies(3, ei_factor=ei)
            delta = eng.midspan_deflection(w_udl_kN_m=cfg.service_udl_kN_m, ei_factor=ei)
            # measurement scatter: real modal/deflection readings vary with temperature
            # and operational conditions, which blurs the class boundaries (why SHM
            # classification is non-trivial and the confusion matrix is informative).
            mn = cfg.meas_noise
            f1 *= 1.0 + mn * rng.standard_normal()
            f2 *= 1.0 + mn * rng.standard_normal()
            f3 *= 1.0 + mn * rng.standard_normal()
            delta *= 1.0 + 1.3 * mn * rng.standard_normal()
            # strain ~ proportional to deflection/curvature; simple proxy (microstrain)
            eps = delta / section.span * 1.0e6 * 0.8
            # vibration signal features
            resp = eng.acceleration_response(
                duration=cfg.duration, fs=cfg.fs, ei_factor=ei,
                noise_frac=cfg.noise_frac, seed=int(rng.integers(0, 1_000_000)),
            )
            feats = signal_features(np.asarray(resp.a), cfg.fs)
            row = {
                "f1": round(f1, 4), "f2": round(f2, 4), "f3": round(f3, 4),
                "a_rms": round(feats["a_rms"], 6), "a_max": round(feats["a_max"], 6),
                "kurtosis": round(feats["kurtosis"], 4),
                "delta_max": round(delta, 3), "eps_max": round(eps, 3),
                "upv": round(upv, 3), "rebound": round(rn, 2),
                "ei_factor": round(ei, 4), "ps_factor": round(ps, 4),
                "sonreb_fc": round(sonreb_strength(upv, rn), 2),
            }
            rows.append(row)
            labels.append(cond)
    return {
        "rows": rows,
        "labels": labels,
        "feature_order": FEATURE_ORDER,
        "conditions": cfg.conditions,
    }


STIFFNESS_MECHANISMS = {"Cracking", "Stiffness reduction", "Corrosion"}


def _label_for(x: float) -> str:
    return "Healthy" if x < 0.05 else "Minor" if x < 0.12 else "Deteriorated" if x < 0.25 else "Severe"


def scenario_stiffness_loss(mechanisms, location: float, extent_m: float,
                            severity_pct: float, span_m: float) -> float:
    """Fractional flexural-stiffness loss x for a damage scenario.

    Physically reasoned (not prescribed by the problem): severity sets the local
    stiffness drop, scaled by how much of the span it covers (extent/L) and by the
    mode-1 curvature weighting at the damage location (sin(pi*loc) -- worst at
    mid-span). Only stiffness-type mechanisms cut EI strongly; others contribute
    little. Bearing deterioration adds a small boundary-softening term. Capped at 0.6.
    """
    mechs = set(mechanisms)
    stiff = 1.0 if (mechs & STIFFNESS_MECHANISMS) else 0.3
    x = (severity_pct / 100.0) * (extent_m / span_m) * np.sin(np.pi * location) * stiff * 2.533
    if "Bearing deterioration" in mechs:
        x += 0.02
    return float(min(0.6, max(0.0, x)))


def scenario_preview(section: CompositeSection, mechanisms, location: float,
                     extent_m: float, severity_pct: float,
                     service_udl_kN_m: float = 45.0, noise_frac: float = 0.03,
                     seed: Optional[int] = 7, engine: str = "openseespy") -> Dict[str, object]:
    """Real-physics preview for the synthetic-data stage: the user's damage scenario
    applied to the actual engine, deterministic per-class values for the comparison
    bars, and a small labelled sample for the preview table. Does NOT generate the
    full ML dataset (that is generate_dataset, run on demand)."""
    eng = make_engine(section, kind=engine)
    L = eng.L  # span in metres (section.span is mm)
    mechs = set(mechanisms)

    def structural(ei: float):
        f1 = eng.natural_frequencies(1, ei_factor=ei)[0]
        delta = eng.midspan_deflection(w_udl_kN_m=service_udl_kN_m, ei_factor=ei)
        return f1, delta

    # healthy baseline (ei = 1)
    f1_0, delta_0 = structural(1.0)
    upv_0 = 4.3

    # the user's scenario
    x = scenario_stiffness_loss(mechanisms, location, extent_m, severity_pct, L)
    ei_s = 1.0 - x
    f1_s, delta_s = structural(ei_s)
    if "Prestress loss" in mechs:
        delta_s += 3.0 * severity_pct / 35.0  # extra sag from effective-prestress loss (mm)
    upv_s = upv_0 * (1.0 - (0.4 * severity_pct / 100.0 if "Cracking" in mechs else 0.0))
    ps_s = 1.0 - (severity_pct / 100.0 if "Prestress loss" in mechs else 0.0)

    # deterministic per-class values from the condition-range midpoints
    summary: Dict[str, Dict[str, float]] = {}
    for cond, r in CONDITION_RANGES.items():
        ei_mid = (r["ei"][0] + r["ei"][1]) / 2.0
        f1c, dc = structural(ei_mid)
        summary[cond] = {
            "f1": round(f1c, 4), "delta_max": round(dc, 3),
            "upv": round((r["upv"][0] + r["upv"][1]) / 2.0, 3),
        }

    # a small labelled sample for the preview table (real draws within class ranges)
    rng = np.random.default_rng(seed)
    pattern = ["Healthy", "Minor", "Deteriorated", "Severe", "Deteriorated", "Minor"]
    preview = []
    for i, cond in enumerate(pattern):
        r = CONDITION_RANGES[cond]
        ei = _u(rng, r["ei"])
        f1p, dp = structural(ei)
        nz = 1.0 + noise_frac * float(rng.standard_normal())
        preview.append({
            "id": "R" + str(1000 + i * 37 + (seed or 0)),
            "label": cond,
            "f1": round(f1p * nz, 2),
            "delta_max": round(dp * nz, 1),
            "upv": round(_u(rng, r["upv"]) * (1.0 + noise_frac * float(rng.standard_normal())), 2),
        })

    return {
        "scenario": {
            "x": round(x, 4), "ei_factor": round(ei_s, 4), "ps_factor": round(ps_s, 4),
            "f1": round(f1_s, 4), "delta_max": round(delta_s, 3), "upv": round(upv_s, 4),
            "label": _label_for(x),
        },
        "baseline": {"f1": round(f1_0, 4), "delta_max": round(delta_0, 3), "upv": upv_0},
        "summary": summary,
        "conditions": list(CONDITION_RANGES),
        "preview": preview,
    }


def baseline_fingerprint(section: CompositeSection, service_udl_kN_m: float = 45.0,
                         engine: str = "openseespy") -> Dict[str, float]:
    """Healthy-bridge baseline record used as the comparison reference."""
    eng = make_engine(section, kind=engine)
    f1, f2, f3 = eng.natural_frequencies(3)
    delta = eng.midspan_deflection(w_udl_kN_m=service_udl_kN_m)
    return {
        "f1": round(f1, 4), "f2": round(f2, 4), "f3": round(f3, 4),
        "delta_max": round(delta, 3),
        "eps_max": round(delta / section.span * 1.0e6 * 0.8, 3),
        "upv_nominal": 4.3, "rebound_nominal": 38.0,
    }
