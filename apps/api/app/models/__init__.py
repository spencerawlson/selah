"""Model registry.

Importing this package is what populates `Base.metadata`, so `create_all` and
any future Alembic autogenerate see the full schema.
"""

from app.core.config import settings
from app.db.base import Base
from app.models.bible import Book, Chapter, Testament, Translation, Verse
from app.models.study import Explanation, Favorite, Note
from app.models.user import User

__all__ = [
    "Base",
    "Book",
    "Chapter",
    "Explanation",
    "Favorite",
    "Note",
    "Testament",
    "Translation",
    "User",
    "Verse",
]

# The vector table only exists on Postgres (pgvector). Registering it on SQLite
# would break create_all, so it is opt-in by dialect rather than by flag.
if settings.is_postgres:  # pragma: no cover - depends on deployment target
    # Redundant alias: the import exists for its registration side effect.
    from app.models.embedding import VerseEmbedding as VerseEmbedding

    __all__.append("VerseEmbedding")
