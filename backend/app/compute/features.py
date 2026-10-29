"""Feature extraction from vibration signals and assembled feature vectors.

Time-domain features (mean, RMS, peak, kurtosis, crest factor) and frequency-
domain features (dominant peaks via FFT). Kept simple and interpretable -- the
problem rewards physically meaningful features over black-box complexity.
"""
from __future__ import annotations

from typing import Dict, List

import numpy as np
from numpy.fft import rfft, rfftfreq
from scipy.stats import kurtosis as sp_kurtosis


def signal_features(a: np.ndarray, fs: float) -> Dict[str, float]:
    a = np.asarray(a, dtype=float)
    a0 = a - a.mean()
    rms = float(np.sqrt(np.mean(a0 ** 2)))
    peak = float(np.max(np.abs(a0)))
    return {
        "a_rms": rms,
        "a_max": peak,
        "kurtosis": float(sp_kurtosis(a0, fisher=True, bias=False)) if a0.std() > 0 else 0.0,
        "crest_factor": peak / rms if rms > 0 else 0.0,
    }


def dominant_frequencies(a: np.ndarray, fs: float, n_peaks: int = 3,
                         fmax: float = 50.0) -> List[float]:
    """Pick the strongest spectral peaks from the one-sided FFT (Hz)."""
    a0 = np.asarray(a, dtype=float)
    a0 = a0 - a0.mean()
    spec = np.abs(rfft(a0))
    freq = rfftfreq(len(a0), 1.0 / fs)
    mask = freq <= fmax
    spec, freq = spec[mask], freq[mask]
    # simple local-maxima peak pick
    idx = np.argsort(spec)[::-1]
    peaks: List[float] = []
    for i in idx:
        f = float(freq[i])
        if all(abs(f - p) > 0.5 for p in peaks):  # min 0.5 Hz separation
            peaks.append(f)
        if len(peaks) >= n_peaks:
            break
    return sorted(peaks)


def spectrum(a: np.ndarray, fs: float, fmax: float = 50.0) -> Dict[str, List[float]]:
    """Return (freq, magnitude) for plotting the FFT spectrum."""
    a0 = np.asarray(a, dtype=float)
    a0 = a0 - a0.mean()
    spec = np.abs(rfft(a0)) / len(a0)
    freq = rfftfreq(len(a0), 1.0 / fs)
    mask = freq <= fmax
    return {"freq": list(freq[mask]), "mag": list(spec[mask])}
