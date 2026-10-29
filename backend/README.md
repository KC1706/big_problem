# BridgeLife Studio — Backend (compute sidecar)

FastAPI compute backend for the PSC I-girder bridge lifecycle studio. Wraps
open-source civil/ML libraries behind one API that the Electron + React frontend
(designed via Claude Design) calls over loopback.

> Every engineering value here is a **study-level estimate**. Coefficients and
> code checks must be verified against the actual **IRC/IS** texts (paywalled —
> no clause numbers are invented in this code).

## Stack we build on
- `sectionproperties`, `concreteproperties` — section + prestressed analysis (MIT)
- OpenSeesPy + `opstool` — FE structural/modal engine (optional; **analytical
  engine is the validated fallback**, auto-selected if OpenSeesPy is absent)
- `pyoma-2` — operational modal analysis (GPL-3; backend-only)
- `scikit-learn`, `scipy` — ML + signal processing

## Layout
```
app/
  compute/        engineering core (validated, framework-free)
    materials.py  M45/Fe500/strand material models
    geometry.py   I-girder + composite deck section properties
    engine.py     AnalyticalEngine (modal 1:4:9, deflection, a(t)); make_engine()
    loads.py      IRC dead/SIDL/live load (70R, Class A)
    prestress.py  P0 -> losses -> Pe (friction/ES/creep/shrink/relax); Pe<P0
    ndt.py        UPV & rebound grading (IS bands), SonReb
    synthetic.py  deterioration scenarios -> labelled dataset
    features.py   signal features + FFT spectrum / peak picking
    ml.py         RandomForest classifier + IsolationForest anomaly detector
  models/schemas.py   Pydantic request/response schemas
  routers/stages.py   one endpoint group per lifecycle stage
  main.py             FastAPI app (+ /health reporting available engines)
tests/test_compute.py verification (physics, grading, FFT recovery)
```

## Run
```bash
python3.12 -m venv ../.venv && source ../.venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. pytest -q                      # 7 checks
uvicorn app.main:app --host 127.0.0.1 --port 8077   # docs at /docs
```

## Endpoints (prefix `/api`)
| Stage | Endpoint |
|---|---|
| Config | `POST /config/properties` |
| Analysis | `POST /analysis/run` |
| Prestress | `POST /prestress/compute` |
| Baseline | `POST /baseline/establish` |
| Monitoring | `POST /monitoring/signal` |
| NDT | `POST /ndt/assess` |
| Synthetic | `POST /synthetic/generate` |
| AI/ML | `POST /ml/train`, `POST /ml/predict` |

Meta: `GET /health` (reports which engines are available), `GET /docs`.

## Validated behaviour (33 m span)
- Composite A ≈ 1.11 m², I ≈ 0.476 m⁴, L/d ≈ 19.4, self-weight ≈ 28 kN/m
- f₁ ≈ 3.54 Hz (near the problem's 3.2 Hz example); modes in ratio 1:4:9
- 15 % EI loss → 7.8 % frequency drop (= √0.85); deflection rises accordingly
- Prestress Pₑ < P₀ guaranteed; transparent loss breakdown
- Synthetic conditions separate cleanly (f₁ 3.52→2.96 Hz, UPV 4.34→3.01 across
  Healthy→Severe); RF importances are physically sensible (f₁, f₂, δ, ε top)

## Honest notes
- The analytical beam gives modes 1:4:9. A real slab-girder deck shows tighter
  spacing (bending+torsion) like the problem's 3.2/5.85/8.4 — that needs the
  OpenSeesPy grillage/FE engine (`make_engine(..., kind="openseespy")`).
- Synthetic-data classifier accuracy is high because classes are separable by
  construction; the value is the **interpretation**, not the number (the
  problem explicitly rewards reasoning over accuracy).
