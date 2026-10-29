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

from .engine import AnalyticalEngine
from .features import signal_features
from .geometry import CompositeSection
from .ndt import sonreb_strength


# condition -> (ei_lo, ei_hi, ps_lo, ps_hi, upv_lo, upv_hi, rn_lo, rn_hi)
CONDITION_RANGES: Dict[str, Dict[str, tuple]] = {
    "Healthy":      {"ei": (0.98, 1.00), "ps": (0.97, 1.00), "upv": (4.2, 4.5), "rn": (36, 40)},
    "Minor":        {"ei": (0.92, 0.98), "ps": (0.90, 0.97), "upv": (3.8, 4.2), "rn": (30, 36)},
    "Deteriorated": {"ei": (0.80, 0.92), "ps": (0.75, 0.90), "upv": (3.2, 3.8), "rn": (25, 32)},
    "Severe":       {"ei": (0.62, 0.80), "ps": (0.55, 0.75), "upv": (2.8, 3.3), "rn": (20, 27)},
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
    conditions: List[str] = field(default_factory=lambda: list(CONDITION_RANGES))
    seed: Optional[int] = 42


def _u(rng, lohi):
    return float(rng.uniform(lohi[0], lohi[1]))


def generate_dataset(section: CompositeSection, cfg: SyntheticConfig) -> Dict[str, object]:
    rng = np.random.default_rng(cfg.seed)
    eng = AnalyticalEngine(section)
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


def baseline_fingerprint(section: CompositeSection, service_udl_kN_m: float = 45.0) -> Dict[str, float]:
    """Healthy-bridge baseline record used as the comparison reference."""
    eng = AnalyticalEngine(section)
    f1, f2, f3 = eng.natural_frequencies(3)
    delta = eng.midspan_deflection(w_udl_kN_m=service_udl_kN_m)
    return {
        "f1": round(f1, 4), "f2": round(f2, 4), "f3": round(f3, 4),
        "delta_max": round(delta, 3),
        "eps_max": round(delta / section.span * 1.0e6 * 0.8, 3),
        "upv_nominal": 4.3, "rebound_nominal": 38.0,
    }
