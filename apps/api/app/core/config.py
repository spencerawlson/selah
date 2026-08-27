"""Application settings.

Every knob the API has is declared here and sourced from the environment, so a
deployment never needs a code change to be reconfigured. See `.env.example` for
the full list with sane local defaults.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# The shipped placeholder secret. Safe locally; a hard error to deploy with.
_DEFAULT_JWT_SECRET = "dev-only-insecure-secret-replace-before-deploying"


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
    jwt_secret: str = _DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 60 * 24 * 7

    # ---- Rate limiting -----------------------------------------------------
    # In-memory, per-client-IP throttles on the abuse-prone endpoints. Counts
    # are per process; front one Uvicorn worker per container, or move to a
    # shared store, if you scale out. Disable wholesale for tests.
    rate_limit_enabled: bool = True
    auth_rate_per_minute: int = 10  # sign-in attempts per IP (brute-force guard)
    signup_rate_per_hour: int = 20  # new accounts per IP (spam guard)
    ai_rate_per_minute: int = 30  # verse explanations per IP (cost guard)

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

    @property
    def docs_enabled(self) -> bool:
        """Interactive API docs (/docs, /redoc, /openapi.json) — off in production."""
        return self.environment != "production"

    @model_validator(mode="after")
    def _guard_production(self) -> Settings:
        """Fail fast rather than boot a production process with unsafe defaults."""
        if self.environment != "production":
            return self

        problems: list[str] = []
        if self.auth_provider == "local":
            if self.jwt_secret == _DEFAULT_JWT_SECRET:
                problems.append("JWT_SECRET is still the shipped placeholder")
            elif len(self.jwt_secret) < 32:
                problems.append("JWT_SECRET must be at least 32 characters")
        if self.debug:
            problems.append("DEBUG must be false")
        if "*" in self.cors_origin_list:
            problems.append("CORS_ORIGINS must list explicit origins, not '*'")

        if problems:
            raise ValueError(
                "Refusing to start in production with insecure settings: "
                + "; ".join(problems)
                + ". See apps/api/.env.example."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Cached accessor — import this rather than instantiating Settings()."""
    return Settings()


settings = get_settings()
