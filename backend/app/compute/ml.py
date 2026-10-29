"""AI/ML condition assessment: supervised classifier + unsupervised anomaly
detection, with interpretable feature importances.

Research-backed choices: Random Forest (and optional gradient boosting) perform
well on SHM tabular features and give feature importances; Isolation Forest
trained only on healthy data addresses the real-world scarcity of labelled
damage. The point is not raw accuracy but a physically reasonable, explainable
result -- so importances and per-feature reasoning are first-class outputs.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


@dataclass
class TrainResult:
    model_kind: str
    accuracy: float
    classes: List[str]
    confusion: List[List[int]]
    feature_importance: Dict[str, float]
    n_train: int
    n_test: int


def _matrix(rows: List[Dict[str, float]], feature_order: List[str]) -> np.ndarray:
    return np.asarray([[r[f] for f in feature_order] for r in rows], dtype=float)


def train_classifier(
    rows: List[Dict[str, float]],
    labels: List[str],
    feature_order: List[str],
    *,
    n_estimators: int = 300,
    test_size: float = 0.25,
    seed: int = 0,
) -> Dict[str, object]:
    X = _matrix(rows, feature_order)
    y = np.asarray(labels)
    Xtr, Xte, ytr, yte = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )
    clf = RandomForestClassifier(n_estimators=n_estimators, random_state=seed)
    clf.fit(Xtr, ytr)
    acc = float(clf.score(Xte, yte))
    classes = list(clf.classes_)
    cm = confusion_matrix(yte, clf.predict(Xte), labels=classes).tolist()
    importance = {f: float(w) for f, w in zip(feature_order, clf.feature_importances_)}
    importance = dict(sorted(importance.items(), key=lambda kv: -kv[1]))
    result = TrainResult(
        model_kind="RandomForest", accuracy=acc, classes=classes,
        confusion=cm, feature_importance=importance,
        n_train=len(ytr), n_test=len(yte),
    )
    return {"result": result, "model": clf, "feature_order": feature_order}


def train_anomaly_detector(
    rows: List[Dict[str, float]],
    labels: List[str],
    feature_order: List[str],
    healthy_label: str = "Healthy",
    contamination: float = 0.05,
    seed: int = 0,
) -> Dict[str, object]:
    """Isolation Forest trained ONLY on healthy records (output-only style)."""
    X = _matrix(rows, feature_order)
    y = np.asarray(labels)
    scaler = StandardScaler().fit(X[y == healthy_label])
    Xh = scaler.transform(X[y == healthy_label])
    iso = IsolationForest(contamination=contamination, random_state=seed)
    iso.fit(Xh)
    # anomaly score for all records (higher = more anomalous)
    scores = -iso.score_samples(scaler.transform(X))
    return {
        "model": iso, "scaler": scaler, "feature_order": feature_order,
        "scores": scores.tolist(), "labels": labels,
        "threshold": float(np.quantile(-iso.score_samples(Xh), 1 - contamination)),
    }


def predict_condition(bundle: Dict[str, object], feature_vector: Dict[str, float]) -> Dict[str, object]:
    clf = bundle["model"]
    feature_order = bundle["feature_order"]
    x = np.asarray([[feature_vector[f] for f in feature_order]], dtype=float)
    pred = clf.predict(x)[0]
    proba = {c: float(p) for c, p in zip(clf.classes_, clf.predict_proba(x)[0])}
    return {"prediction": str(pred), "probabilities": proba}


# physical meaning of each feature -- shown in the interpretation panel
FEATURE_MEANING: Dict[str, str] = {
    "f1": "1st bending natural frequency; drops as global stiffness is lost.",
    "f2": "2nd mode frequency; sensitive to stiffness distribution/asymmetry.",
    "f3": "3rd mode frequency; higher modes react to local stiffness loss.",
    "a_rms": "RMS acceleration; overall vibration energy under service excitation.",
    "a_max": "Peak acceleration; transient/impact sensitivity.",
    "kurtosis": "Signal peakedness; rises with impulsive damage-related events.",
    "delta_max": "Mid-span deflection; increases as EI falls (stiffness loss).",
    "eps_max": "Peak strain; tracks curvature/stress demand.",
    "upv": "Ultrasonic pulse velocity; falls with cracking/porosity (concrete quality).",
    "rebound": "Rebound number; surface hardness/strength indicator.",
}
