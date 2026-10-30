"""OpenSeesPy grillage engine (E3).

A real 3-D grillage: N longitudinal composite-girder lines coupled by transverse
deck strips. Unlike the single Euler-Bernoulli beam (which forces f1:f2:f3 =
1:4:9), the grillage captures coupled bending + torsion of the multi-girder deck,
so the first modes come out CLOSELY SPACED (bending / torsion / 2nd bending) --
the realistic triplet the single beam cannot produce.

Interface-compatible with AnalyticalEngine: it subclasses it and overrides only
the modal methods, inheriting midspan_deflection and acceleration_response. The
inherited acceleration_response calls self.natural_frequencies(), so the
synthesized vibration signal automatically resonates at the grillage frequencies.

make_engine() imports this lazily inside a try/except and falls back to the
analytical engine on ANY error (missing openseespy, solver failure, etc.), so the
app never breaks if OpenSees is unavailable.
"""
from __future__ import annotations

import math
import threading
from typing import Dict, List, Tuple

import numpy as np

from .engine import AnalyticalEngine, ModalResult
from .geometry import CompositeSection

# OpenSeesPy keeps ONE global model (ops.wipe()/ops.model(...)/ops.eigen(...)), so
# two solves running at once corrupt each other's state. FastAPI serves sync `def`
# endpoints from a threadpool, so concurrent requests (e.g. the two monitoring
# signal calls, or the dashboard's baseline fetch) would collide. Serialize every
# OpenSees model build + eigen with this process-wide lock. Solves are fast, so the
# serialization cost is negligible.
_OPS_LOCK = threading.Lock()


class OpenSeesEngine(AnalyticalEngine):
    name = "openseespy"

    def __init__(self, section: CompositeSection, damping_ratio: float = 0.02,
                 n_stations: int = 11, poisson: float = 0.2):
        self._nx = max(5, n_stations)        # nodes per girder line
        self._nu = poisson
        # cached base solve (ei=mass=1) per n_modes; other scalings derived analytically
        self._eig_cache: Dict[int, Tuple[List[float], List[float], List[List[float]]]] = {}
        super().__init__(section, damping_ratio)

    # ---- grillage eigen analysis ------------------------------------------
    def _eigen(self, n_modes: int, ei_factor: float, mass_factor: float):
        """Grillage modes for a given stiffness/mass scaling.

        The whole stiffness matrix scales uniformly with ei_factor and the whole
        mass matrix with mass_factor, so the generalized eigenproblem gives
        omega^2(ei, mass) = (ei / mass_factor) * omega^2(1, 1) EXACTLY, and the
        mode shapes are unchanged. So we run OpenSees ONCE (at ei=mass=1, cached
        per n_modes) and scale the frequencies analytically -- realistic grillage
        modes without a fresh FE solve for every deterioration draw (the synthetic
        / features / ML stages sweep hundreds of distinct ei_factors per call).
        """
        base_freqs, xs, shapes = self._eigen_base(n_modes)
        scale = math.sqrt(max(ei_factor, 0.0) / max(mass_factor, 1e-9))
        freqs = [f * scale for f in base_freqs]
        return freqs, xs, shapes

    def _eigen_base(self, n_modes: int):
        """The actual OpenSees grillage solve at ei_factor = mass_factor = 1.0,
        cached per n_modes (frequencies for other scalings are derived in _eigen)."""
        if n_modes in self._eig_cache:
            return self._eig_cache[n_modes]

        import openseespy.opensees as ops

        ei_factor = 1.0
        mass_factor = 1.0
        sec = self.section
        p = sec.composite_properties()
        nG = max(2, sec_n_girders(sec))
        nx = self._nx
        L = self.L                                   # m
        sp = sec.girder_spacing / 1000.0             # m, c/c
        dx = L / (nx - 1)

        E = sec.materials.concrete.Ecm * 1.0e6 * ei_factor   # Pa
        G = E / (2.0 * (1.0 + self._nu))
        # composite girder section props (mm -> m)
        A = p.A * 1e-6
        Iz = p.I * 1e-12            # vertical bending (strong axis)
        Iy = max(p.Iy * 1e-12, 1e-9)
        J = max(p.J * 1e-12, 1e-9)
        # transverse deck strip (width dx, thickness t)
        t = sec.deck_thickness / 1000.0
        bt = dx
        At = bt * t
        Itz = bt * t ** 3 / 12.0    # deck-strip vertical bending
        Ity = t * bt ** 3 / 12.0
        Jt = bt * t ** 3 / 3.0
        Ed = sec.materials.concrete.Ecm * 1.0e6 * ei_factor
        Gd = Ed / (2.0 * (1.0 + self._nu))

        m_per_len = self.m0 * mass_factor            # kg/m per girder (incl. tributary deck)
        rgyr2 = (p.Ip / p.A) * 1e-6                   # polar radius of gyration^2 (m^2)

        def nid(i, j):
            return i * nx + j + 1

        # Serialize the whole model build + eigen: OpenSees' global state is shared
        # across the threadpool threads FastAPI runs sync endpoints on.
        with _OPS_LOCK:
            ops.wipe()
            ops.model('basic', '-ndm', 3, '-ndf', 6)

            for i in range(nG):
                for j in range(nx):
                    ops.node(nid(i, j), j * dx, 0.0, i * sp)
                    trib = dx * (0.5 if (j == 0 or j == nx - 1) else 1.0)
                    m = m_per_len * trib
                    rot = m * rgyr2
                    ops.mass(nid(i, j), m, m, m, max(rot, 1e-9), 1e-9, 1e-9)

            # simple supports at both ends of every girder line: pin at x=0, roller at x=L
            for i in range(nG):
                ops.fix(nid(i, 0), 1, 1, 1, 0, 0, 0)
                ops.fix(nid(i, nx - 1), 0, 1, 1, 0, 0, 0)

            # longitudinal girder members (axis = global X): local y = Y (up), z = Z
            ops.geomTransf('Linear', 1, 0, 0, 1)
            # transverse deck members (axis = global Z): local y = -Y (vertical)
            ops.geomTransf('Linear', 2, 1, 0, 0)

            etag = 1
            for i in range(nG):
                for j in range(nx - 1):
                    ops.element('elasticBeamColumn', etag, nid(i, j), nid(i, j + 1),
                                A, E, G, J, Iy, Iz, 1)
                    etag += 1
            for j in range(nx):
                for i in range(nG - 1):
                    ops.element('elasticBeamColumn', etag, nid(i, j), nid(i + 1, j),
                                At, Ed, Gd, Jt, Ity, Itz, 2)
                    etag += 1

            vals = ops.eigen('-fullGenLapack', n_modes)
            freqs = [math.sqrt(max(v, 0.0)) / (2.0 * math.pi) for v in vals]

            # mode shapes along the reference (middle) girder line, vertical DOF (Y = 2)
            ref = nG // 2
            xs = [j * dx for j in range(nx)]
            shapes: List[List[float]] = []
            for mode in range(1, n_modes + 1):
                s = [ops.nodeEigenvector(nid(ref, j), mode, 2) for j in range(nx)]
                peak = max((abs(v) for v in s), default=1.0) or 1.0
                shapes.append([v / peak for v in s])

            ops.wipe()

        out = (freqs, xs, shapes)
        self._eig_cache[n_modes] = out
        return out

    # ---- overrides of the analytical modal methods ------------------------
    def natural_frequencies(self, n_modes: int = 3, ei_factor: float = 1.0,
                            mass_factor: float = 1.0) -> List[float]:
        freqs, _, _ = self._eigen(n_modes, ei_factor, mass_factor)
        return freqs

    def modal(self, n_modes: int = 3, n_stations: int = 41,
              ei_factor: float = 1.0, mass_factor: float = 1.0) -> ModalResult:
        freqs, xs, shapes = self._eigen(n_modes, ei_factor, mass_factor)
        # resample the grillage mode shapes onto n_stations for the UI
        xt = list(np.linspace(0.0, self.L, n_stations))
        xa = np.asarray(xs)
        res_shapes = [list(np.interp(xt, xa, np.asarray(sh))) for sh in shapes]
        return ModalResult(freqs, xt, res_shapes)


def sec_n_girders(sec: CompositeSection) -> int:
    """Number of girder lines. CompositeSection has no explicit count, so derive
    it from the carriageway/spacing if present, else default to 5 (the study deck)."""
    n = getattr(sec, 'n_girders', None)
    if isinstance(n, int) and n >= 2:
        return n
    return 5
