"""Async engine, session factory, and the FastAPI session dependency."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.logging import logger

engine = create_async_engine(
    settings.database_url,
    echo=settings.db_echo,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # keep ORM objects usable after commit in request handlers
    autoflush=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Request-scoped session.

    Commits on success, rolls back on any exception. Handlers should not have to
    think about transactions for the common case.
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create the schema if it is missing.

    `create_all` is the right tool for a scaffold and for tests. Introduce
    Alembic the moment you have data you cannot drop.
    """
    # Importing the package registers every model on Base.metadata.
    from app.db.base import Base
    from app.models import Base as _  # noqa: F401

    async with engine.begin() as conn:
        if settings.is_postgres:
            # pgvector must exist before a Vector column can be created.
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database ready (%s)", engine.url.render_as_string(hide_password=True))


async def dispose_db() -> None:
    await engine.dispose()
