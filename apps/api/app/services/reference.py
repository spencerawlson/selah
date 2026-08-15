"""Parsing human verse references like "John 3:16" or "1 Cor 13:4".

Deliberately small: it handles the single-verse form the app actually sends.
Ranges ("John 3:16-18") and multi-chapter spans are a later problem — when you
need them, extend `parse_reference`, not its callers.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

_REFERENCE_RE = re.compile(
    r"^\s*(?P<book>(?:[1-3]\s*)?[A-Za-z][A-Za-z\s.]*?)\s*"
    r"(?P<chapter>\d+)\s*[:.]\s*(?P<verse>\d+)\s*$"
)


@dataclass(frozen=True)
class ParsedReference:
    book_query: str  # normalised for lookup: "1 corinthians", "john"
    chapter: int
    verse: int


def slugify(value: str) -> str:
    """ "1 Corinthians" -> "1-corinthians". Matches Book.slug in the seed data."""
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[\s_]+", "-", text)


def parse_reference(reference: str) -> ParsedReference | None:
    """Return the parsed parts, or None when the string is not a reference.

    Callers turn None into a 422 — this function does not raise, so it stays
    usable for "is this a reference or a search query?" checks.
    """
    match = _REFERENCE_RE.match(reference)
    if not match:
        return None
    book = re.sub(r"\s+", " ", match.group("book").replace(".", "").strip()).lower()
    if not book:
        return None
    return ParsedReference(
        book_query=book,
        chapter=int(match.group("chapter")),
        verse=int(match.group("verse")),
    )
