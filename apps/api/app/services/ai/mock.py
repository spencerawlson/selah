"""Offline explanation provider — the default.

Two reasons this exists and is the default:

1. A new contributor can clone, run, and see the real product loop without an
   API key or a cent of spend.
2. Tests need deterministic output.

For the seeded verses it serves hand-written explanations from
`data/seed/explanations.json` (so the demo reads like the finished product); for
anything else it composes an honest, obviously-placeholder response.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.services.ai.base import (
    GeneratedChapterSummary,
    GeneratedExplanation,
    RelatedVerse,
    VerseContext,
)

_SEED_PATH = Path(__file__).resolve().parents[3] / "data" / "seed" / "explanations.json"


@lru_cache
def _curated() -> dict[str, dict]:
    """Hand-written explanations keyed by "<reference>|<tone>"."""
    if not _SEED_PATH.exists():  # pragma: no cover - only if seed data is removed
        return {}
    raw = json.loads(_SEED_PATH.read_text(encoding="utf-8"))
    return {f"{item['reference']}|{item.get('tone', 'plain')}": item for item in raw}


class MockProvider:
    """Deterministic, key-free `ExplanationProvider`."""

    name = "mock"
    model = "mock-1"

    async def explain(self, verse: VerseContext, tone: str = "plain") -> GeneratedExplanation:
        curated = _curated().get(f"{verse.reference}|{tone}") or _curated().get(
            f"{verse.reference}|plain"
        )
        if curated:
            return GeneratedExplanation(
                summary=curated["summary"],
                meaning=curated["meaning"],
                context=curated["context"],
                application=curated["application"],
                related_verses=[RelatedVerse(**r) for r in curated.get("related_verses", [])],
            )
        return self._placeholder(verse)

    async def summarize_chapter(
        self, book_name: str, chapter_number: int, verses: list[str]
    ) -> GeneratedChapterSummary:
        opening = verses[0] if verses else ""
        return GeneratedChapterSummary(
            summary=(
                f"{book_name} {chapter_number} runs to {len(verses)} verses, opening with "
                f"“{opening[:120].strip()}…” "
                "Set AI_PROVIDER=openai for a generated summary."
            ),
            themes=["Sample summary", "Offline mode"],
        )

    @staticmethod
    def _placeholder(verse: VerseContext) -> GeneratedExplanation:
        """Never pretends to be a real explanation — that would be worse than nothing."""
        return GeneratedExplanation(
            summary=f"A sample explanation of {verse.reference}, generated offline.",
            meaning=(
                f"The offline provider does not interpret scripture. {verse.reference} reads: "
                f"“{verse.text}” Set AI_PROVIDER=openai and supply AI_API_KEY to get a "
                "real explanation."
            ),
            context=(
                f"{verse.book_name} chapter {verse.chapter_number}, verse {verse.verse_number}, "
                f"in the {verse.translation_code} translation."
            ),
            application=(
                "Read the verse slowly twice, then write one line in Notes about what stands out."
            ),
            related_verses=[],
        )
