"""I-girder + composite deck cross-section geometry and section properties.

The girder is modelled as a vertical stack of trapezoidal segments (symmetric
about the vertical axis), which captures a standard precast PSC I-section
(bottom bulb -> bottom fillet -> web -> top fillet -> top flange). Composite
properties add the RCC deck slab transformed by the modular ratio.

Properties are computed analytically (parallel-axis theorem on closed-form
trapezoid integrals). This is exact for the idealised polygon and serves as the
transparent fallback / validation reference for the sectionproperties library.
All lengths in mm, areas in mm^2, second moments in mm^4.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from .materials import MaterialSet, default_materials


@dataclass
class Trapezoid:
    """A horizontal trapezoid segment, bottom width b1, top width b2, height h."""

    b1: float
    b2: float
    h: float

    @property
    def area(self) -> float:
        return 0.5 * (self.b1 + self.b2) * self.h

    @property
    def yc_from_base(self) -> float:
        """Centroid height above the segment base."""
        if self.b1 + self.b2 == 0:
            return self.h / 2.0
        return self.h * (self.b1 + 2.0 * self.b2) / (3.0 * (self.b1 + self.b2))

    @property
    def I_own(self) -> float:
        """Second moment of area about the segment's own horizontal centroid."""
        b1, b2, h = self.b1, self.b2, self.h
        if b1 + b2 == 0:
            return 0.0
        return h ** 3 * (b1 ** 2 + 4.0 * b1 * b2 + b2 ** 2) / (36.0 * (b1 + b2))


@dataclass
class GirderSection:
    """Standard PSC I-girder defined by its five classic zones (mm)."""

    # bottom bulb (flange)
    bf_bot: float = 600.0
    tf_bot: float = 250.0
    # bottom fillet (transition bulb -> web)
    h_fillet_bot: float = 150.0
    # web
    tw: float = 200.0
    hw: float = 950.0
    # top fillet (transition web -> top flange)
    h_fillet_top: float = 150.0
    # top flange
    bf_top: float = 500.0
    tf_top: float = 200.0

    def segments(self) -> List[Trapezoid]:
        """Bottom-to-top trapezoid stack."""
        return [
            Trapezoid(self.bf_bot, self.bf_bot, self.tf_bot),        # bulb
            Trapezoid(self.bf_bot, self.tw, self.h_fillet_bot),      # bottom fillet
            Trapezoid(self.tw, self.tw, self.hw),                    # web
            Trapezoid(self.tw, self.bf_top, self.h_fillet_top),      # top fillet
            Trapezoid(self.bf_top, self.bf_top, self.tf_top),        # top flange
        ]

    @property
    def depth(self) -> float:
        return self.tf_bot + self.h_fillet_bot + self.hw + self.h_fillet_top + self.tf_top


@dataclass
class SectionProps:
    """Computed section properties referenced to the section's own centroid."""

    A: float            # area, mm^2
    y_bot: float        # distance centroid -> bottom fibre, mm
    y_top: float        # distance centroid -> top fibre, mm
    I: float            # second moment about horizontal centroidal axis, mm^4
    Z_bot: float        # section modulus bottom, mm^3
    Z_top: float        # section modulus top, mm^3
    depth: float        # total depth, mm
    # --- E3 grillage additions (mm^4) ---
    J: float = 0.0      # St-Venant torsional constant (thin-walled open-section est.)
    Iy: float = 0.0     # second moment about the VERTICAL centroidal axis (lateral)
    Ip: float = 0.0     # polar second moment about the centroid (= I + Iy)


def _trapezoid_Iy(b1: float, b2: float, h: float) -> float:
    """Second moment about the vertical centroidal axis of a trapezoid symmetric
    about x=0 (width varies linearly b1->b2 over height h). Iy = h(b1+b2)(b1^2+b2^2)/48."""
    return h * (b1 + b2) * (b1 ** 2 + b2 ** 2) / 48.0


def girder_torsion_J(g: GirderSection) -> float:
    """Thin-walled OPEN-section St-Venant constant: J ~= sum(b*t^3)/3 over the
    rectangular plates (bottom flange, web, top flange). Fillets are short/chunky
    and contribute negligibly to the t^3 sum, so they are omitted (standard for an
    I-girder J estimate)."""
    return (
        g.bf_bot * g.tf_bot ** 3
        + g.hw * g.tw ** 3
        + g.bf_top * g.tf_top ** 3
    ) / 3.0


def girder_properties(g: GirderSection) -> SectionProps:
    """Non-composite girder section properties."""
    segs = g.segments()
    base = 0.0
    A = 0.0
    Ay = 0.0
    seg_data = []
    for s in segs:
        yc = base + s.yc_from_base
        A += s.area
        Ay += s.area * yc
        seg_data.append((s, yc))
        base += s.h
    y_cen = Ay / A  # from bottom
    I = 0.0
    Iy = 0.0
    for s, yc in seg_data:
        I += s.I_own + s.area * (yc - y_cen) ** 2
        Iy += _trapezoid_Iy(s.b1, s.b2, s.h)  # symmetric about x=0 -> no parallel-axis term
    depth = g.depth
    y_bot = y_cen
    y_top = depth - y_cen
    J = girder_torsion_J(g)
    return SectionProps(A, y_bot, y_top, I, I / y_bot, I / y_top, depth, J, Iy, I + Iy)


@dataclass
class CompositeSection:
    """I-girder + transformed deck slab acting compositely."""

    girder: GirderSection = field(default_factory=GirderSection)
    deck_thickness: float = 230.0          # mm
    girder_spacing: float = 2500.0         # c/c spacing (mm)
    span: float = 33000.0                  # mm (for effective width)
    n_girders: int = 5                     # number of girder lines (grillage, E3)
    materials: MaterialSet = field(default_factory=default_materials)

    def effective_width(self) -> float:
        """Effective deck flange width per common rule: min(spacing, L/4...).

        Uses b_eff = min(c/c spacing, span/4). Verify against IRC:112 effective
        width provisions for the final design.
        """
        return min(self.girder_spacing, self.span / 4.0)

    def composite_properties(self) -> SectionProps:
        gp = girder_properties(self.girder)
        n = self.materials.modular_ratio_deck  # deck -> girder transform (<1 if deck weaker)
        b_eff = self.effective_width()
        b_tr = b_eff * n  # transformed width
        A_slab = b_tr * self.deck_thickness
        # measure everything from girder bottom fibre
        y_girder = gp.y_bot
        y_slab = self.girder.depth + self.deck_thickness / 2.0
        A = gp.A + A_slab
        Ay = gp.A * y_girder + A_slab * y_slab
        y_cen = Ay / A
        I_slab_own = b_tr * self.deck_thickness ** 3 / 12.0
        I = (
            gp.I + gp.A * (y_girder - y_cen) ** 2
            + I_slab_own + A_slab * (y_slab - y_cen) ** 2
        )
        depth = self.girder.depth + self.deck_thickness
        y_bot = y_cen
        y_top = depth - y_cen
        # --- E3: torsion / lateral / polar for the composite section ---
        # Deck strip (transformed width b_tr) adds an open thin plate for J and a
        # wide lateral member for Iy. Both are about the composite centroid.
        J = gp.J + b_tr * self.deck_thickness ** 3 / 3.0
        Iy = gp.Iy + self.deck_thickness * b_tr ** 3 / 12.0
        return SectionProps(A, y_bot, y_top, I, I / y_bot, I / y_top, depth, J, Iy, I + Iy)

    def self_weight_per_m(self) -> float:
        """Self-weight of girder + its tributary deck slab, kN/m.

        Uses actual (untransformed) deck for mass. Density in N/mm^3 -> kN/m.
        """
        gp = girder_properties(self.girder)
        gamma = self.materials.concrete.density  # N/mm^3
        gamma_deck = self.materials.deck_concrete.density
        w_girder = gp.A * gamma  # N/mm
        A_slab_real = self.girder_spacing * self.deck_thickness
        w_slab = A_slab_real * gamma_deck
        # w is in N/mm; numerically 1 N/mm == 1 kN/m, so no scale factor needed.
        return w_girder + w_slab  # kN/m

    def mass_per_m(self) -> float:
        """Translational mass per unit length (kg/m) for dynamics.

        Includes girder + tributary deck. m = w/g with w in N/m.
        """
        w_kN_per_m = self.self_weight_per_m()  # kN/m
        g = 9.81  # m/s^2
        return w_kN_per_m * 1000.0 / g  # N/m / (m/s^2) = kg/m
