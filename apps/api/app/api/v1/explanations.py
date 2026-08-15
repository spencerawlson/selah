"""AI explanation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query, status

from app.api.deps import OptionalUser, SessionDep
from app.schemas.bible import ChapterRead, VerseRead
from app.schemas.study import ExplanationRead, ExplanationRequest, ExplanationWithVerse
from app.services import explanation_service

router = APIRouter(tags=["explanations"])


@router.post(
    "/verse-explanations",
    response_model=ExplanationWithVerse,
    status_code=status.HTTP_200_OK,
    summary="Explain a verse",
)
async def create_verse_explanation(
    session: SessionDep,
    payload: ExplanationRequest,
    user: OptionalUser,
) -> ExplanationWithVerse:
    """Return a structured explanation of one verse.

    POST rather than GET because generation is a side-effecting, billable
    operation — but it is cached, so repeat calls are cheap and return
    `cached: true`.

    Reading is open to anonymous users on purpose: someone should be able to
    understand a verse before they make an account. `user` is threaded through
    so per-account quotas and the premium tier have somewhere to land.
    """
    # TODO(premium): free tier gets N explanations/day; `user.is_premium` lifts it.
    explanation, verse, cached = await explanation_service.explain_verse(
        session,
        verse_id=payload.verse_id,
        reference=payload.reference,
        translation_code=payload.translation_code,
        tone=payload.tone,
        refresh=payload.refresh,
    )
    # Build from the flat read model, then attach the verse we already loaded —
    # touching `explanation.verse` here would trigger a lazy load under asyncio.
    base = ExplanationRead.model_validate(explanation)
    return ExplanationWithVerse(
        **base.model_dump(exclude={"cached"}),
        cached=cached,
        verse=VerseRead.model_validate(verse),
    )


@router.post(
    "/chapters/{chapter_id}/summary",
    response_model=ChapterRead,
    summary="Summarise a chapter",
)
async def create_chapter_summary(
    session: SessionDep,
    chapter_id: int,
    user: OptionalUser,
    refresh: bool = Query(default=False, description="Regenerate instead of using the cache."),
) -> ChapterRead:
    """Generate (and cache on the chapter) a plain-language summary."""
    chapter = await explanation_service.summarize_chapter(session, chapter_id, refresh=refresh)
    return ChapterRead.model_validate(chapter)
