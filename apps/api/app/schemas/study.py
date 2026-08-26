"""Request/response models for explanations, notes and favorites."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.bible import VerseRead
from app.schemas.common import ORMModel

# The voice the explanation is written in. Kept as a closed set so the prompt
# library stays reviewable — this is doctrine-adjacent text, not free-form chat.
Tone = Literal["plain", "devotional", "scholarly", "kids"]


class RelatedVerse(BaseModel):
    reference: str = Field(examples=["Romans 5:8"])
    reason: str = Field(description="One line on why this verse illuminates the original.")


class ExplanationRequest(BaseModel):
    """Ask for an explanation by verse id *or* by human reference."""

    verse_id: int | None = None
    reference: str | None = Field(default=None, examples=["John 3:16"])
    translation_code: str = Field(default="WEB", max_length=16)
    tone: Tone = "plain"
    language: Literal["en", "fr", "es"] = "en"
    refresh: bool = Field(
        default=False, description="Bypass the cache and regenerate. Rate-limited in production."
    )

    @model_validator(mode="after")
    def _one_target(self) -> ExplanationRequest:
        if (self.verse_id is None) == (self.reference is None):
            raise ValueError("Provide exactly one of 'verse_id' or 'reference'.")
        return self


class ExplanationRead(ORMModel):
    id: str
    verse_id: int
    tone: str
    model: str
    summary: str = Field(description="One sentence a reader could repeat from memory.")
    meaning: str = Field(description="What the verse is actually saying, in plain language.")
    context: str = Field(description="Who wrote it, to whom, and what surrounds it.")
    application: str = Field(description="A concrete way to live this today.")
    related_verses: list[RelatedVerse] = Field(default_factory=list)
    created_at: datetime
    cached: bool = Field(default=False, description="True when served from a previous generation.")


class ExplanationWithVerse(ExplanationRead):
    verse: VerseRead


class NoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10_000)
    title: str | None = Field(default=None, max_length=140)
    verse_id: int | None = None


class NoteUpdate(BaseModel):
    body: str | None = Field(default=None, min_length=1, max_length=10_000)
    title: str | None = Field(default=None, max_length=140)


class NoteRead(ORMModel):
    id: str
    user_id: str
    verse_id: int | None
    title: str | None
    body: str
    created_at: datetime
    updated_at: datetime
    verse: VerseRead | None = None


class FavoriteCreate(BaseModel):
    verse_id: int


class FavoriteRead(ORMModel):
    id: str
    user_id: str
    verse_id: int
    created_at: datetime
    verse: VerseRead | None = None
