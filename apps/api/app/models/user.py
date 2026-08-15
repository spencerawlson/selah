"""User accounts.

The scaffold hashes passwords locally so sign-up works out of the box, but the
shape is provider-agnostic: when you move to Firebase or Supabase, keep the row
and populate `auth_provider` + `external_id` instead of `hashed_password`.
"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKey


class User(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))

    # Local auth only. Null when the user is managed by an external provider.
    hashed_password: Mapped[str | None] = mapped_column(String(256), default=None)

    auth_provider: Mapped[str] = mapped_column(String(32), default="local")
    external_id: Mapped[str | None] = mapped_column(String(128), index=True, default=None)

    # Premium gate: unlimited AI explanations, licensed translations, offline packs.
    is_premium: Mapped[bool] = mapped_column(default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
