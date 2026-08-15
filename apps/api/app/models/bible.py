"""Bible content: Translation → Book → Chapter → Verse.

These rows are reference data, not user data, so they use plain integer keys —
they are enumerable on purpose and cheap to join.
"""

from __future__ import annotations

import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Testament(enum.StrEnum):
    OLD = "old"
    NEW = "new"


class Translation(Base, TimestampMixin):
    """A Bible translation, e.g. WEB (World English Bible, public domain).

    `is_premium` is the hook for the paid tier: modern licensed translations sit
    behind the paywall, public-domain ones stay free.
    """

    __tablename__ = "translations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, index=True)  # "WEB"
    name: Mapped[str] = mapped_column(String(128))
    language: Mapped[str] = mapped_column(String(8), default="en")
    license: Mapped[str] = mapped_column(String(128), default="Public Domain")
    is_premium: Mapped[bool] = mapped_column(default=False)

    verses: Mapped[list[Verse]] = relationship(back_populates="translation")


class Book(Base, TimestampMixin):
    """One of the 66 books. `position` is canonical order (Genesis = 1)."""

    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(48), unique=True, index=True)  # "john"
    name: Mapped[str] = mapped_column(String(64))  # "John"
    abbreviation: Mapped[str] = mapped_column(String(8))  # "Jn"
    # The singular form used inside a citation: the book is "Psalms" but the
    # reference is "Psalm 23:1". Equals `name` for every other book.
    reference_name: Mapped[str] = mapped_column(String(64))
    testament: Mapped[Testament] = mapped_column(Enum(Testament, native_enum=False))
    position: Mapped[int] = mapped_column(Integer, index=True)
    chapter_count: Mapped[int] = mapped_column(Integer, default=0)
    # One-line orientation shown on the book card in the reader.
    blurb: Mapped[str | None] = mapped_column(Text, default=None)

    chapters: Mapped[list[Chapter]] = relationship(
        back_populates="book", cascade="all, delete-orphan", order_by="Chapter.number"
    )


class Chapter(Base, TimestampMixin):
    __tablename__ = "chapters"
    __table_args__ = (UniqueConstraint("book_id", "number", name="uq_chapters_book_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    verse_count: Mapped[int] = mapped_column(Integer, default=0)
    # Cached AI chapter summary. Null until generated; regenerated on demand.
    summary: Mapped[str | None] = mapped_column(Text, default=None)

    book: Mapped[Book] = relationship(back_populates="chapters")
    verses: Mapped[list[Verse]] = relationship(
        back_populates="chapter", cascade="all, delete-orphan", order_by="Verse.number"
    )


class Verse(Base, TimestampMixin):
    """A single verse in a single translation.

    Verse text is translation-specific, so (chapter, translation, number) is the
    natural key. `reference` is denormalised ("John 3:16") because every screen
    in the app displays it and nobody wants three joins to render a label.
    """

    __tablename__ = "verses"
    __table_args__ = (
        UniqueConstraint(
            "chapter_id", "translation_id", "number", name="uq_verses_chapter_translation_number"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chapter_id: Mapped[int] = mapped_column(
        ForeignKey("chapters.id", ondelete="CASCADE"), index=True
    )
    translation_id: Mapped[int] = mapped_column(
        ForeignKey("translations.id", ondelete="CASCADE"), index=True
    )
    number: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    reference: Mapped[str] = mapped_column(String(64), index=True)  # "John 3:16"

    chapter: Mapped[Chapter] = relationship(back_populates="verses")
    translation: Mapped[Translation] = relationship(back_populates="verses")
