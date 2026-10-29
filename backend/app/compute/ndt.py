"""Non-destructive testing: grading and combined (SonReb) strength estimate.

Grading bands collected and cross-checked in the research phase:
  UPV (km/s), per IS 13311 Part 1 / IS 516 Part 5 (verify current edition):
     > 4.5 Excellent | 3.5-4.5 Good | 3.0-3.5 Doubtful/Medium | < 3.0 Poor
  Rebound number (surface ~30 mm only -> combine with UPV):
     < 25 Poor | 25-35 Intermediate | > 35 Sound
SonReb combines UPV + rebound for a better strength estimate than either alone.
These are quality indicators, NOT a substitute for core calibration.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


UPV_BANDS = [
    (4.5, float("inf"), "Excellent"),
    (3.5, 4.5, "Good"),
    (3.0, 3.5, "Doubtful"),
    (0.0, 3.0, "Poor"),
]

REBOUND_BANDS = [
    (35.0, float("inf"), "Sound"),
    (25.0, 35.0, "Intermediate"),
    (0.0, 25.0, "Poor"),
]


def grade_upv(upv_km_s: float) -> str:
    for lo, hi, label in UPV_BANDS:
        if lo <= upv_km_s < hi:
            return label
    return "Poor"


def grade_rebound(rn: float) -> str:
    for lo, hi, label in REBOUND_BANDS:
        if lo <= rn < hi:
            return label
    return "Poor"


def sonreb_strength(upv_km_s: float, rebound: float) -> float:
    """Combined (SonReb) compressive-strength estimate (MPa).

    Illustrative power-law form fc = a * UPV^b * RN^c with typical exponents
    from the literature. Coefficients MUST be calibrated against site cores for
    any real assessment -- this is a representative, uncalibrated estimate only.
    """
    a, b, c = 1.2e-3, 2.6, 1.4
    return a * (upv_km_s ** b) * (rebound ** c)


@dataclass
class NDTReading:
    location: str
    upv: float
    rebound: float

    def assess(self) -> Dict[str, object]:
        return {
            "location": self.location,
            "upv": self.upv,
            "upv_grade": grade_upv(self.upv),
            "rebound": self.rebound,
            "rebound_grade": grade_rebound(self.rebound),
            "sonreb_fc_MPa": round(sonreb_strength(self.upv, self.rebound), 1),
        }


def condition_from_ndt(upv: float, rebound: float) -> str:
    """Map NDT grades to a coarse structural condition label."""
    u, r = grade_upv(upv), grade_rebound(rebound)
    if u == "Excellent" and r == "Sound":
        return "Healthy"
    if u in ("Excellent", "Good") and r in ("Sound", "Intermediate"):
        return "Minor"
    if u == "Doubtful" or r == "Intermediate":
        return "Deteriorated"
    return "Severe"
