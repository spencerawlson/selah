"""Notes and favorites — everything a user creates and owns.

Every function takes `user_id` and filters on it. Ownership is enforced here, in
one layer, rather than trusted to each router.
"""

from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError
from app.models.study import Favorite, Note
from app.services import bible_service


# --------------------------------------------------------------------------
# Notes
# --------------------------------------------------------------------------
async def list_notes(
    session: AsyncSession,
    user_id: str,
    *,
    verse_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Note], int]:
    conditions = [Note.user_id == user_id]
    if verse_id is not None:
        conditions.append(Note.verse_id == verse_id)

    total = await session.scalar(select(func.count()).select_from(Note).where(*conditions)) or 0
    rows = await session.scalars(
        select(Note)
        .where(*conditions)
        .options(selectinload(Note.verse))  # avoids N+1 when rendering the notes list
        .order_by(Note.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(rows), total


async def get_note(session: AsyncSession, user_id: str, note_id: str) -> Note:
    note = await session.scalar(
        select(Note)
        .where(Note.id == note_id, Note.user_id == user_id)
        .options(selectinload(Note.verse))
    )
    if note is None:
        # Same 404 whether it is missing or someone else's — do not leak existence.
        raise NotFoundError("Note not found.")
    return note


async def create_note(
    session: AsyncSession,
    user_id: str,
    *,
    body: str,
    title: str | None = None,
    verse_id: int | None = None,
) -> Note:
    if verse_id is not None:
        await bible_service.get_verse(session, verse_id)  # 404s on a bad anchor

    note = Note(user_id=user_id, body=body, title=title, verse_id=verse_id)
    session.add(note)
    await session.flush()
    await session.refresh(note, attribute_names=["verse"])
    return note


async def update_note(
    session: AsyncSession,
    user_id: str,
    note_id: str,
    *,
    body: str | None = None,
    title: str | None = None,
) -> Note:
    note = await get_note(session, user_id, note_id)
    if body is not None:
        note.body = body
    if title is not None:
        note.title = title
    await session.flush()
    return note


async def delete_note(session: AsyncSession, user_id: str, note_id: str) -> None:
    result = await session.execute(
        delete(Note).where(Note.id == note_id, Note.user_id == user_id)
    )
    if result.rowcount == 0:
        raise NotFoundError("Note not found.")


# --------------------------------------------------------------------------
# Favorites
# --------------------------------------------------------------------------
async def list_favorites(
    session: AsyncSession, user_id: str, *, limit: int = 100, offset: int = 0
) -> tuple[list[Favorite], int]:
    total = (
        await session.scalar(
            select(func.count()).select_from(Favorite).where(Favorite.user_id == user_id)
        )
        or 0
    )
    rows = await session.scalars(
        select(Favorite)
        .where(Favorite.user_id == user_id)
        .options(selectinload(Favorite.verse))
        .order_by(Favorite.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(rows), total


async def add_favorite(session: AsyncSession, user_id: str, verse_id: int) -> Favorite:
    """Idempotent: favoriting twice returns the existing row instead of erroring.

    Double-taps happen. A 409 here would be technically correct and practically
    annoying.
    """
    await bible_service.get_verse(session, verse_id)

    favorite = Favorite(user_id=user_id, verse_id=verse_id)
    try:
        async with session.begin_nested():
            session.add(favorite)
    except IntegrityError:
        existing = await session.scalar(
            select(Favorite)
            .where(Favorite.user_id == user_id, Favorite.verse_id == verse_id)
            .options(selectinload(Favorite.verse))
        )
        if existing is not None:
            return existing
        raise

    await session.flush()
    await session.refresh(favorite, attribute_names=["verse"])
    return favorite


async def remove_favorite(session: AsyncSession, user_id: str, verse_id: int) -> None:
    result = await session.execute(
        delete(Favorite).where(Favorite.user_id == user_id, Favorite.verse_id == verse_id)
    )
    if result.rowcount == 0:
        raise NotFoundError("That verse is not in your favorites.")
