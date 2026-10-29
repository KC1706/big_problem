"""Verification tests for the compute core (the plan's verification section).

Checks the physics the problem relies on: section properties, Pe<P0 and loss
sums, the 1:4:9 modal ratio and plausible magnitude, deterioration
monotonicity (f down, delta up), NDT grading bands, and FFT recovery of f1.
Run:  cd backend && PYTHONPATH=. pytest -q
"""
from __future__ import annotations

import numpy as np

from app.compute.engine import AnalyticalEngine
from app.compute.features import dominant_frequencies
from app.compute.geometry import CompositeSection, girder_properties
from app.compute.mesh import build_mesh
from app.compute.ndt import grade_rebound, grade_upv
from app.compute.prestress import TendonProfile, compute_prestress
from app.compute.synthetic import SyntheticConfig, generate_dataset


def section():
    return CompositeSection(span=33000.0, girder_spacing=2500.0, deck_thickness=230.0)


def test_section_properties_sane():
    sec = section()
    cp = sec.composite_properties()
    assert 0.8e6 < cp.A < 1.5e6                      # ~1.1 m^2
    assert 0.3e12 < cp.I < 0.7e12                    # ~0.48 m^4
    assert 18.0 < sec.span / sec.girder.depth < 22.0  # L/d typical
    assert 20.0 < sec.self_weight_per_m() < 40.0      # kN/m


def test_modal_ratio_and_magnitude():
    eng = AnalyticalEngine(section())
    f = eng.natural_frequencies(3)
    assert abs(f[1] / f[0] - 4.0) < 1e-6              # 1:4:9 for SS beam
    assert abs(f[2] / f[0] - 9.0) < 1e-6
    assert 2.5 < f[0] < 4.5                            # near PDF's 3.2 Hz


def test_deterioration_monotonic():
    eng = AnalyticalEngine(section())
    f_healthy = eng.natural_frequencies(1)[0]
    f_damaged = eng.natural_frequencies(1, ei_factor=0.80)[0]
    d_healthy = eng.midspan_deflection(w_udl_kN_m=45.0)
    d_damaged = eng.midspan_deflection(w_udl_kN_m=45.0, ei_factor=0.80)
    assert f_damaged < f_healthy                       # frequency drops
    assert d_damaged > d_healthy                       # deflection rises
    # sqrt(0.8) ~ 0.894
    assert abs(f_damaged / f_healthy - np.sqrt(0.80)) < 1e-6


def test_prestress_pe_lt_p0_and_loss_sum():
    sec = section()
    cp = sec.composite_properties()
    res = compute_prestress(TendonProfile(span=33000.0), sec.materials,
                            section_A=cp.A, section_I=cp.I)
    assert res.Pe < res.P0
    assert res.check_pe_lt_p0()
    assert abs(res.losses.total - (res.losses.immediate + res.losses.time_dependent)) < 1e-6
    assert 0.0 < res.loss_percent < 45.0


def test_ndt_grading_bands():
    assert grade_upv(4.6) == "Excellent"
    assert grade_upv(4.0) == "Good"
    assert grade_upv(3.2) == "Doubtful"
    assert grade_upv(2.5) == "Poor"
    assert grade_rebound(38) == "Sound"
    assert grade_rebound(30) == "Intermediate"
    assert grade_rebound(20) == "Poor"


def test_fft_recovers_f1():
    eng = AnalyticalEngine(section())
    f1 = eng.natural_frequencies(1)[0]
    resp = eng.acceleration_response(duration=40, fs=200, sensor_x=33.0 / 3, seed=5)
    peaks = dominant_frequencies(np.asarray(resp.a), 200.0, n_peaks=3)
    assert any(abs(p - f1) < 0.3 for p in peaks)       # f1 present in spectrum


def test_mesh_nodes_elements_and_modal_vectors():
    sec = section()
    eng = AnalyticalEngine(sec)
    m = eng.modal(n_modes=3, n_stations=41)
    mesh = build_mesh(sec, m)
    # nodes span 0 -> L (m), elements connect consecutive nodes
    assert len(mesh["nodes"]) == 41
    assert len(mesh["elements"]) == 40
    assert mesh["nodes"][0]["x"] == 0.0
    assert abs(mesh["nodes"][-1]["x"] - 33.0) < 1e-6
    assert mesh["elements"][0] == {"id": 0, "n1": 0, "n2": 1}
    # one displacement vector per node per mode; peak-normalised to 1.0
    assert len(mesh["modes"]) == 3
    for mode in mesh["modes"]:
        assert len(mode["node_disp"]) == 41
        peak = max(abs(d[1]) for d in mode["node_disp"])
        assert abs(peak - 1.0) < 1e-9
        assert all(d[0] == 0.0 and d[2] == 0.0 for d in mode["node_disp"])  # bending = vertical
    # mode 1 half-sine: ends pinned (~0), mid-span is the antinode
    m1 = mesh["modes"][0]["node_disp"]
    assert abs(m1[0][1]) < 1e-9 and abs(m1[-1][1]) < 1e-9
    assert abs(m1[20][1]) > 0.99
    # cross-section polygons are closed loops of (z, y) points in metres
    assert len(mesh["girder_polygon"]) >= 8
    assert len(mesh["deck_polygon"]) == 4


def test_synthetic_dataset_separates_conditions():
    ds = generate_dataset(section(), SyntheticConfig(n_per_condition=15, duration=8, seed=1))
    assert len(ds["rows"]) == 60
    import collections
    by = collections.defaultdict(list)
    for r, lab in zip(ds["rows"], ds["labels"]):
        by[lab].append(r["f1"])
    # mean f1 decreases Healthy -> Severe
    means = [np.mean(by[c]) for c in ["Healthy", "Minor", "Deteriorated", "Severe"]]
    assert means[0] > means[1] > means[2] > means[3]
