"""Test fixtures.

Each test gets a fresh in-memory database and an httpx client wired straight to
the ASGI app — no network, no server process, no fixtures left behind.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

# Must be set before app.core.config is imported anywhere.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("AI_PROVIDER", "mock")
os.environ.setdefault("ENVIRONMENT", "local")
# The suite hammers the credential and explanation endpoints on one client IP;
# throttling is exercised by its own test, not left on to make the rest flaky.
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.api.deps import get_session  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.seed import seed_bible, seed_demo_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models import *  # noqa: F401,F403,E402  - registers every table


@pytest.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    # StaticPool keeps every connection pointed at the same in-memory database.
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        await seed_bible(session)
        await seed_demo_user(session)
        await session.commit()

    yield factory
    await engine.dispose()


@pytest.fixture
async def db(session_factory) -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


@pytest.fixture
async def client(session_factory) -> AsyncIterator[AsyncClient]:
    """An API client that shares the test database.

    `lifespan` is not run, so the app never touches the real DATABASE_URL.
    """

    async def _override() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_session] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as http:
        yield http
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_client(client: AsyncClient) -> AsyncClient:
    """A client signed in as a freshly created user."""
    response = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": "reader@example.com",
            "password": "a-good-password",
            "display_name": "Reader",
        },
    )
    assert response.status_code == 201, response.text
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    return client
