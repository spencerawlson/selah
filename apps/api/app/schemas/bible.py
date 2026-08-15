"""Request/response models for Bible content."""

from __future__ import annotations

from pydantic import Field

from app.models.bible import Testament
from app.schemas.common import ORMModel


class TranslationRead(ORMModel):
    id: int
    code: str = Field(examples=["WEB"])
    name: str = Field(examples=["World English Bible"])
    language: str
    license: str
    is_premium: bool


class BookRead(ORMModel):
    id: int
    slug: str = Field(examples=["john"])
    name: str = Field(examples=["John"])
    abbreviation: str
    reference_name: str = Field(examples=["John"], description="Form used in citations.")
    testament: Testament
    position: int
    chapter_count: int
    blurb: str | None = None


class ChapterRead(ORMModel):
    id: int
    book_id: int
    number: int
    verse_count: int
    summary: str | None = None


class ChapterWithBook(ChapterRead):
    """Used by the reader header, which needs "John 3" not "chapter 3"."""

    book_name: str
    book_slug: str


class VerseRead(ORMModel):
    id: int
    chapter_id: int
    translation_id: int
    number: int
    text: str
    reference: str = Field(examples=["John 3:16"])
