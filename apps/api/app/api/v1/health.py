"""Liveness and readiness."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.api.deps import SessionDep
from app.core.config import settings
from app.core.logging import logger

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    environment: str
    version: str
    database: str
    ai_provider: str


@router.get("/health", response_model=HealthResponse, summary="Service health")
async def health(session: SessionDep) -> HealthResponse:
    """Report liveness plus the state of each dependency.

    Always 200: a load balancer wants a fast, unambiguous signal, and the body
    says which dependency is unhappy. Gate deploys on `database == "ok"`.
    """
    database = "ok"
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 - the whole point is to report, not raise
        logger.error("Health check: database unreachable: %s", exc)
        database = "unavailable"

    return HealthResponse(
        status="ok" if database == "ok" else "degraded",
        app=settings.app_name,
        environment=settings.environment,
        version="0.1.0",
        database=database,
        ai_provider=settings.ai_provider,
    )
