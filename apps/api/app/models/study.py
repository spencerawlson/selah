"""User study artefacts: AI explanations, notes, favorites."""

from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKey
from app.models.bible import Verse


class Explanation(Base, UUIDPrimaryKey, TimestampMixin):
    """A cached AI explanation of one verse.

    Explanations are expensive and deterministic enough to reuse, so they are
    cached per (verse, tone, model). A cache hit is what keeps the free tier
    affordable — most users read the same famous verses.
    """

    __tablename__ = "explanations"
    __table_args__ = (
        UniqueConstraint("verse_id", "tone", "model", name="uq_explanations_verse_tone_model"),
    )

    verse_id: Mapped[int] = mapped_column(ForeignKey("verses.id", ondelete="CASCADE"), index=True)
    tone: Mapped[str] = mapped_column(String(24), default="plain")
    model: Mapped[str] = mapped_column(String(64))

    # The four-part structure the product promises on every verse.
    summary: Mapped[str] = mapped_column(Text)
    meaning: Mapped[str] = mapped_column(Text)
    context: Mapped[str] = mapped_column(Text)
    application: Mapped[str] = mapped_column(Text)
    # [{"reference": "Romans 5:8", "reason": "..."}]
    related_verses: Mapped[list[dict]] = mapped_column(JSON, default=list)

    verse: Mapped[Verse] = relationship()


class Note(Base, UUIDPrimaryKey, TimestampMixin):
    """A user's own writing, anchored to a verse (or free-floating)."""

    __tablename__ = "notes"
    __table_args__ = (Index("ix_notes_user_created", "user_id", "created_at"),)

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    verse_id: Mapped[int | None] = mapped_column(
        ForeignKey("verses.id", ondelete="SET NULL"), index=True, default=None
    )
    title: Mapped[str | None] = mapped_column(String(140), default=None)
    body: Mapped[str] = mapped_column(Text)

    verse: Mapped[Verse | None] = relationship()


class Favorite(Base, UUIDPrimaryKey, TimestampMixin):
    """A saved verse. One row per (user, verse)."""

    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "verse_id", name="uq_favorites_user_verse"),)

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    verse_id: Mapped[int] = mapped_column(ForeignKey("verses.id", ondelete="CASCADE"), index=True)

    verse: Mapped[Verse] = relationship()
