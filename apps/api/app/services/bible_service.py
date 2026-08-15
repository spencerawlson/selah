"""Read access to Bible content.

Routers stay thin: they validate input and hand off here. Every query lives in
one place so caching or a read replica is a single-file change later.
"""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.models.bible import Book, Chapter, Testament, Translation, Verse
from app.services.reference import parse_reference, slugify

DEFAULT_TRANSLATION = "WEB"


# --------------------------------------------------------------------------
# Translations
# --------------------------------------------------------------------------
async def list_translations(session: AsyncSession) -> list[Translation]:
    result = await session.scalars(select(Translation).order_by(Translation.code))
    return list(result)


async def get_translation(session: AsyncSession, code: str) -> Translation:
    translation = await session.scalar(select(Translation).where(Translation.code == code.upper()))
    if translation is None:
        raise NotFoundError(f"Unknown translation '{code}'.")
    return translation


# --------------------------------------------------------------------------
# Books
# --------------------------------------------------------------------------
async def list_books(session: AsyncSession, *, testament: Testament | None = None) -> list[Book]:
    query = select(Book).order_by(Book.position)
    if testament is not None:
        query = query.where(Book.testament == testament)
    return list(await session.scalars(query))


async def get_book(session: AsyncSession, book_id: str) -> Book:
    """Look a book up by numeric id *or* slug.

    The mobile app deep-links by slug ("/read/john/3") while list endpoints hand
    back ids; accepting both here keeps that from leaking into every caller.
    """
    query = select(Book)
    query = (
        query.where(Book.id == int(book_id))
        if book_id.isdigit()
        else query.where(Book.slug == slugify(book_id))
    )
    book = await session.scalar(query)
    if book is None:
        raise NotFoundError(f"No book matching '{book_id}'.")
    return book


# --------------------------------------------------------------------------
# Chapters
# --------------------------------------------------------------------------
async def list_chapters(session: AsyncSession, book_id: str) -> tuple[Book, list[Chapter]]:
    book = await get_book(session, book_id)
    chapters = await session.scalars(
        select(Chapter).where(Chapter.book_id == book.id).order_by(Chapter.number)
    )
    return book, list(chapters)


async def get_chapter(session: AsyncSession, chapter_id: int) -> Chapter:
    chapter = await session.get(Chapter, chapter_id)
    if chapter is None:
        raise NotFoundError(f"No chapter with id {chapter_id}.")
    return chapter


async def get_chapter_by_number(session: AsyncSession, book_id: str, number: int) -> Chapter:
    book = await get_book(session, book_id)
    chapter = await session.scalar(
        select(Chapter).where(Chapter.book_id == book.id, Chapter.number == number)
    )
    if chapter is None:
        raise NotFoundError(f"{book.name} has no chapter {number}.")
    return chapter


# --------------------------------------------------------------------------
# Verses
# --------------------------------------------------------------------------
async def list_verses(
    session: AsyncSession,
    chapter_id: int,
    *,
    translation_code: str = DEFAULT_TRANSLATION,
) -> list[Verse]:
    # Confirm the chapter exists so an empty list means "not seeded yet",
    # not "you asked for something that does not exist".
    await get_chapter(session, chapter_id)
    translation = await get_translation(session, translation_code)
    verses = await session.scalars(
        select(Verse)
        .where(Verse.chapter_id == chapter_id, Verse.translation_id == translation.id)
        .order_by(Verse.number)
    )
    return list(verses)


async def get_verse(session: AsyncSession, verse_id: int) -> Verse:
    verse = await session.get(Verse, verse_id)
    if verse is None:
        raise NotFoundError(f"No verse with id {verse_id}.")
    return verse


async def get_verse_by_reference(
    session: AsyncSession,
    reference: str,
    *,
    translation_code: str = DEFAULT_TRANSLATION,
) -> Verse:
    parsed = parse_reference(reference)
    if parsed is None:
        raise ValidationError(
            f"'{reference}' is not a verse reference. Expected a form like 'John 3:16'."
        )

    translation = await get_translation(session, translation_code)
    slug = slugify(parsed.book_query)
    verse = await session.scalar(
        select(Verse)
        .join(Chapter, Verse.chapter_id == Chapter.id)
        .join(Book, Chapter.book_id == Book.id)
        .where(
            # Accept the slug, the full name, the citation form, or the abbreviation
            # — so "psalms 23:1", "psalm 23:1" and "ps 23:1" all resolve.
            or_(
                Book.slug == slug,
                func.lower(Book.name) == parsed.book_query,
                func.lower(Book.reference_name) == parsed.book_query,
                func.lower(Book.abbreviation) == parsed.book_query,
            ),
            Chapter.number == parsed.chapter,
            Verse.number == parsed.verse,
            Verse.translation_id == translation.id,
        )
    )
    if verse is None:
        raise NotFoundError(f"'{reference}' is not in the {translation.code} data set yet.")
    return verse


async def get_surrounding_text(session: AsyncSession, verse: Verse, *, window: int = 2) -> str:
    """Neighbouring verses, for grounding the AI explanation.

    Explaining a verse without its neighbours is how you get confident nonsense.
    """
    neighbours = await session.scalars(
        select(Verse)
        .where(
            Verse.chapter_id == verse.chapter_id,
            Verse.translation_id == verse.translation_id,
            Verse.number.between(verse.number - window, verse.number + window),
        )
        .order_by(Verse.number)
    )
    return "\n".join(f"{v.number}. {v.text}" for v in neighbours)


async def search_verses(
    session: AsyncSession,
    query: str,
    *,
    translation_code: str = DEFAULT_TRANSLATION,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Verse], int]:
    """Keyword search across verse text and references.

    This is the honest baseline. Semantic search over pgvector embeddings is the
    upgrade path — see `app/models/embedding.py`; it needs Postgres and an
    embedding backfill, so keyword search is what ships on day one.
    """
    term = query.strip()
    if len(term) < 2:
        raise ValidationError("Search needs at least 2 characters.")

    translation = await get_translation(session, translation_code)
    pattern = f"%{term.lower()}%"
    conditions = (
        Verse.translation_id == translation.id,
        or_(
            func.lower(Verse.text).like(pattern),
            func.lower(Verse.reference).like(pattern),
        ),
    )

    total = await session.scalar(select(func.count()).select_from(Verse).where(*conditions)) or 0
    rows = await session.scalars(
        select(Verse).where(*conditions).order_by(Verse.id).limit(limit).offset(offset)
    )
    return list(rows), total
