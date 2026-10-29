"""Material models for the PSC I-girder bridge.

Defaults follow common Indian practice for PSC bridge girders (M45 concrete,
Fe500 reinforcement, low-relaxation 7-wire strands). All values are SI
(N, mm, MPa=N/mm^2) unless noted. These are engineering defaults the user can
override; every value that feeds a code check must still be verified against the
actual IRC/IS text (which is paywalled -- we do not invent clause numbers).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from math import sqrt


@dataclass
class Concrete:
    """Concrete grade. fck is characteristic cube strength (MPa)."""

    fck: float = 45.0  # M45 girder
    density: float = 25.0e-6  # N/mm^3 (24-25 kN/m^3); used for self-weight -> 25 kN/m^3
    name: str = "M45"

    @property
    def Ecm(self) -> float:
        """Secant modulus of elasticity (MPa).

        IRC:112 relates Ecm to the mean cylinder strength fcm = fck + 8 (approx.
        taking cube~cylinder for this estimate): Ecm = 22000*(fcm/10)**0.3 (MPa).
        This is the Eurocode/IRC:112 form; verify the exact expression and the
        cube/cylinder conversion against the code before design use.
        """
        fcm = self.fck + 8.0
        return 22000.0 * (fcm / 10.0) ** 0.3

    @property
    def fctm(self) -> float:
        """Mean axial tensile strength (MPa), IRC:112 / EC2 form for <= C50."""
        return 0.259 * self.fck ** (2.0 / 3.0)  # approx with fck(cube); verify


@dataclass
class Rebar:
    """Reinforcing steel."""

    fy: float = 500.0  # Fe500
    Es: float = 200000.0
    name: str = "Fe500"


@dataclass
class PrestressingSteel:
    """Low-relaxation prestressing strand (e.g. 15.2 mm 7-wire)."""

    fpk: float = 1860.0  # characteristic tensile strength (MPa)
    Ep: float = 195000.0  # modulus of prestressing steel (MPa)
    strand_area: float = 140.0  # mm^2 per 15.2 mm strand (nominal)
    name: str = "15.2mm 7-wire LR strand (1860 MPa)"

    @property
    def fp0(self) -> float:
        """Permissible initial jacking stress ~0.76-0.80 fpk (verify vs IRC:112)."""
        return 0.76 * self.fpk


@dataclass
class MaterialSet:
    concrete: Concrete = field(default_factory=Concrete)
    deck_concrete: Concrete = field(default_factory=lambda: Concrete(fck=40.0, name="M40"))
    rebar: Rebar = field(default_factory=Rebar)
    tendon: PrestressingSteel = field(default_factory=PrestressingSteel)

    @property
    def modular_ratio_deck(self) -> float:
        """Ratio used to transform the deck slab into equivalent girder concrete."""
        return self.deck_concrete.Ecm / self.concrete.Ecm


def default_materials() -> MaterialSet:
    return MaterialSet()
