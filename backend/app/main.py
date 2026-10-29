"""BridgeLife Studio -- FastAPI backend (local sidecar).

Runs on loopback; the Electron shell spawns it and the React renderer calls it.
CORS is open to localhost for dev. Every engineering value returned here is a
study-level estimate to be verified against the actual IRC/IS codes.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.stages import router as stages_router

app = FastAPI(
    title="BridgeLife Studio API",
    description="Compute backend for the PSC I-girder bridge lifecycle studio.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only; tighten for packaged app
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stages_router, prefix="/api")


@app.get("/health", tags=["meta"])
def health():
    engines = {"analytical": True, "openseespy": False}
    try:
        import openseespy.opensees  # noqa: F401
        engines["openseespy"] = True
    except Exception:
        pass
    return {"status": "ok", "version": "0.1.0", "engines": engines}


@app.get("/", tags=["meta"])
def root():
    return {"name": "BridgeLife Studio API", "docs": "/docs", "health": "/health"}
