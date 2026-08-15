"""Notes and favorites. Every route is scoped to the signed-in user."""

from __future__ import annotations

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, PageParams, SessionDep
from app.schemas.common import Page
from app.schemas.study import (
    FavoriteCreate,
    FavoriteRead,
    NoteCreate,
    NoteRead,
    NoteUpdate,
)
from app.services import note_service

router = APIRouter(tags=["study"])


# --------------------------------------------------------------------------
# Notes
# --------------------------------------------------------------------------
@router.get("/notes", response_model=Page[NoteRead], summary="List your notes")
async def list_notes(
    session: SessionDep,
    user: CurrentUser,
    page: PageParams,
    verse_id: int | None = Query(default=None, description="Only notes on this verse."),
) -> Page[NoteRead]:
    rows, total = await note_service.list_notes(
        session, user.id, verse_id=verse_id, limit=page.limit, offset=page.offset
    )
    return Page[NoteRead](
        items=[NoteRead.model_validate(row) for row in rows],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.post(
    "/notes",
    response_model=NoteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Write a note",
)
async def create_note(session: SessionDep, user: CurrentUser, payload: NoteCreate) -> NoteRead:
    note = await note_service.create_note(
        session, user.id, body=payload.body, title=payload.title, verse_id=payload.verse_id
    )
    return NoteRead.model_validate(note)


@router.get("/notes/{note_id}", response_model=NoteRead, summary="Get one note")
async def get_note(session: SessionDep, user: CurrentUser, note_id: str) -> NoteRead:
    return NoteRead.model_validate(await note_service.get_note(session, user.id, note_id))


@router.patch("/notes/{note_id}", response_model=NoteRead, summary="Edit a note")
async def update_note(
    session: SessionDep, user: CurrentUser, note_id: str, payload: NoteUpdate
) -> NoteRead:
    note = await note_service.update_note(
        session, user.id, note_id, body=payload.body, title=payload.title
    )
    return NoteRead.model_validate(note)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a note")
async def delete_note(session: SessionDep, user: CurrentUser, note_id: str) -> None:
    await note_service.delete_note(session, user.id, note_id)


# --------------------------------------------------------------------------
# Favorites
# --------------------------------------------------------------------------
@router.get("/favorites", response_model=Page[FavoriteRead], summary="List saved verses")
async def list_favorites(
    session: SessionDep, user: CurrentUser, page: PageParams
) -> Page[FavoriteRead]:
    rows, total = await note_service.list_favorites(
        session, user.id, limit=page.limit, offset=page.offset
    )
    return Page[FavoriteRead](
        items=[FavoriteRead.model_validate(row) for row in rows],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.post(
    "/favorites",
    response_model=FavoriteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Save a verse",
)
async def add_favorite(
    session: SessionDep, user: CurrentUser, payload: FavoriteCreate
) -> FavoriteRead:
    """Idempotent — saving an already-saved verse returns the existing row."""
    favorite = await note_service.add_favorite(session, user.id, payload.verse_id)
    return FavoriteRead.model_validate(favorite)


@router.delete(
    "/favorites/{verse_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unsave a verse",
)
async def remove_favorite(session: SessionDep, user: CurrentUser, verse_id: int) -> None:
    await note_service.remove_favorite(session, user.id, verse_id)
