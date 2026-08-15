"""Import a full Bible translation, replacing the hand-entered sample data.

    python scripts/import_bible.py path/to/web.json --code WEB --name "World English Bible"

Expects the widely-used flat JSON shape — 66 books in canonical order, each with
an array of chapters, each an array of verse strings:

    [
      {"abbrev": "gn", "name": "Genesis", "chapters": [["In the beginning..."], ...]},
      ...
    ]

Public-domain sources in this format: github.com/thiagobodruk/bible (WEB, KJV,
and others). Verify any dataset before shipping it — this is scripture, and a
transcription error is not a cosmetic bug.

Idempotent: re-running updates verse text in place rather than duplicating.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Allow `python scripts/import_bible.py` from the apps/api directory.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from app.core.logging import configure_logging, logger  # noqa: E402
from app.db.session import SessionLocal, dispose_db, init_db  # noqa: E402
from app.models.bible import Book, Chapter, Testament, Translation, Verse  # noqa: E402
from app.services.reference import slugify  # noqa: E402

# The Protestant canon splits 39/27. Books are expected in canonical order.
OLD_TESTAMENT_BOOKS = 39

# Books whose citation form differs from their name.
REFERENCE_NAME_OVERRIDES = {"Psalms": "Psalm", "Song of Solomon": "Song of Songs"}


def abbreviate(name: str) -> str:
    """ "1 Corinthians" -> "1Co"; "Genesis" -> "Gen"."""
    parts = name.split()
    if parts[0].isdigit() or (len(parts[0]) == 1 and parts[0].isnumeric()):
        return f"{parts[0]}{parts[1][:2].title()}"[:8]
    return name[:3].title()


async def import_translation(
    session: AsyncSession,
    books_payload: list[dict],
    *,
    code: str,
    name: str,
    language: str,
    license_: str,
) -> tuple[int, int]:
    translation = await session.scalar(select(Translation).where(Translation.code == code))
    if translation is None:
        translation = Translation(
            code=code, name=name, language=language, license=license_, is_premium=False
        )
        session.add(translation)
        await session.flush()

    book_count = 0
    verse_count = 0

    for position, entry in enumerate(books_payload, start=1):
        book_name: str = entry["name"].strip()
        slug = slugify(book_name)
        testament = Testament.OLD if position <= OLD_TESTAMENT_BOOKS else Testament.NEW

        book = await session.scalar(select(Book).where(Book.slug == slug))
        if book is None:
            book = Book(
                slug=slug,
                name=book_name,
                reference_name=REFERENCE_NAME_OVERRIDES.get(book_name, book_name),
                abbreviation=(entry.get("abbrev") or abbreviate(book_name)).title()[:8],
                testament=testament,
                position=position,
                chapter_count=len(entry["chapters"]),
            )
            session.add(book)
            await session.flush()
        else:
            book.position = position
            book.chapter_count = len(entry["chapters"])

        for chapter_number, verses in enumerate(entry["chapters"], start=1):
            chapter = await session.scalar(
                select(Chapter).where(Chapter.book_id == book.id, Chapter.number == chapter_number)
            )
            if chapter is None:
                chapter = Chapter(book_id=book.id, number=chapter_number, verse_count=len(verses))
                session.add(chapter)
                await session.flush()
            else:
                chapter.verse_count = len(verses)

            existing = {
                v.number: v
                for v in await session.scalars(
                    select(Verse).where(
                        Verse.chapter_id == chapter.id, Verse.translation_id == translation.id
                    )
                )
            }
            for verse_number, text in enumerate(verses, start=1):
                reference = f"{book.reference_name} {chapter_number}:{verse_number}"
                if verse_number in existing:
                    existing[verse_number].text = text
                    existing[verse_number].reference = reference
                else:
                    session.add(
                        Verse(
                            chapter_id=chapter.id,
                            translation_id=translation.id,
                            number=verse_number,
                            text=text,
                            reference=reference,
                        )
                    )
                verse_count += 1

        book_count += 1
        # Commit per book: a 31,000-verse import in one transaction is a bad idea.
        await session.commit()
        logger.info("Imported %s (%s chapters)", book.name, len(entry["chapters"]))

    return book_count, verse_count


async def run(path: Path, *, code: str, name: str, language: str, license_: str) -> None:
    configure_logging(debug=False)

    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    books_payload = payload["books"] if isinstance(payload, dict) else payload
    if not isinstance(books_payload, list) or not books_payload:
        raise SystemExit(f"{path} does not look like a Bible dump (expected a list of books).")

    await init_db()
    async with SessionLocal() as session:
        books, verses = await import_translation(
            session, books_payload, code=code, name=name, language=language, license_=license_
        )

    logger.info("Done: %s books, %s verses in %s", books, verses, code)
    await dispose_db()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="Path to the translation JSON file.")
    parser.add_argument("--code", default="WEB", help="Translation code, e.g. WEB.")
    parser.add_argument("--name", default="World English Bible")
    parser.add_argument("--language", default="en")
    parser.add_argument("--license", dest="license_", default="Public Domain")
    args = parser.parse_args()

    if not args.path.exists():
        raise SystemExit(f"No such file: {args.path}")

    asyncio.run(
        run(
            args.path,
            code=args.code,
            name=args.name,
            language=args.language,
            license_=args.license_,
        )
    )


if __name__ == "__main__":
    main()
