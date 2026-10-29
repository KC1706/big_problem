"""Display-mesh builder for the 3D frontend.

Turns the composite section + modal result into node/element geometry plus
per-node mode-shape displacement vectors, so React Three Fiber can extrude the
girder and animate its vertices along the *real* mode shapes the engine returns
(no per-frame FE solve on the client).

World convention (metres):
    x = along the span, y = vertical (up), z = transverse (across the deck).
Beam nodes run along the span on the neutral axis (y=z=0). The cross-section
polygons live in the (z, y) plane, centred on the web, and are extruded along x.
"""
from __future__ import annotations

from typing import Dict, List

from .engine import ModalResult
from .geometry import CompositeSection


def _girder_polygon(section: CompositeSection) -> List[List[float]]:
    """Closed outline of the I-girder in the (z, y) plane, metres.

    Right side walked soffit -> top using each trapezoid's bottom/top half-width,
    then mirrored for the left side. Widths are continuous between segments by
    construction (each segment's top width equals the next segment's bottom).
    """
    right: List[List[float]] = []
    y = 0.0
    for seg in section.girder.segments():
        right.append([seg.b1 / 2.0, y])
        right.append([seg.b2 / 2.0, y + seg.h])
        y += seg.h
    left = [[-z, yy] for z, yy in reversed(right)]  # top -> bottom, mirrored
    pts = right + left
    return [[z / 1000.0, yy / 1000.0] for z, yy in pts]


def _deck_polygon(section: CompositeSection) -> List[List[float]]:
    """Rectangular deck-slab outline in (z, y), metres, sitting on the girder."""
    half = section.girder_spacing / 2.0          # tributary width (actual, not transformed)
    y0 = section.girder.depth
    y1 = y0 + section.deck_thickness
    pts = [[half, y0], [half, y1], [-half, y1], [-half, y0]]
    return [[z / 1000.0, yy / 1000.0] for z, yy in pts]


def build_mesh(section: CompositeSection, modal: ModalResult) -> Dict:
    """Assemble beam nodes/elements, cross-section polygons and modal vectors.

    `modal` must be sampled along the span (its `mode_shape_x` stations become
    the beam nodes). Each mode's per-node displacement is normalised so the peak
    magnitude is 1.0 and applied as a vertical (bending) displacement; the
    frontend scales it and multiplies by sin(2*pi*f*t) to animate.
    """
    xs = modal.mode_shape_x  # m, along span
    nodes = [{"id": i, "x": float(x), "y": 0.0, "z": 0.0} for i, x in enumerate(xs)]
    elements = [{"id": i, "n1": i, "n2": i + 1} for i in range(len(xs) - 1)]
    modes: List[Dict] = []
    for k, (f, shape) in enumerate(zip(modal.frequencies, modal.mode_shapes), start=1):
        peak = max((abs(v) for v in shape), default=0.0) or 1.0
        node_disp = [[0.0, float(v / peak), 0.0] for v in shape]  # bending -> vertical
        modes.append({"mode": k, "frequency": float(f), "node_disp": node_disp})
    return {
        "span": float(section.span / 1000.0),
        "depth": float((section.girder.depth + section.deck_thickness) / 1000.0),
        "nodes": nodes,
        "elements": elements,
        "girder_polygon": _girder_polygon(section),
        "deck_polygon": _deck_polygon(section),
        "modes": modes,
    }
