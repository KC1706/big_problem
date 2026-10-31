"""Generate the report's FIELD-SURVEY LAYER from the backend compute core, so (almost)
every datum on pages 5 & 7 traces to code instead of being hand-written.

CANONICAL CONDITION = the ML classifier's prediction for the S-07 field vector -- the
exact /ml/pipeline call that produces page 7's "Minor p 0.48" headline. Everything
keys off that one class so the whole report stays consistent.

Produces (all derived, deterministic):
  * ml         : predicted class + probabilities (page 7 field prediction, health score).
  * upv_grid   : 4x12 UPV field on the G5 west face from a physical localized-damage
                 model anchored to the backend nominal UPV (4.3) and the scenario's
                 location/severity, graded by the real IS 13311 bands (ndt.py).
  * inspection : girder condition LABELS from the ML class; defect counts scaled from
                 scenario severity. Bearing/expansion/abutment conditions are VISUAL
                 inspection inputs (the backend models no bearing element) -- flagged.
  * maintenance: action dates = issue date + an interval table keyed to the ML class.

Run:  cd backend && PYTHONPATH=. ../.venv/bin/python ../BridgeLife-Report-handoff/tools/field_layer.py
(~2 min: the ML pipeline trains on a 600-record grillage dataset.)
"""
from __future__ import annotations

import datetime as dt
import json

import numpy as np

from app.models.schemas import SectionConfig, MLPipelineRequest
from app.routers import stages
from app.routers.common import build_section
from app.compute.synthetic import scenario_preview

# ---- the one canonical field scenario (S-07) -------------------------------
MECHANISMS = ["Cracking", "Prestress loss"]
LOCATION, EXTENT_M, SEVERITY = 0.5, 6.0, 28.0
N_PER_CLASS = 150                 # must match the page-7 run
ISSUE_DATE = dt.date(2026, 10, 31)
SEED = 42
RNG = np.random.default_rng(SEED)
HEALTH = {"Healthy": 0.95, "Minor": 0.82, "Deteriorated": 0.60, "Severe": 0.35}

cfg = SectionConfig()
sec = build_section(cfg)
scn = scenario_preview(sec, MECHANISMS, LOCATION, EXTENT_M, SEVERITY, engine="openseespy")
s, b = scn["scenario"], scn["baseline"]
upv_base, upv_scn = b["upv"], s["upv"]

# ---- canonical ML classification (page-7 field prediction) -----------------
df_pct = (s["f1"] / b["f1"] - 1.0) * 100.0
ml = stages.ml_pipeline(MLPipelineRequest(
    section=cfg, df_pct=df_pct, delta_mm=s["delta_max"], upv=s["upv"],
    model="RandomForest", n_per_condition=N_PER_CLASS))
CLASS = ml["prediction"]
probs = {k: round(float(v), 2) for k, v in ml.get("probabilities", {}).items()}
health = HEALTH[CLASS]


# ============================================================ 1. UPV grid ====
# UPV(row,col) on the G5 west face: 12 stations along span (cols), 4 rows top->bottom.
# Cracking lowers pulse velocity locally; the worst patch is the cracked soffit at the
# damage location, so the dip is centred at the bottom rows / damage column. Dip depth
# set so the worst cell reaches the IS "Doubtful" band (a local crack is worse than the
# member-average scenario UPV). Seeded probe scatter; clipped to [2.9, 4.6].
NCOL, NROW = 12, 4
c0, r0 = (NCOL - 1) * LOCATION, NROW - 1
sc = (EXTENT_M / (cfg.span / 1000.0)) * NCOL * 1.6
sr, dip = 1.6, upv_base - 3.26
grid = []
for r in range(NROW):
    row = []
    for c in range(NCOL):
        g = dip * np.exp(-(((c - c0) / sc) ** 2) - (((r - r0) / sr) ** 2))
        v = upv_base - g + 0.03 * RNG.standard_normal() + 0.02 * (c / (NCOL - 1))
        row.append(round(float(np.clip(v, 2.9, 4.6)), 2))
    grid.append(row)
flat = [v for row in grid for v in row]
upv_mean, upv_min = round(float(np.mean(flat)), 2), min(flat)
n_doubtful = sum(1 for v in flat if 3.0 <= v < 3.5)
WORD = {1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six"}


# ==================================================== 2. Inspection layer ====
# Girder conditions from the ML class; bearing/joint/abutment = VISUAL inputs (no
# backend bearing model). Note text is a fixed phrase keyed to (component, condition).
ORDER = ["Healthy", "Minor", "Deteriorated", "Severe"]
def milder(lbl): return ORDER[max(0, ORDER.index(lbl) - 1)]
NOTE = {
    ("Deck slab", "Minor"): "Hairline cracking near expansion joint",
    ("G1 – G3", "Healthy"): "No defects observed",
    ("G4", "Minor"): "Efflorescence at soffit",
    ("G4", "Healthy"): "No defects observed",
    ("G5", "Minor"): "Flexural cracks and rust stain at mid-span",
    ("G5", "Deteriorated"): "Open flexural cracks, spalling and rust at mid-span",
    ("Cross-girders", "Healthy"): "No defects observed",
    ("Bearing B5", "Deteriorated"): "Bulging and lateral displacement",
    ("Bearings B1 – B4", "Minor"): "Minor ageing of elastomer",
    ("Expansion joints", "Minor"): "Debris and seal wear",
    ("Abutments A1, A2", "Minor"): "Spalling at A2 bearing shelf",
}
# src tag: "ml" = girder condition from the ML class; "visual" = visual inspection input
inspection_src = [
    ("Deck slab", "Minor", "visual"),
    ("G1 – G3", "Healthy", "ml"),
    ("G4", milder(CLASS), "ml"),
    ("G5", CLASS, "ml"),
    ("Cross-girders", "Healthy", "ml"),
    ("Bearing B5", "Deteriorated", "visual"),
    ("Bearings B1 – B4", "Minor", "visual"),
    ("Expansion joints", "Minor", "visual"),
    ("Abutments A1, A2", "Minor", "visual"),
]
inspection = [{"name": n, "cond": c, "note": NOTE.get((n, c), "Inspected"), "src": src}
              for n, c, src in inspection_src]
defects = {"Cracks": round(SEVERITY * 0.18), "Spalling": round(SEVERITY * 0.07),
           "Corrosion": round(SEVERITY * 0.11), "Other": round(SEVERITY * 0.14)}
n_components = len(inspection)
n_observations = sum(1 for i in inspection if i["note"] != "No defects observed") + sum(defects.values())


# ==================================================== 3. Maintenance plan ====
INTERVALS = {"Healthy": (12, 12, 12, 24), "Minor": (1, 2, 3, 6),
             "Deteriorated": (0, 1, 1, 3), "Severe": (0, 0, 0, 1)}
mo = INTERVALS[CLASS]
def add_months(d, n):
    m = d.month - 1 + n
    return dt.date(d.year + m // 12, m % 12 + 1, 1)
def mon(d): return d.strftime("%b %Y").upper()
timeline = [
    (mon(add_months(ISSUE_DATE, mo[0])), "Detailed NDT of G5: cores, cover, carbonation", "#E0442F"),
    (mon(add_months(ISSUE_DATE, mo[1])), "Reset bearing B5", "#E6893C"),
    (mon(add_months(ISSUE_DATE, mo[2])), "Seal soffit cracks on G4, G5", "#E6893C"),
    ("ONGOING", "Continuous monitoring on G5", "#127f94"),
    (mon(add_months(ISSUE_DATE, mo[3])), "Reinspection", "#16181a"),
]

OUT = {
    "scenario": {"mechanisms": MECHANISMS, "location": LOCATION, "extent_m": EXTENT_M,
                 "severity_pct": SEVERITY, "df_pct": round(df_pct, 2),
                 "upv_base": upv_base, "upv_member": round(upv_scn, 2)},
    "ml": {"class": CLASS, "confidence": round(ml["confidence"], 2), "probabilities": probs,
           "health_score": health},
    "upv_grid": {"rows": grid, "mean": upv_mean, "min": upv_min,
                 "n_doubtful": n_doubtful, "n_doubtful_word": WORD.get(n_doubtful, str(n_doubtful))},
    "inspection": {"components": inspection, "defects": defects, "n_components": n_components,
                   "n_observations": n_observations, "photos": n_observations + 9},
    "maintenance": {"class": CLASS, "intervals_months": mo,
                    "timeline": [{"d": d, "a": a, "col": c} for d, a, c in timeline]},
}
print(json.dumps(OUT, indent=2, default=float))
