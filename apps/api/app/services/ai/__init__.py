"""Provider selection."""

from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.core.logging import logger
from app.services.ai.base import (
    ExplanationProvider,
    GeneratedChapterSummary,
    GeneratedExplanation,
    RelatedVerse,
    VerseContext,
)
from app.services.ai.mock import MockProvider
from app.services.ai.openai_provider import OpenAICompatibleProvider

__all__ = [
    "ExplanationProvider",
    "GeneratedChapterSummary",
    "GeneratedExplanation",
    "MockProvider",
    "OpenAICompatibleProvider",
    "RelatedVerse",
    "VerseContext",
    "get_ai_provider",
]


@lru_cache
def get_ai_provider() -> ExplanationProvider:
    """Resolve the configured provider once per process.

    Falls back to the mock rather than crashing on a missing key: a misconfigured
    deploy should still serve scripture, notes, and favorites.
    """
    if settings.ai_provider == "openai":
        if not settings.ai_api_key:
            logger.warning("AI_PROVIDER=openai but AI_API_KEY is unset — using the mock provider.")
            return MockProvider()
        return OpenAICompatibleProvider(api_key=settings.ai_api_key)
    return MockProvider()
