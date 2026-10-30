"""Pydantic request/response schemas shared across routers.

These mirror the slices of the .bridgeproj project model. The section config is
the single source of truth that every downstream stage consumes.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ---- configuration ---------------------------------------------------------
class GirderIn(BaseModel):
    bf_bot: float = 600.0
    tf_bot: float = 250.0
    h_fillet_bot: float = 150.0
    tw: float = 200.0
    hw: float = 950.0
    h_fillet_top: float = 150.0
    bf_top: float = 500.0
    tf_top: float = 200.0


class SectionConfig(BaseModel):
    span: float = Field(33000.0, description="span in mm (30000/33000/36000)")
    girder_spacing: float = 2500.0
    deck_thickness: float = 230.0
    n_girders: int = 5
    carriageway_width: float = 11.0
    girder: GirderIn = Field(default_factory=GirderIn)
    fck_girder: float = 45.0
    fck_deck: float = 40.0


class SectionProperties(BaseModel):
    A: float
    I: float
    y_bot: float
    y_top: float
    Z_bot: float
    Z_top: float
    depth: float
    girder_depth: float
    span_depth_ratio: float
    self_weight_kN_m: float
    mass_kg_m: float
    effective_width: float
    warnings: List[str] = []


# ---- analysis --------------------------------------------------------------
class AnalysisRequest(BaseModel):
    section: SectionConfig
    live_load: str = Field("70R", description="70R, ClassA, or 70R+A")
    distribution: str = Field("Courbon", description="Courbon or Grillage")
    barrier_kN_m: float = 20.0
    footpath_kN_m2: float = 5.0
    ei_factor: float = 1.0


class AnalysisResponse(BaseModel):
    dead_load_kN_m: float
    sidl_kN_m: float
    live_load_udl_kN_m: float
    impact_factor: float
    moment_mid_kNm: float
    moment_dead_kNm: float
    moment_live_kNm: float
    shear_end_kN: float
    sigma_top: float
    sigma_bot: float
    deflection_mm: float
    deflection_limit_mm: float


# ---- prestress -------------------------------------------------------------
class PrestressRequest(BaseModel):
    section: SectionConfig
    n_cables: int = 6
    strands_per_cable: int = 12
    duct_dia: float = 90.0
    e_mid: float = 650.0
    mu: float = 0.17
    K: float = 0.0020
    anchorage_slip: float = 6.0
    jack_fraction: Optional[float] = Field(
        None, description="jacking stress as a fraction of fpk (e.g. 0.75); default uses fp0")


class PrestressResponse(BaseModel):
    P0_kN: float
    Pe_kN: float
    sigma_p0: float
    sigma_pe: float
    loss_percent: float
    pe_lt_p0: bool
    losses: Dict[str, float]
    Ap_mm2: float
    camber_mm: float
    sigma_bot_transfer: float
    sigma_bot_service: float


# ---- baseline / modal ------------------------------------------------------
class ModalResponse(BaseModel):
    frequencies: List[float]
    mode_shape_x: List[float]
    mode_shapes: List[List[float]]
    engine: str


class BaselineRequest(BaseModel):
    section: SectionConfig
    engine: str = Field("analytical", description="analytical or openseespy")
    ec_gpa: Optional[float] = Field(None, description="concrete modulus override, GPa")
    mass_mode: str = Field("incl", description="incl (SIDL mass) or struct")
    zeta: float = 2.0


class BaselineResponse(BaseModel):
    fingerprint: Dict[str, float]
    modal: ModalResponse
    mass_per_girder_kg_m: float
    EI_composite_GNm2: float
    damping_percent: float


# ---- geometry mesh (3D frontend) -------------------------------------------
class MeshNode(BaseModel):
    id: int
    x: float
    y: float
    z: float


class MeshElement(BaseModel):
    id: int
    n1: int
    n2: int


class ModeVectors(BaseModel):
    mode: int
    frequency: float
    node_disp: List[List[float]]  # per node [dx, dy, dz], peak-normalised


class GeometryMeshResponse(BaseModel):
    span: float                       # m, along x
    depth: float                      # m, girder + deck
    nodes: List[MeshNode]             # beam nodes on the neutral axis
    elements: List[MeshElement]       # line connectivity between consecutive nodes
    girder_polygon: List[List[float]]  # (z, y) outline, m, extruded along x
    deck_polygon: List[List[float]]    # (z, y) deck slab outline, m
    modes: List[ModeVectors]
    engine: str


# ---- monitoring / signal ---------------------------------------------------
class SignalRequest(BaseModel):
    section: SectionConfig
    duration: float = 30.0
    fs: float = 200.0
    sensor_x_frac: float = 0.3333
    ei_factor: float = 1.0           # damage knob (stiffness reduction); 1.0 = healthy
    noise_frac: float = 0.03
    excitation: str = "ambient"
    seed: Optional[int] = 1
    # structural assumptions -- must match the Baseline stage so the measured
    # spectrum resonates at the same modal frequencies as the baseline fingerprint.
    ec_gpa: Optional[float] = None
    mass_mode: str = "incl"
    zeta: float = 2.0
    engine: str = Field("openseespy", description="structural model; must match Baseline")


class SignalResponse(BaseModel):
    t: List[float]
    a: List[float]
    sensor_x: float
    spectrum_freq: List[float]
    spectrum_mag: List[float]
    dominant_frequencies: List[float]
    features: Dict[str, float]


# ---- NDT -------------------------------------------------------------------
class NDTReadingIn(BaseModel):
    location: str
    upv: float
    rebound: float


class NDTRequest(BaseModel):
    readings: List[NDTReadingIn]


# ---- synthetic -------------------------------------------------------------
class SyntheticRequest(BaseModel):
    section: SectionConfig
    n_per_condition: int = 60
    duration: float = 20.0
    fs: float = 200.0
    service_udl_kN_m: float = 45.0
    noise_frac: float = 0.04
    seed: Optional[int] = 42
    # damage-scenario controls (drive the live preview and class separation)
    mechanisms: List[str] = Field(default_factory=list)
    location: float = 0.5
    extent_m: float = 6.0
    severity_pct: float = 35.0
    preview_only: bool = True  # live preview (fast); False = generate the full ML dataset
    engine: str = Field("openseespy", description="structural model; must match Baseline")


class FeaturesRequest(BaseModel):
    section: SectionConfig
    n_per_condition: int = 50   # modest sample -> stable statistics, responsive
    duration: float = 12.0
    fs: float = 200.0
    noise_frac: float = 0.04
    seed: Optional[int] = 42
    engine: str = Field("openseespy", description="structural model; must match Baseline")


# ---- ML --------------------------------------------------------------------
class MLTrainRequest(BaseModel):
    rows: List[Dict[str, float]]
    labels: List[str]
    feature_order: List[str]
    model_kind: str = "RandomForest"
    n_estimators: int = 300


class MLPredictRequest(BaseModel):
    rows: List[Dict[str, float]]
    labels: List[str]
    feature_order: List[str]
    feature_vector: Dict[str, float]


class MLPipelineRequest(BaseModel):
    """Self-contained AI/ML stage: generate a labelled dataset, train the chosen
    model, and predict the live feature vector -- all in one call."""
    section: SectionConfig
    model: str = "Random Forest"          # Random Forest | XGBoost | IsoForest
    split: float = 0.8                     # train fraction
    n_estimators: int = 300
    df_pct: float = -8.4                   # live Δf1 (%) from the prediction sliders
    delta_mm: float = 24.9                 # live mid-span deflection (mm)
    upv: float = 3.71                      # live UPV (km/s)
    n_per_condition: int = 50
    noise_frac: float = 0.04
    seed: Optional[int] = 42
    engine: str = Field("openseespy", description="structural model; must match Baseline")
