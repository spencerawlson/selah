"""Assembles the v1 API surface.

Adding a feature means adding one module here — `main.py` never changes.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, bible, explanations, home, notes

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(home.router)
api_router.include_router(bible.router)
api_router.include_router(explanations.router)
api_router.include_router(notes.router)
