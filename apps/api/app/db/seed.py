"""Load sample content into the database.

    python -m app.db.seed          # idempotent: safe to run repeatedly
    python -m app.db.seed --reset  # drop every table first

Idempotent by design — it upserts on natural keys — so it can run on every
container start in development without duplicating anything.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import configure_logging, logger
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, dispose_db, engine, init_db
from app.models.bible import Book, Chapter, Testament, Translation, Verse
from app.models.user import User
from app.services.auth_service import DEMO_EMAIL, DEMO_PASSWORD
from app.services.canon import BY_SLUG

SEED_DIR = Path(__file__).resolve().parents[2] / "data" / "seed"
BIBLE_SEED = SEED_DIR / "bible.json"
# A tiny, fast subset (a handful of chapters) for the test suite.
BIBLE_SAMPLE = SEED_DIR / "bible.sample.json"
# Extra translations layered onto the same chapters (verses only): French, Spanish.
EXTRA_TRANSLATIONS = [SEED_DIR / "bible.fr.json", SEED_DIR / "bible.es.json"]


async def _upsert_translation(session: AsyncSession, payload: dict[str, Any]) -> Translation:
    translation = await session.scalar(
        select(Translation).where(Translation.code == payload["code"])
    )
    if translation is None:
        translation = Translation(**payload)
        session.add(translation)
        await session.flush()
    return translation


async def _upsert_book(session: AsyncSession, payload: dict[str, Any]) -> Book:
    book = await session.scalar(select(Book).where(Book.slug == payload["slug"]))
    if book is None:
        book = Book(
            slug=payload["slug"],
            name=payload["name"],
            # Most books cite under their own name; Psalms is the exception.
            reference_name=payload.get("reference_name", payload["name"]),
            abbreviation=payload["abbreviation"],
            testament=Testament(payload["testament"]),
            position=payload["position"],
            blurb=payload.get("blurb"),
        )
        session.add(book)
        await session.flush()
    return book


async def _upsert_chapter(session: AsyncSession, book: Book, number: int, count: int) -> Chapter:
    chapter = await session.scalar(
        select(Chapter).where(Chapter.book_id == book.id, Chapter.number == number)
    )
    if chapter is None:
        chapter = Chapter(book_id=book.id, number=number, verse_count=count)
        session.add(chapter)
        await session.flush()
    else:
        chapter.verse_count = count
    return chapter


async def seed_bible(session: AsyncSession, path: Path = BIBLE_SEED) -> tuple[int, int]:
    """Load translation, books, chapters and verses. Returns (books, verses)."""
    data = json.loads(path.read_text(encoding="utf-8"))
    translation = await _upsert_translation(session, data["translation"])
    books = {b["slug"]: await _upsert_book(session, b) for b in data["books"]}

    verse_total = 0
    for entry in data["chapters"]:
        book = books[entry["book"]]
        texts: list[str] = entry["verses"]
        chapter = await _upsert_chapter(session, book, entry["number"], len(texts))

        existing = {
            v.number: v
            for v in await session.scalars(
                select(Verse).where(
                    Verse.chapter_id == chapter.id, Verse.translation_id == translation.id
                )
            )
        }
        for index, text in enumerate(texts, start=1):
            reference = f"{book.reference_name} {chapter.number}:{index}"
            if index in existing:
                existing[index].text = text
                existing[index].reference = reference
            else:
                session.add(
                    Verse(
                        chapter_id=chapter.id,
                        translation_id=translation.id,
                        number=index,
                        text=text,
                        reference=reference,
                    )
                )
            verse_total += 1

    # chapter_count reflects what is actually loaded, so the API never advertises
    # a chapter it cannot serve. A full import recomputes it the same way.
    for book in books.values():
        book.chapter_count = len(
            list(await session.scalars(select(Chapter.id).where(Chapter.book_id == book.id)))
        )

    await session.flush()
    return len(books), verse_total


async def seed_translation(session: AsyncSession, path: Path) -> tuple[str, int]:
    """Layer one more translation's verses onto chapters that already exist.

    Books and chapters are shared across translations, so this only adds Verse
    rows. Chapters that were never seeded in English are skipped, never invented.
    """
    data = json.loads(path.read_text(encoding="utf-8"))
    translation = await _upsert_translation(session, data["translation"])

    verse_total = 0
    for entry in data["chapters"]:
        book = await session.scalar(select(Book).where(Book.slug == entry["book"]))
        if book is None:
            logger.warning("Skipping %s: book '%s' is not seeded.", translation.code, entry["book"])
            continue
        chapter = await session.scalar(
            select(Chapter).where(Chapter.book_id == book.id, Chapter.number == entry["number"])
        )
        if chapter is None:
            logger.warning(
                "Skipping %s %s %s: chapter not seeded.",
                translation.code,
                entry["book"],
                entry["number"],
            )
            continue

        # Cite the verse in the translation's own language ("Actes 20:24").
        canon = BY_SLUG.get(book.slug)
        ref_name = (
            canon.reference_name_for(translation.language) if canon else book.reference_name
        )

        existing = {
            v.number: v
            for v in await session.scalars(
                select(Verse).where(
                    Verse.chapter_id == chapter.id, Verse.translation_id == translation.id
                )
            )
        }
        for index, text in enumerate(entry["verses"], start=1):
            reference = f"{ref_name} {chapter.number}:{index}"
            if index in existing:
                existing[index].text = text
                existing[index].reference = reference
            else:
                session.add(
                    Verse(
                        chapter_id=chapter.id,
                        translation_id=translation.id,
                        number=index,
                        text=text,
                        reference=reference,
                    )
                )
            verse_total += 1

    await session.flush()
    return translation.code, verse_total


async def seed_demo_user(session: AsyncSession) -> User | None:
    """Create the demo account — local development only.

    Refusing outside `local` is deliberate: a known password in a deployed
    environment is a backdoor, not a convenience.
    """
    if settings.environment != "local":
        logger.info("Skipping demo user (environment=%s).", settings.environment)
        return None

    user = await session.scalar(select(User).where(User.email == DEMO_EMAIL))
    if user is None:
        user = User(
            email=DEMO_EMAIL,
            display_name="Demo Reader",
            hashed_password=hash_password(DEMO_PASSWORD),
            auth_provider="local",
            is_premium=True,  # so the premium surfaces are visible while building
        )
        session.add(user)
        await session.flush()
    return user


async def run(reset: bool = False) -> None:
    configure_logging(settings.debug)

    if reset:
        logger.warning("Dropping all tables (--reset)")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    await init_db()

    async with SessionLocal() as session:
        books, verses = await seed_bible(session)
        extra = [
            await seed_translation(session, path) for path in EXTRA_TRANSLATIONS if path.exists()
        ]
        user = await seed_demo_user(session)
        await session.commit()

    logger.info("Seeded %s books and %s verses", books, verses)
    for code, count in extra:
        logger.info("Added translation %s: %s verses", code, count)
    if user:
        logger.info("Demo account: %s / %s", DEMO_EMAIL, DEMO_PASSWORD)

    await dispose_db()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the Selah database.")
    parser.add_argument("--reset", action="store_true", help="Drop all tables first.")
    args = parser.parse_args()
    asyncio.run(run(reset=args.reset))


if __name__ == "__main__":
    main()
