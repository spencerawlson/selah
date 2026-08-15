"""pgvector-backed semantic search over verses.

Postgres-only. `app.models.__init__` imports this module *conditionally*, so on
the SQLite dev default the table is never registered and `create_all` stays
happy. Semantic search then degrades to keyword search — see
`services/search_service.py`.
"""

from __future__ import annotations

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base import Base, TimestampMixin


class VerseEmbedding(Base, TimestampMixin):
    __tablename__ = "verse_embeddings"
    __table_args__ = (
        # Cosine distance is the right metric for OpenAI-style normalised
        # embeddings. Build the index after bulk-loading, not before.
        Index(
            "ix_verse_embeddings_vector",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    verse_id: Mapped[int] = mapped_column(
        ForeignKey("verses.id", ondelete="CASCADE"), primary_key=True
    )
    model: Mapped[str] = mapped_column(String(64), primary_key=True)
    dimensions: Mapped[int] = mapped_column(Integer)
    embedding: Mapped[list[float]] = mapped_column(Vector(settings.ai_embedding_dimensions))
