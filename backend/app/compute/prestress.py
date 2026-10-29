"""Post-tensioning: forces, losses (P0 -> Pe) and stage stresses.

Loss model follows the standard decomposition used in IRC:18 / IRC:112 practice:
  immediate   : friction (curvature mu + wobble K), anchorage slip, elastic shortening
  time-dependent: concrete creep, concrete shrinkage, steel relaxation

Formulas are the textbook/Caltrans/PCI forms (verified across sources in the
research phase). Clause-specific coefficients MUST be confirmed against the
actual IRC text before design use -- the codes are paywalled; we do not invent
clause numbers. Guarantees Pe < P0.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from math import exp, pi
from typing import Dict, List

from .materials import MaterialSet, default_materials


@dataclass
class TendonProfile:
    """Parabolic tendon, eccentricity e_mid at mid-span, ~0 at supports."""

    n_cables: int = 6
    strands_per_cable: int = 12
    duct_dia: float = 90.0            # mm
    e_mid: float = 650.0              # mm eccentricity below composite centroid at mid-span
    span: float = 33000.0            # mm
    jack_from_both_ends: bool = True

    def area(self, strand_area: float) -> float:
        return self.n_cables * self.strands_per_cable * strand_area

    def total_angle_change(self) -> float:
        """Approx total angular change of a parabola over half span (rad).

        For a parabola with drape 'e_mid' over half-span L/2, slope at end
        ~ 2*e_mid/(L/2). Angle change alpha ~ that slope (small-angle).
        """
        half = self.span / 2.0
        drape = self.e_mid
        return 2.0 * drape / half  # rad over half length


@dataclass
class LossBreakdown:
    friction: float          # MPa (stress loss)
    anchorage: float
    elastic_shortening: float
    creep: float
    shrinkage: float
    relaxation: float

    @property
    def immediate(self) -> float:
        return self.friction + self.anchorage + self.elastic_shortening

    @property
    def time_dependent(self) -> float:
        return self.creep + self.shrinkage + self.relaxation

    @property
    def total(self) -> float:
        return self.immediate + self.time_dependent

    def as_dict(self) -> Dict[str, float]:
        return {
            "friction": self.friction,
            "anchorage": self.anchorage,
            "elastic_shortening": self.elastic_shortening,
            "creep": self.creep,
            "shrinkage": self.shrinkage,
            "relaxation": self.relaxation,
            "immediate_total": self.immediate,
            "time_dependent_total": self.time_dependent,
            "total": self.total,
        }


@dataclass
class PrestressResult:
    P0: float                 # total initial force at jacking (kN)
    Pe: float                 # total effective force after all losses (kN)
    sigma_p0: float           # initial strand stress (MPa)
    sigma_pe: float           # effective strand stress (MPa)
    losses: LossBreakdown
    loss_percent: float
    Ap: float                 # total strand area (mm^2)

    def check_pe_lt_p0(self) -> bool:
        return self.Pe < self.P0


def compute_prestress(
    profile: TendonProfile,
    materials: MaterialSet = None,
    *,
    mu: float = 0.17,            # curvature friction coeff (typ. 0.15-0.25); verify vs IRC
    K: float = 0.0020,           # wobble per metre (1/m); verify vs IRC
    anchorage_slip: float = 6.0,  # mm
    section_A: float = 1.111e6,   # composite area mm^2 (for elastic shortening)
    section_I: float = 0.476e12,  # mm^4
    moment_sw_kNm: float = 3000.0,  # self-weight moment at mid-span for stress calc
    creep_coeff: float = 1.6,     # ultimate creep coefficient (verify)
    shrinkage_strain: float = 2.0e-4,  # (verify vs IRC/EC2)
    relaxation_frac: float = 0.025,     # low-relaxation ~2.5% of initial (verify)
) -> PrestressResult:
    mats = materials or default_materials()
    tendon = mats.tendon
    Ap = profile.area(tendon.strand_area)
    sigma_p0 = tendon.fp0                           # initial jacking stress (MPa)
    P0 = sigma_p0 * Ap / 1000.0                      # kN

    # --- friction + wobble (stress at mid-span relative to jack) ---
    alpha = profile.total_angle_change()
    L_m = profile.span / 1000.0
    x = L_m / 2.0                                    # to mid-span
    if profile.jack_from_both_ends:
        x = L_m / 2.0                                # each end stresses half the length
    frac_remaining = exp(-(mu * alpha + K * x))
    friction_loss = sigma_p0 * (1.0 - frac_remaining)

    # --- anchorage slip (averaged over length) ---
    # slip strain * Ep distributed; simple average estimate
    anchorage_loss = (anchorage_slip / (profile.span)) * tendon.Ep
    anchorage_loss = min(anchorage_loss, 0.10 * sigma_p0)  # cap crude estimate

    # --- elastic shortening ---
    # concrete stress at tendon level due to prestress, times modular ratio / factor
    e = profile.e_mid
    fc_at_tendon = (P0 * 1000.0) / section_A + (P0 * 1000.0 * e) * e / section_I
    n_p = tendon.Ep / (mats.concrete.Ecm)
    # average loss (first strand max, last zero) -> factor ~0.5 for post-tensioned
    elastic_loss = 0.5 * n_p * fc_at_tendon

    sigma_after_immediate = sigma_p0 - friction_loss - anchorage_loss - elastic_loss

    # --- time-dependent ---
    relaxation_loss = relaxation_frac * sigma_after_immediate
    n_p_eff = tendon.Ep / mats.concrete.Ecm
    creep_loss = creep_coeff * n_p_eff * fc_at_tendon
    shrinkage_loss = shrinkage_strain * tendon.Ep

    losses = LossBreakdown(
        friction=friction_loss,
        anchorage=anchorage_loss,
        elastic_shortening=elastic_loss,
        creep=creep_loss,
        shrinkage=shrinkage_loss,
        relaxation=relaxation_loss,
    )
    sigma_pe = sigma_p0 - losses.total
    Pe = sigma_pe * Ap / 1000.0
    loss_percent = 100.0 * (1.0 - Pe / P0)
    return PrestressResult(
        P0=P0, Pe=Pe, sigma_p0=sigma_p0, sigma_pe=sigma_pe,
        losses=losses, loss_percent=loss_percent, Ap=Ap,
    )


def stage_stresses(
    Pe_kN: float, e_mm: float, section_A: float, Z_top: float, Z_bot: float,
    moment_kNm: float,
) -> Dict[str, float]:
    """Extreme-fibre stresses (MPa, compression +) under prestress + moment."""
    P = Pe_kN * 1000.0          # N
    M = moment_kNm * 1.0e6       # N.mm
    # prestress: axial + hogging from eccentricity (e below centroid -> top tension)
    s_top = P / section_A - P * e_mm / Z_top + M / Z_top
    s_bot = P / section_A + P * e_mm / Z_bot - M / Z_bot
    return {"sigma_top": s_top, "sigma_bot": s_bot}
