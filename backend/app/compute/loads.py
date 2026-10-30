"""IRC loads for the bridge superstructure (per-girder, simply supported).

Covers dead load (from the section), superimposed dead load (wearing coat, crash
barriers, footpath LL), and IRC live load (Class 70R / Class A) reduced to a
representative per-girder UDL + knife load for a simply-supported span, with an
impact factor. These are simplified design-level estimates for the integrated
study; the live-load positioning, transverse distribution and impact factor MUST
be verified against IRC:6 for any real design (paywalled -- no invented clauses).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass
class SIDL:
    wearing_coat_kN_m2: float = 1.65    # ~65-75 mm bituminous (~22 kN/m3)
    crash_barrier_kN_m: float = 20.0    # per barrier line (research value)
    footpath_LL_kN_m2: float = 5.0      # footpath live load
    footpath_width_m: float = 1.5


@dataclass
class LiveLoadResult:
    kind: str
    udl_kN_m: float          # equivalent per-girder UDL incl. impact
    impact_factor: float
    moment_mid_kNm: float
    shear_end_kN: float


def impact_factor_class_a(span_m: float) -> float:
    """IRC:6 Class A impact factor for concrete: 4.5/(6+L), capped. Verify."""
    return min(0.5, 4.5 / (6.0 + span_m))


def impact_factor_70r(span_m: float) -> float:
    """70R wheeled ~ 25% up to 9 m then reduces; use 0.25 cap for mid spans. Verify."""
    return 0.25


def dead_load_moment_shear(w_kN_m: float, span_m: float) -> Dict[str, float]:
    return {
        "moment_mid_kNm": w_kN_m * span_m ** 2 / 8.0,
        "shear_end_kN": w_kN_m * span_m / 2.0,
    }


def live_load(
    kind: str, span_m: float, n_girders: int = 5, lanes: int = 3,
    dist_factor: float = None,
) -> LiveLoadResult:
    """Representative per-girder live-load effect.

    Uses a lumped lane load distributed across girders by a lateral distribution
    factor. `dist_factor` overrides the crude lanes/n_girders default (e.g. a
    Courbon/Grillage factor). Order-of-magnitude design input for the study.
    """
    if kind == "ClassA":
        total_kN = 554.0           # Class A train ~55.4 t (research value)
        imp = impact_factor_class_a(span_m)
    else:  # 70R or 70R+A -> governed by 70R
        total_kN = 1000.0 if kind == "70R" else 1180.0  # 70R, or 70R+A superposed
        imp = impact_factor_70r(span_m)
    # lateral distribution to the outer girder
    df = dist_factor if dist_factor is not None else min(1.0, lanes / max(n_girders, 1))
    per_girder = total_kN * df * (1.0 + imp)
    # represent as equivalent UDL over the span for simply-supported effects
    udl = per_girder / span_m
    M = udl * span_m ** 2 / 8.0
    V = udl * span_m / 2.0
    return LiveLoadResult(kind, udl, 1.0 + imp, M, V)


def superimposed_udl(sidl: SIDL, carriageway_width_m: float, n_girders: int) -> float:
    """SIDL reduced to a per-girder UDL (kN/m)."""
    w_wc = sidl.wearing_coat_kN_m2 * carriageway_width_m / n_girders
    w_cb = 2.0 * sidl.crash_barrier_kN_m / n_girders
    w_fp = sidl.footpath_LL_kN_m2 * sidl.footpath_width_m * 2.0 / n_girders
    return w_wc + w_cb + w_fp
