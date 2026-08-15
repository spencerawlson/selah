"""Selah API entrypoint.

    uvicorn app.main:app --reload

Docs live at /docs. The health check is mounted at both `/health` (for
platform probes, which rarely let you configure a path prefix) and
`/api/v1/health`.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import health
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.db.session import dispose_db, init_db
from app.schemas.common import ErrorResponse

DESCRIPTION = """\
The API behind **Selah** — read scripture, and understand it.

* `POST /api/v1/verse-explanations` returns a structured explanation of any verse:
  summary, meaning, context, application, and related verses.
* Explanations are cached per (verse, tone, model), so repeat reads are free.
* Set `AI_PROVIDER=mock` (the default) to run the whole product with no API key.
"""


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger = configure_logging(settings.debug)
    logger.info("Starting %s in %s mode", settings.app_name, settings.environment)

    # Fine for a scaffold and for tests. Swap for Alembic migrations run as a
    # release step once you have data you cannot afford to drop.
    await init_db()
    yield
    await dispose_db()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.app_name,
    description=DESCRIPTION,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Unprefixed probe endpoint for load balancers and container health checks.
app.include_router(health.router)
# Everything else is versioned.
app.include_router(health.router, prefix=settings.api_v1_prefix, include_in_schema=False)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }
