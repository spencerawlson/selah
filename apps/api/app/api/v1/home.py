"""The Home screen's data.

A curated shelf, not an algorithm. The featured list lives in the seed file
(`data/seed/bible.json` → `featured`) so an editor can change what the app
opens on without a deploy.
"""

from __future__ import annotations

import json
from datetime import date
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.api.deps import SessionDep
from app.core.errors import AppError
from app.core.logging import logger
from app.schemas.bible import VerseRead
from app.services import bible_service

router = APIRouter(tags=["home"])

_SEED = Path(__file__).resolve().parents[3] / "data" / "seed" / "bible.json"


class FeaturedVerse(BaseModel):
    label: str
    verse: VerseRead


class TodayResponse(BaseModel):
    date: date
    verse_of_the_day: FeaturedVerse | None
    featured: list[FeaturedVerse]


@lru_cache
def _featured_entries() -> list[dict[str, str]]:
    if not _SEED.exists():  # pragma: no cover
        return []
    return json.loads(_SEED.read_text(encoding="utf-8")).get("featured", [])


@router.get("/today", response_model=TodayResponse, summary="Home screen content")
async def today(
    session: SessionDep,
    translation: str = Query(default=bible_service.DEFAULT_TRANSLATION, max_length=16),
) -> TodayResponse:
    """Verse of the day plus the curated shelf.

    The daily verse rotates by ordinal date, so it is stable for everyone on a
    given day and needs no scheduled job or extra table.
    """
    entries = _featured_entries()
    resolved: list[FeaturedVerse] = []

    for entry in entries:
        try:
            verse = await bible_service.get_verse_by_reference(
                session, entry["reference"], translation_code=translation
            )
        except AppError:
            # A curated reference outside the seeded subset should dim the shelf,
            # not break the home screen.
            logger.warning("Featured reference %r is not loaded — skipping.", entry["reference"])
            continue
        resolved.append(FeaturedVerse(label=entry["label"], verse=VerseRead.model_validate(verse)))

    today_ = date.today()
    daily = resolved[today_.toordinal() % len(resolved)] if resolved else None
    return TodayResponse(date=today_, verse_of_the_day=daily, featured=resolved)
