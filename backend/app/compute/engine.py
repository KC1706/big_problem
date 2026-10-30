"""Structural engine abstraction.

Two interchangeable implementations expose the same interface so the rest of the
app (routers, synthetic-data generator, baseline) never depends on which solver
is active:

* AnalyticalEngine  -- transparent Euler-Bernoulli composite-beam model
  (natural frequencies in ratio 1:4:9, closed-form deflection, modal-
  superposition acceleration response). Zero heavy dependencies.
* OpenSeesEngine    -- (added later) OpenSeesPy FE model; same methods.

Deterioration is applied through dimensionless factors on the *same* model:
    ei_factor   < 1  -> local/global stiffness loss (lowers f, raises deflection)
    mass_factor      -> added mass effects
    ps_factor        -> fraction of effective prestress remaining
so a single healthy model generates every condition by scaling these.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np

from .geometry import CompositeSection


@dataclass
class ModalResult:
    frequencies: List[float]        # Hz, first N modes
    mode_shape_x: List[float]       # sampling stations along span (m)
    mode_shapes: List[List[float]]  # mode_shapes[mode][station]


@dataclass
class ResponseResult:
    t: List[float]                  # s
    a: List[float]                  # m/s^2 acceleration at sensor
    sensor_x: float                 # m along span


class AnalyticalEngine:
    """Simply-supported composite Euler-Bernoulli beam.

    f_n = (n^2 * pi / 2) * sqrt(EI / (m L^4))  ->  f1:f2:f3 = 1:4:9
    phi_n(x) = sin(n*pi*x/L)
    delta_max (UDL w) = 5 w L^4 / (384 EI)
    delta_max (midspan point P) = P L^3 / (48 EI)
    """

    name = "analytical"

    def __init__(self, section: CompositeSection, damping_ratio: float = 0.02):
        self.section = section
        self.zeta = damping_ratio
        self._refresh()

    def _refresh(self) -> None:
        props = self.section.composite_properties()
        E = self.section.materials.concrete.Ecm * 1.0e6      # MPa -> Pa
        I = props.I * 1.0e-12                                # mm^4 -> m^4
        self.EI0 = E * I                                     # N.m^2
        self.m0 = self.section.mass_per_m()                  # kg/m
        self.L = self.section.span / 1000.0                  # mm -> m
        self.props = props

    # ---- modal -------------------------------------------------------------
    def natural_frequencies(
        self, n_modes: int = 3, ei_factor: float = 1.0, mass_factor: float = 1.0
    ) -> List[float]:
        EI = self.EI0 * ei_factor
        m = self.m0 * mass_factor
        base = np.sqrt(EI / (m * self.L ** 4))
        return [float((k ** 2) * np.pi / 2.0 * base) for k in range(1, n_modes + 1)]

    def modal(
        self, n_modes: int = 3, n_stations: int = 41,
        ei_factor: float = 1.0, mass_factor: float = 1.0,
    ) -> ModalResult:
        freqs = self.natural_frequencies(n_modes, ei_factor, mass_factor)
        xs = np.linspace(0.0, self.L, n_stations)
        shapes = [list(np.sin(k * np.pi * xs / self.L)) for k in range(1, n_modes + 1)]
        return ModalResult(freqs, list(xs), shapes)

    # ---- static deflection -------------------------------------------------
    def midspan_deflection(
        self, w_udl_kN_m: float = 0.0, p_point_kN: float = 0.0, ei_factor: float = 1.0
    ) -> float:
        """Mid-span deflection (mm) from a UDL and/or a central point load."""
        EI = self.EI0 * ei_factor
        w = w_udl_kN_m * 1000.0  # N/m
        P = p_point_kN * 1000.0  # N
        d = 5.0 * w * self.L ** 4 / (384.0 * EI) + P * self.L ** 3 / (48.0 * EI)
        return d * 1000.0  # m -> mm

    # ---- dynamic response (synthetic vibration signal) ---------------------
    def acceleration_response(
        self,
        duration: float = 60.0,
        fs: float = 200.0,
        sensor_x: Optional[float] = None,
        ei_factor: float = 1.0,
        mass_factor: float = 1.0,
        n_modes: int = 3,
        noise_frac: float = 0.03,
        excitation: str = "ambient",
        seed: Optional[int] = None,
    ) -> ResponseResult:
        """Modal-superposition acceleration time history at one sensor.

        Ambient excitation = band-limited white-noise modal forces (operational
        conditions). Each mode is an SDOF filter at its natural frequency with
        modal damping; contributions are weighted by the mode shape at the
        sensor so, e.g., mode 2 vanishes at mid-span (node) -- a real effect the
        sensor-placement screen exposes.
        """
        rng = np.random.default_rng(seed)
        if sensor_x is None:
            sensor_x = self.L / 3.0  # off-centre -> captures modes 1 & 2
        freqs = self.natural_frequencies(n_modes, ei_factor, mass_factor)
        n = int(duration * fs)
        t = np.arange(n) / fs
        dt = 1.0 / fs
        a_total = np.zeros(n)
        for k, f in enumerate(freqs, start=1):
            wn = 2.0 * np.pi * f
            zeta = self.zeta
            phi = np.sin(k * np.pi * sensor_x / self.L)
            if abs(phi) < 1e-6:
                continue
            # SDOF response to white-noise force via recursive (Newmark-like) step
            if excitation == "impulse":
                force = np.zeros(n)
                force[0] = 1.0
            else:
                force = rng.standard_normal(n)
            a_mode = np.zeros(n)
            vel = 0.0
            x_prev = 0.0
            # semi-implicit Euler integration of the SDOF: x'' + 2 z wn x' + wn^2 x = F.
            # We record the pseudo-acceleration (wn^2 * x), proportional to the modal
            # displacement: its spectrum shows a sharp resonance exactly at wn. Recording
            # the raw x'' instead would inject the white-noise force term directly (a flat
            # floor that buries the peak under a single rfft); numerically differentiating
            # the displacement twice (the old path) amplifies integration drift + HF noise.
            for i in range(n):
                acc = force[i] - 2.0 * zeta * wn * vel - wn ** 2 * x_prev
                vel += acc * dt
                x_prev += vel * dt
                a_mode[i] = wn ** 2 * x_prev
            # normalise each mode to comparable energy, weight by mode shape
            if np.std(a_mode) > 0:
                a_mode = a_mode / np.std(a_mode)
            a_total += phi * a_mode / k  # higher modes a bit weaker
        if np.std(a_total) > 0:
            a_total = a_total / np.std(a_total)
        # add measurement noise
        a_total = a_total + noise_frac * rng.standard_normal(n)
        # scale to a plausible ambient amplitude (m/s^2), ~milli-g level
        a_total = a_total * 0.02
        return ResponseResult(list(t), list(a_total), float(sensor_x))


def make_engine(section: CompositeSection, kind: str = "analytical", **kw):
    """Factory. kind='openseespy' falls back to analytical if unavailable."""
    if kind == "openseespy":
        try:
            from .openseespy_engine import OpenSeesEngine  # noqa: WPS433
            return OpenSeesEngine(section, **kw)
        except Exception:
            # transparent fallback per the engine policy in the plan
            return AnalyticalEngine(section, **kw)
    return AnalyticalEngine(section, **kw)
