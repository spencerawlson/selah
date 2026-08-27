"""Regenerate the full-Bible seed files from public-domain sources.

    python scripts/build_bible.py

Writes three files under data/seed/, each in the seeder's own format:

    bible.json      World English Bible (English)  — books + chapters
    bible.fr.json   Bible Ostervald  (French)      — chapters only
    bible.es.json   Reina-Valera 1909 (Spanish)    — chapters only

Sources (all public domain):
    WEB  getbible.net v2                — object: books[].chapters[].verses[]
    OST  thiagobodruk/bible fr_apee     — array:  book.chapters[[verse, ...]]
    RVR  thiagobodruk/bible es_rvr      — array:  book.chapters[[verse, ...]]

All three follow the standard 66-book Protestant order, so they align to
``canon.CANON`` by position. Run it whenever you want to refresh the text; the
output is what actually ships, so re-seed afterwards.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.canon import CANON  # noqa: E402

SEED_DIR = Path(__file__).resolve().parents[1] / "data" / "seed"

WEB_URL = "https://api.getbible.net/v2/web.json"
OST_URL = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/fr_apee.json"
RVR_URL = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/es_rvr.json"

TRANSLATIONS = {
    "web": {"code": "WEB", "name": "World English Bible", "language": "en"},
    "ost": {"code": "OST", "name": "Bible Ostervald (French)", "language": "fr"},
    "rvr": {"code": "RVR", "name": "Reina-Valera 1909 (Spanish)", "language": "es"},
}

# The curated Home-screen shelf. `/today` rotates the verse of the day through
# whichever of these are loaded, so it works on the full Bible and the test
# sample alike. An editor can re-order or extend this without touching code.
FEATURED = [
    {"reference": "John 3:16", "label": "God's love"},
    {"reference": "Psalm 23:1", "label": "The Lord my shepherd"},
    {"reference": "Philippians 4:13", "label": "Strength"},
    {"reference": "1 Corinthians 13:4", "label": "Love is patient"},
    {"reference": "Genesis 1:1", "label": "In the beginning"},
    {"reference": "Philippians 4:6", "label": "Do not be anxious"},
    {"reference": "Proverbs 3:5", "label": "Trust in the Lord"},
    {"reference": "Isaiah 40:31", "label": "Renewed strength"},
    {"reference": "Jeremiah 29:11", "label": "Plans to prosper"},
    {"reference": "Matthew 11:28", "label": "Come to me"},
    {"reference": "Romans 8:28", "label": "All things for good"},
    {"reference": "Psalm 46:1", "label": "A very present help"},
]


def _fetch(url: str) -> object:
    print(f"  downloading {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "selah-build/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310 (trusted URLs)
        raw = resp.read()
    # thiagobodruk files carry a UTF-8 BOM; getbible does not.
    return json.loads(raw.decode("utf-8-sig"))


def _chapters_from_getbible(data: dict) -> list[list[list[str]]]:
    """-> books[book_index][chapter_index] = [verse_text, ...]."""
    out: list[list[list[str]]] = []
    for book in data["books"]:
        chapters = []
        for chapter in sorted(book["chapters"], key=lambda c: int(c["chapter"])):
            verses = sorted(chapter["verses"], key=lambda v: int(v["verse"]))
            chapters.append([v["text"].strip() for v in verses])
        out.append(chapters)
    return out


def _chapters_from_thiagobodruk(data: list) -> list[list[list[str]]]:
    """-> books[book_index][chapter_index] = [verse_text, ...]."""
    return [[[v.strip() for v in chapter] for chapter in book["chapters"]] for book in data]


def _book_records() -> list[dict]:
    return [
        {
            "slug": b.slug,
            "name": b.name,
            "reference_name": b.reference_name,
            "abbreviation": b.abbreviation,
            "testament": b.testament,
            "position": b.position,
        }
        for b in CANON
    ]


def _chapter_records(books: list[list[list[str]]]) -> list[dict]:
    records: list[dict] = []
    for canon_book, chapters in zip(CANON, books, strict=True):
        for number, verses in enumerate(chapters, start=1):
            if verses:  # never emit an empty chapter
                records.append({"book": canon_book.slug, "number": number, "verses": verses})
    return records


def main() -> None:
    print("Fetching sources…")
    web = _chapters_from_getbible(_fetch(WEB_URL))
    ost = _chapters_from_thiagobodruk(_fetch(OST_URL))
    rvr = _chapters_from_thiagobodruk(_fetch(RVR_URL))

    for label, books in (("WEB", web), ("OST", ost), ("RVR", rvr)):
        if len(books) != len(CANON):
            raise SystemExit(f"{label}: expected {len(CANON)} books, got {len(books)}")

    SEED_DIR.mkdir(parents=True, exist_ok=True)

    english = {
        "translation": {**TRANSLATIONS["web"], "license": "Public Domain", "is_premium": False},
        "books": _book_records(),
        "featured": FEATURED,
        "chapters": _chapter_records(web),
    }
    french = {
        "translation": {**TRANSLATIONS["ost"], "license": "Public Domain", "is_premium": False},
        "chapters": _chapter_records(ost),
    }
    spanish = {
        "translation": {**TRANSLATIONS["rvr"], "license": "Public Domain", "is_premium": False},
        "chapters": _chapter_records(rvr),
    }

    for name, payload in (
        ("bible.json", english),
        ("bible.fr.json", french),
        ("bible.es.json", spanish),
    ):
        path = SEED_DIR / name
        path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        chapters = len(payload["chapters"])
        verses = sum(len(c["verses"]) for c in payload["chapters"])
        size = path.stat().st_size
        print(f"  wrote {name}: {chapters} chapters, {verses} verses ({size:,} bytes)")

    print("Done.")


if __name__ == "__main__":
    main()
