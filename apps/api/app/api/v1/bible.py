"""Bible reading endpoints — books, chapters, verses, search."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import PageParams, SessionDep
from app.models.bible import Testament
from app.schemas.bible import (
    BookRead,
    ChapterRead,
    ChapterWithBook,
    TranslationRead,
    VerseRead,
)
from app.schemas.common import Page
from app.services import bible_service

router = APIRouter(tags=["bible"])

# Module-level singletons: calling Query() inline in a signature evaluates it
# once at import anyway, and defining it here keeps the signatures readable.
_TranslationQuery = Query(
    default=bible_service.DEFAULT_TRANSLATION,
    max_length=16,
    description="Translation code, e.g. WEB.",
)
_TestamentQuery = Query(default=None, description="Filter to one testament.")
_ReferenceQuery = Query(description="A human reference, e.g. 'John 3:16'.", examples=["John 3:16"])
_SearchQuery = Query(min_length=2, max_length=200, description="Search term.")


@router.get("/translations", response_model=list[TranslationRead], summary="List translations")
async def list_translations(session: SessionDep) -> list[TranslationRead]:
    rows = await bible_service.list_translations(session)
    return [TranslationRead.model_validate(row) for row in rows]


@router.get("/books", response_model=list[BookRead], summary="List books")
async def list_books(
    session: SessionDep,
    testament: Testament | None = _TestamentQuery,
) -> list[BookRead]:
    rows = await bible_service.list_books(session, testament=testament)
    return [BookRead.model_validate(row) for row in rows]


@router.get("/books/{book_id}", response_model=BookRead, summary="Get one book")
async def get_book(session: SessionDep, book_id: str) -> BookRead:
    """`book_id` accepts a numeric id or a slug (`3` or `john`)."""
    return BookRead.model_validate(await bible_service.get_book(session, book_id))


@router.get(
    "/books/{book_id}/chapters",
    response_model=list[ChapterRead],
    summary="List a book's chapters",
)
async def list_chapters(session: SessionDep, book_id: str) -> list[ChapterRead]:
    _, chapters = await bible_service.list_chapters(session, book_id)
    return [ChapterRead.model_validate(row) for row in chapters]


@router.get("/chapters/{chapter_id}", response_model=ChapterWithBook, summary="Get one chapter")
async def get_chapter(session: SessionDep, chapter_id: int) -> ChapterWithBook:
    chapter = await bible_service.get_chapter(session, chapter_id)
    book = await bible_service.get_book(session, str(chapter.book_id))
    return ChapterWithBook(
        **ChapterRead.model_validate(chapter).model_dump(),
        book_name=book.name,
        book_slug=book.slug,
    )


@router.get(
    "/chapters/{chapter_id}/verses",
    response_model=list[VerseRead],
    summary="Read a chapter",
)
async def list_verses(
    session: SessionDep,
    chapter_id: int,
    translation: str = _TranslationQuery,
) -> list[VerseRead]:
    rows = await bible_service.list_verses(session, chapter_id, translation_code=translation)
    return [VerseRead.model_validate(row) for row in rows]


@router.get("/verses/{verse_id}", response_model=VerseRead, summary="Get one verse")
async def get_verse(session: SessionDep, verse_id: int) -> VerseRead:
    return VerseRead.model_validate(await bible_service.get_verse(session, verse_id))


@router.get("/verses", response_model=VerseRead, summary="Look up a verse by reference")
async def get_verse_by_reference(
    session: SessionDep,
    reference: str = _ReferenceQuery,
    translation: str = _TranslationQuery,
) -> VerseRead:
    verse = await bible_service.get_verse_by_reference(
        session, reference, translation_code=translation
    )
    return VerseRead.model_validate(verse)


@router.get("/search", response_model=Page[VerseRead], summary="Keyword search")
async def search(
    session: SessionDep,
    page: PageParams,
    q: str = _SearchQuery,
    translation: str = _TranslationQuery,
) -> Page[VerseRead]:
    rows, total = await bible_service.search_verses(
        session, q, translation_code=translation, limit=page.limit, offset=page.offset
    )
    return Page[VerseRead](
        items=[VerseRead.model_validate(row) for row in rows],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )
