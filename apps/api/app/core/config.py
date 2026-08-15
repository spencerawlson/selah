"""Application settings.

Every knob the API has is declared here and sourced from the environment, so a
deployment never needs a code change to be reconfigured. See `.env.example` for
the full list with sane local defaults.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- App ---------------------------------------------------------------
    app_name: str = "Selah API"
    environment: Literal["local", "staging", "production"] = "local"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # ---- Database ----------------------------------------------------------
    # Default is a local SQLite file so `uvicorn app.main:app` works with zero
    # setup. `docker compose up` swaps this for Postgres + pgvector via .env.
    database_url: str = "sqlite+aiosqlite:///./selah.db"
    db_echo: bool = False

    # ---- Auth --------------------------------------------------------------
    # The scaffold ships a self-contained JWT provider. Point AUTH_PROVIDER at
    # "firebase" or "supabase" once you wire the real verifier in core/security.
    auth_provider: Literal["local", "firebase", "supabase"] = "local"
    # 32+ bytes, per RFC 7518 for HS256. Replace in every deployed environment.
    jwt_secret: str = "dev-only-insecure-secret-replace-before-deploying"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 60 * 24 * 7

    # ---- AI ----------------------------------------------------------------
    # "mock" returns deterministic, hand-written explanations — no key required,
    # no spend, and the mobile app behaves identically to production.
    ai_provider: Literal["mock", "openai"] = "mock"
    ai_base_url: str = "https://api.openai.com/v1"
    ai_api_key: str | None = None
    ai_model: str = "gpt-4o-mini"
    ai_timeout_seconds: float = 30.0
    ai_embedding_model: str = "text-embedding-3-small"
    ai_embedding_dimensions: int = 1536

    # ---- CORS --------------------------------------------------------------
    # Held as a string, not a list. pydantic-settings JSON-decodes list-typed
    # fields straight from the environment before any validator runs, so
    # `CORS_ORIGINS=http://a,http://b` would raise a JSONDecodeError. Parsing it
    # ourselves keeps the .env format human-friendly.
    cors_origins: str = Field(
        default="http://localhost:8081,http://localhost:19006",
        description="Comma-separated list of allowed origins, or * for any.",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql")


@lru_cache
def get_settings() -> Settings:
    """Cached accessor — import this rather than instantiating Settings()."""
    return Settings()


settings = get_settings()
