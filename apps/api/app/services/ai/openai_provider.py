"""OpenAI-compatible provider.

Speaks plain `/chat/completions`, so it works unchanged against OpenAI, Azure
OpenAI, Together, Groq, vLLM, Ollama (`/v1`), and LM Studio. Point `AI_BASE_URL`
wherever you like.

Structured output is enforced twice: once by asking for a JSON schema, and again
by validating the reply with Pydantic. Models drift; validation does not.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import UpstreamError
from app.core.logging import logger
from app.services.ai.base import (
    GeneratedChapterSummary,
    GeneratedExplanation,
    VerseContext,
)
from app.services.ai.prompts import (
    SYSTEM_PROMPT,
    build_chapter_summary_prompt,
    build_explanation_prompt,
)


def _json_schema(model: type, name: str) -> dict[str, Any]:
    """Pydantic → OpenAI `response_format` schema."""
    schema = model.model_json_schema()
    schema["additionalProperties"] = False
    return {
        "type": "json_schema",
        "json_schema": {"name": name, "strict": False, "schema": schema},
    }


class OpenAICompatibleProvider:
    """`ExplanationProvider` backed by any OpenAI-shaped chat endpoint."""

    name = "openai"

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.model = model or settings.ai_model
        self._base_url = (base_url or settings.ai_base_url).rstrip("/")
        self._api_key = api_key
        self._timeout = timeout or settings.ai_timeout_seconds

    async def explain(
        self, verse: VerseContext, tone: str = "plain", language: str = "en"
    ) -> GeneratedExplanation:
        payload = await self._complete(
            user_prompt=build_explanation_prompt(verse, tone, language),
            schema=_json_schema(GeneratedExplanation, "verse_explanation"),
        )
        return GeneratedExplanation.model_validate(payload)

    async def summarize_chapter(
        self, book_name: str, chapter_number: int, verses: list[str]
    ) -> GeneratedChapterSummary:
        payload = await self._complete(
            user_prompt=build_chapter_summary_prompt(book_name, chapter_number, verses),
            schema=_json_schema(GeneratedChapterSummary, "chapter_summary"),
        )
        return GeneratedChapterSummary.model_validate(payload)

    async def _complete(self, *, user_prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
        body = {
            "model": self.model,
            "temperature": 0.3,  # low: this is exposition, not creative writing
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": schema,
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json=body,
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as exc:
            logger.error("AI provider returned %s: %s", exc.response.status_code, exc.response.text)
            raise UpstreamError("The explanation service rejected the request.") from exc
        except httpx.HTTPError as exc:
            logger.error("AI provider unreachable: %s", exc)
            raise UpstreamError("The explanation service is unreachable.") from exc
        except (KeyError, IndexError) as exc:
            raise UpstreamError("The explanation service returned an unexpected shape.") from exc

        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            # Some endpoints ignore response_format and wrap JSON in prose.
            logger.error("AI provider returned non-JSON content: %s", content[:400])
            raise UpstreamError("The explanation service returned malformed output.") from exc
