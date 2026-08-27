"""Resolve a human book name — in English, French or Spanish — to its slug.

"Actes", "Hechos" and "Acts" all name the same book; the reader types whichever
matches the language they are in. This maps every reasonable spelling to the
canonical slug so the reference lookup works across all three languages.

Matching is accent- and case-insensitive, and tolerant of the "1"/"2"/"3"
prefix being written with or without a space.
"""

from __future__ import annotations

import re
import unicodedata

from app.services.canon import CANON


def fold(value: str) -> str:
    """Lowercase, strip accents and punctuation, collapse spaces."""
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    text = text.replace(".", " ").lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


# Hand-added alternates people actually type, beyond each book's three names,
# slug and abbreviation. Keys are folded; values are slugs.
_EXTRA: dict[str, str] = {
    "gen": "genesis",
    "ex": "exodus",
    "exod": "exodus",
    "lev": "leviticus",
    "num": "numbers",
    "deut": "deuteronomy",
    "dt": "deuteronomy",
    "josh": "joshua",
    "jos": "joshua",
    "judg": "judges",
    "jdg": "judges",
    "1 sam": "1-samuel",
    "2 sam": "2-samuel",
    "1 kgs": "1-kings",
    "2 kgs": "2-kings",
    "1 chr": "1-chronicles",
    "2 chr": "2-chronicles",
    "neh": "nehemiah",
    "ps": "psalms",
    "psalm": "psalms",
    "psa": "psalms",
    "prov": "proverbs",
    "eccl": "ecclesiastes",
    "qoheleth": "ecclesiastes",
    "song": "song-of-solomon",
    "song of songs": "song-of-solomon",
    "songs": "song-of-solomon",
    "canticles": "song-of-solomon",
    "isa": "isaiah",
    "jer": "jeremiah",
    "ezek": "ezekiel",
    "matt": "matthew",
    "mt": "matthew",
    "rom": "romans",
    "1 cor": "1-corinthians",
    "2 cor": "2-corinthians",
    "gal": "galatians",
    "eph": "ephesians",
    "phil": "philippians",
    "philip": "philippians",
    "philem": "philemon",
    "col": "colossians",
    "1 thess": "1-thessalonians",
    "2 thess": "2-thessalonians",
    "1 tim": "1-timothy",
    "2 tim": "2-timothy",
    "heb": "hebrews",
    "jas": "james",
    "rev": "revelation",
    "apoc": "revelation",
}


def _build() -> dict[str, str]:
    aliases: dict[str, str] = {}

    def add(key: str, slug: str) -> None:
        folded = fold(key)
        if folded:
            aliases.setdefault(folded, slug)
            # Also index the "1corinthians" (no-space) form of a numbered book.
            compact = folded.replace(" ", "")
            if compact != folded:
                aliases.setdefault(compact, slug)

    for book in CANON:
        names = (
            book.name,
            book.name_fr,
            book.name_es,
            book.reference_name,  # English citation ("Psalm")
            book.reference_name_for("fr"),  # French citation ("Psaume")
            book.reference_name_for("es"),  # Spanish citation ("Salmo")
            book.abbreviation,
        )
        for name in names:
            add(name, book.slug)
        add(book.slug.replace("-", " "), book.slug)

    for key, slug in _EXTRA.items():
        add(key, slug)

    return aliases


_ALIASES = _build()


def resolve_book(query: str) -> str | None:
    """Return the canonical slug for a book name in any supported language."""
    return _ALIASES.get(fold(query))
