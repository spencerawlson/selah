"""Verse explanations: resolve → cache lookup → generate → persist.

The cache is the whole business model. Explanations cost money to generate and
almost never change, and readers cluster hard on the same few hundred verses, so
the second request for John 3:16 must never hit the model.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import UpstreamError
from app.core.logging import logger
from app.models.bible import Book, Chapter, Translation, Verse
from app.models.study import Explanation
from app.services import bible_service
from app.services.ai import VerseContext, get_ai_provider
from app.services.ai.base import ExplanationProvider


async def _resolve_verse(
    session: AsyncSession,
    *,
    verse_id: int | None,
    reference: str | None,
    translation_code: str,
) -> Verse:
    if verse_id is not None:
        return await bible_service.get_verse(session, verse_id)
    # The request schema guarantees exactly one of the two is set.
    return await bible_service.get_verse_by_reference(
        session, reference or "", translation_code=translation_code
    )


async def _find_cached(
    session: AsyncSession, verse_id: int, tone: str, model: str
) -> Explanation | None:
    return await session.scalar(
        select(Explanation).where(
            Explanation.verse_id == verse_id,
            Explanation.tone == tone,
            Explanation.model == model,
        )
    )


async def _build_context(session: AsyncSession, verse: Verse) -> VerseContext:
    """Gather everything the provider needs, including neighbouring verses."""
    chapter = await session.get(Chapter, verse.chapter_id)
    book = await session.get(Book, chapter.book_id) if chapter else None
    translation = await session.get(Translation, verse.translation_id)
    return VerseContext(
        reference=verse.reference,
        text=verse.text,
        book_name=book.name if book else "",
        chapter_number=chapter.number if chapter else 0,
        verse_number=verse.number,
        translation_code=translation.code if translation else "",
        surrounding_text=await bible_service.get_surrounding_text(session, verse),
    )


async def explain_verse(
    session: AsyncSession,
    *,
    verse_id: int | None = None,
    reference: str | None = None,
    translation_code: str = bible_service.DEFAULT_TRANSLATION,
    tone: str = "plain",
    language: str = "en",
    refresh: bool = False,
    provider: ExplanationProvider | None = None,
) -> tuple[Explanation, Verse, bool]:
    """Return `(explanation, verse, was_cached)`."""
    provider = provider or get_ai_provider()
    verse = await _resolve_verse(
        session, verse_id=verse_id, reference=reference, translation_code=translation_code
    )
    # Cache per language by tagging the model key, so English and French never collide.
    cache_model = provider.model if language == "en" else f"{provider.model} ({language})"

    if not refresh:
        cached = await _find_cached(session, verse.id, tone, cache_model)
        if cached is not None:
            return cached, verse, True

    generated = await provider.explain(
        await _build_context(session, verse), tone=tone, language=language
    )

    existing = await _find_cached(session, verse.id, tone, cache_model)
    if existing is not None:
        # The `refresh=True` path. Overwrite in place so the id stays stable.
        existing.summary = generated.summary
        existing.meaning = generated.meaning
        existing.context = generated.context
        existing.application = generated.application
        existing.related_verses = [r.model_dump() for r in generated.related_verses]
        await session.flush()
        return existing, verse, False

    explanation = Explanation(
        verse_id=verse.id,
        tone=tone,
        model=cache_model,
        summary=generated.summary,
        meaning=generated.meaning,
        context=generated.context,
        application=generated.application,
        related_verses=[r.model_dump() for r in generated.related_verses],
    )
    try:
        # A savepoint, so losing a race does not roll back the caller's work.
        async with session.begin_nested():
            session.add(explanation)
    except IntegrityError:
        logger.info("Explanation race on verse %s — serving the winning row.", verse.id)
        winner = await _find_cached(session, verse.id, tone, cache_model)
        if winner is None:  # pragma: no cover - the unique constraint says this cannot happen
            raise UpstreamError("Could not store the generated explanation.") from None
        return winner, verse, True

    return explanation, verse, False


async def summarize_chapter(
    session: AsyncSession,
    chapter_id: int,
    *,
    translation_code: str = bible_service.DEFAULT_TRANSLATION,
    refresh: bool = False,
    provider: ExplanationProvider | None = None,
) -> Chapter:
    """Generate and cache a plain-language chapter summary on the chapter row."""
    provider = provider or get_ai_provider()
    chapter = await bible_service.get_chapter(session, chapter_id)
    if chapter.summary and not refresh:
        return chapter

    book = await session.get(Book, chapter.book_id)
    verses = await bible_service.list_verses(session, chapter_id, translation_code=translation_code)
    generated = await provider.summarize_chapter(
        book.name if book else "", chapter.number, [f"{v.number}. {v.text}" for v in verses]
    )
    chapter.summary = generated.summary
    await session.flush()
    return chapter
