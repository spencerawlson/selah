# Selah API

FastAPI backend for [Selah](../../README.md) — Bible content, AI verse
explanations, notes, and favorites.

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

cp .env.example .env
python -m app.db.seed
uvicorn app.main:app --reload
```

Docs: <http://localhost:8000/docs> · Health: <http://localhost:8000/health>

## Layout

| Path | What lives there |
|---|---|
| `app/core/` | settings, error taxonomy, logging, password hashing and JWTs |
| `app/db/` | async engine, session dependency, seeder |
| `app/models/` | SQLAlchemy ORM — the domain model |
| `app/schemas/` | Pydantic — the wire format |
| `app/api/v1/` | routers, one module per feature |
| `app/services/` | business logic; `services/ai/` holds the provider layer |
| `data/seed/` | sample Bible content and curated explanations |
| `scripts/` | `import_bible.py` — load a full translation |

Routers validate and delegate. Services own the rules, the transactions, and
every ownership check.

## Commands

```bash
pytest                            # 18 tests, in-memory SQLite, no network
ruff check . && ruff format .
python -m app.db.seed --reset     # drop everything and reload
python scripts/import_bible.py path/to/web.json --code WEB
```

## Configuration

Every setting is a field on `Settings` in `app/core/config.py` and comes from the
environment. See `.env.example` for the annotated list.

The two that change behaviour most:

- `DATABASE_URL` — SQLite by default so the API runs with no setup; switch to
  `postgresql+psycopg://…` for pgvector and semantic search.
- `AI_PROVIDER` — `mock` (default, offline, free) or `openai` (any
  OpenAI-compatible endpoint via `AI_BASE_URL`).
