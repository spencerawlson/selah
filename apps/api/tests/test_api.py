"""End-to-end checks over the public API surface.

Not exhaustive — these cover the paths a broken refactor would take down first.
"""

from __future__ import annotations

from httpx import AsyncClient


# --------------------------------------------------------------------------
# Health & content
# --------------------------------------------------------------------------
async def test_health_reports_dependencies(client: AsyncClient) -> None:
    body = (await client.get("/health")).json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["ai_provider"] == "mock"


async def test_books_are_in_canonical_order(client: AsyncClient) -> None:
    books = (await client.get("/api/v1/books")).json()
    assert [b["slug"] for b in books] == [
        "genesis",
        "psalms",
        "john",
        "1-corinthians",
        "philippians",
    ]


async def test_book_lookup_accepts_slug_and_id(client: AsyncClient) -> None:
    by_slug = (await client.get("/api/v1/books/john")).json()
    by_id = (await client.get(f"/api/v1/books/{by_slug['id']}")).json()
    assert by_slug == by_id


async def test_reading_a_chapter(client: AsyncClient) -> None:
    chapters = (await client.get("/api/v1/books/john/chapters")).json()
    verses = (await client.get(f"/api/v1/chapters/{chapters[0]['id']}/verses")).json()

    assert len(verses) == 36  # John 3
    assert verses[15]["reference"] == "John 3:16"
    assert verses[15]["text"].startswith("For God so loved the world")


async def test_psalms_cite_in_the_singular(client: AsyncClient) -> None:
    verse = (await client.get("/api/v1/verses", params={"reference": "Psalm 23:1"})).json()
    assert verse["reference"] == "Psalm 23:1"

    # The plural book name resolves to the same verse.
    plural = (await client.get("/api/v1/verses", params={"reference": "Psalms 23:1"})).json()
    assert plural["id"] == verse["id"]


async def test_search_finds_text(client: AsyncClient) -> None:
    page = (await client.get("/api/v1/search", params={"q": "shepherd"})).json()
    assert page["total"] >= 1
    assert any("shepherd" in item["text"].lower() for item in page["items"])


async def test_today_returns_a_verse(client: AsyncClient) -> None:
    body = (await client.get("/api/v1/today")).json()
    assert body["verse_of_the_day"]["verse"]["reference"]
    assert len(body["featured"]) == 6


# --------------------------------------------------------------------------
# Errors
# --------------------------------------------------------------------------
async def test_missing_book_uses_the_error_envelope(client: AsyncClient) -> None:
    response = await client.get("/api/v1/books/habakkuk")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


async def test_malformed_reference_is_a_validation_error(client: AsyncClient) -> None:
    response = await client.get("/api/v1/verses", params={"reference": "not a reference"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_book_names_resolve_across_languages() -> None:
    """A reader types the book name in their own language; it must resolve."""
    from app.services.book_aliases import resolve_book

    assert resolve_book("Acts") == "acts"
    assert resolve_book("Actes") == "acts"  # French
    assert resolve_book("Hechos") == "acts"  # Spanish
    assert resolve_book("Génesis") == "genesis"
    assert resolve_book("Ésaïe") == "isaiah"
    assert resolve_book("1 Corinthiens") == "1-corinthians"
    assert resolve_book("Apocalipsis") == "revelation"
    assert resolve_book("Ps") == "psalms"
    # The localized singular citation forms the app displays must resolve too.
    assert resolve_book("Psaume") == "psalms"  # French
    assert resolve_book("Salmo") == "psalms"  # Spanish
    assert resolve_book("not a book") is None


async def test_explanation_needs_exactly_one_target(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/verse-explanations", json={"verse_id": 1, "reference": "John 3:16"}
    )
    assert response.status_code == 422


# --------------------------------------------------------------------------
# Explanations
# --------------------------------------------------------------------------
async def test_explanation_is_structured_and_cached(client: AsyncClient) -> None:
    first = await client.post("/api/v1/verse-explanations", json={"reference": "John 3:16"})
    assert first.status_code == 200

    body = first.json()
    assert body["cached"] is False
    assert body["verse"]["reference"] == "John 3:16"
    for field in ("summary", "meaning", "context", "application"):
        assert body[field].strip()
    assert body["related_verses"][0]["reference"]

    second = (
        await client.post("/api/v1/verse-explanations", json={"reference": "John 3:16"})
    ).json()
    assert second["cached"] is True
    assert second["id"] == body["id"]  # same cached row, not a duplicate


async def test_explanation_tone_is_cached_separately(client: AsyncClient) -> None:
    plain = await client.post("/api/v1/verse-explanations", json={"reference": "John 3:16"})
    kids = await client.post(
        "/api/v1/verse-explanations", json={"reference": "John 3:16", "tone": "kids"}
    )
    assert plain.json()["id"] != kids.json()["id"]
    assert plain.json()["summary"] != kids.json()["summary"]


# --------------------------------------------------------------------------
# Auth, notes, favorites
# --------------------------------------------------------------------------
async def test_notes_require_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/notes")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


async def test_duplicate_sign_up_conflicts(client: AsyncClient) -> None:
    payload = {"email": "dup@example.com", "password": "a-good-password", "display_name": "Dup"}
    assert (await client.post("/api/v1/auth/sign-up", json=payload)).status_code == 201

    conflict = await client.post("/api/v1/auth/sign-up", json=payload)
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "conflict"


async def test_wrong_password_is_rejected(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/sign-up",
        json={"email": "pw@example.com", "password": "a-good-password", "display_name": "PW"},
    )
    response = await client.post(
        "/api/v1/auth/sign-in", json={"email": "pw@example.com", "password": "wrong-password"}
    )
    assert response.status_code == 401


async def test_note_lifecycle(auth_client: AsyncClient) -> None:
    response = await auth_client.get("/api/v1/verses", params={"reference": "Philippians 4:6"})
    verse = response.json()

    created = await auth_client.post(
        "/api/v1/notes",
        json={"body": "Split the worry into three requests.", "verse_id": verse["id"]},
    )
    assert created.status_code == 201
    note = created.json()
    assert note["verse"]["reference"] == "Philippians 4:6"

    listed = (await auth_client.get("/api/v1/notes")).json()
    assert listed["total"] == 1

    updated = await auth_client.patch(f"/api/v1/notes/{note['id']}", json={"title": "Anxiety"})
    assert updated.json()["title"] == "Anxiety"

    assert (await auth_client.delete(f"/api/v1/notes/{note['id']}")).status_code == 204
    assert (await auth_client.get("/api/v1/notes")).json()["total"] == 0


async def test_notes_are_private_to_their_owner(auth_client: AsyncClient) -> None:
    created = await auth_client.post("/api/v1/notes", json={"body": "Mine alone."})
    note_id = created.json()["id"]

    # Sign in as somebody else and try to read it.
    other = await auth_client.post(
        "/api/v1/auth/sign-up",
        json={"email": "other@example.com", "password": "a-good-password", "display_name": "Other"},
    )
    auth_client.headers["Authorization"] = f"Bearer {other.json()['access_token']}"

    assert (await auth_client.get(f"/api/v1/notes/{note_id}")).status_code == 404


async def test_favoriting_is_idempotent(auth_client: AsyncClient) -> None:
    verse = (await auth_client.get("/api/v1/verses", params={"reference": "Psalm 23:1"})).json()

    first = await auth_client.post("/api/v1/favorites", json={"verse_id": verse["id"]})
    second = await auth_client.post("/api/v1/favorites", json={"verse_id": verse["id"]})
    assert first.json()["id"] == second.json()["id"]

    assert (await auth_client.get("/api/v1/favorites")).json()["total"] == 1
    assert (await auth_client.delete(f"/api/v1/favorites/{verse['id']}")).status_code == 204
    assert (await auth_client.get("/api/v1/favorites")).json()["total"] == 0
