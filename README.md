# Selah

**An AI-powered Bible app that explains every verse in clear, practical language.**

*Selah* is the word scattered through the Psalms that most likely means: pause here,
and think about that. That is the whole product.

This repository is the working foundation — a running API, a running app, real
seed data, and a working AI explanation loop. It is deliberately not the finished
product; it is the part you build the finished product on.

---

## What works right now

- **Read** — six complete chapters of the World English Bible, set in serif, in a
  reader with no chrome in the way.
- **Explain** — tap any verse and get a structured explanation: *summary,
  meaning, context, living it today,* and related verses to read alongside.
  Four voices: plain, devotional, scholarly, and for kids.
- **Notes and favorites** — per-account, private, and enforced server-side.
- **No API key required.** The default AI provider is an offline mock that
  serves hand-written explanations for the seeded verses, so a fresh clone
  demonstrates the real product loop with zero setup and zero spend.

---

## Quick start

Two terminals. Five minutes. No Docker required for the first run.

### 1. Backend

```bash
cd apps/api

python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

cp .env.example .env               # defaults are fine
python -m app.db.seed              # loads 5 books, 114 verses, a demo account
uvicorn app.main:app --reload
```

The API is at **http://localhost:8000** — interactive docs at
[`/docs`](http://localhost:8000/docs), health at [`/health`](http://localhost:8000/health).

It runs on a local SQLite file by default, on purpose: nothing to install, and
you can be reading verses within a minute. Postgres is one env var away
([below](#postgres--pgvector)).

### 2. Mobile app

```bash
# from the repository root
npm install
npm run mobile
```

Then press `w` for the browser, `i` for the iOS simulator, or `a` for Android —
or scan the QR code with [Expo Go](https://expo.dev/go) on a real device.

> **On a physical device?** Your phone cannot see your computer's `localhost`.
> Copy `apps/mobile/.env.example` to `.env` and set
> `EXPO_PUBLIC_API_URL=http://<your-LAN-ip>:8000`.

### 3. Sign in

Reading works signed out. For notes and favorites, the seeded local account is:

```
demo@selah.app / selah-demo-2024
```

The sign-in screen has a one-tap button for it. The seeder refuses to create
this account unless `ENVIRONMENT=local`.

---

## Layout

```
selah/
├─ apps/
│  ├─ api/                    FastAPI backend
│  │  ├─ app/
│  │  │  ├─ core/             config, errors, logging, security
│  │  │  ├─ db/               engine, session, seed
│  │  │  ├─ models/           SQLAlchemy ORM — the domain
│  │  │  ├─ schemas/          Pydantic — the wire format
│  │  │  ├─ api/v1/           routers, one per feature
│  │  │  └─ services/         business logic, incl. services/ai/
│  │  ├─ data/seed/           sample Bible + curated explanations
│  │  ├─ scripts/             full-Bible importer
│  │  └─ tests/
│  └─ mobile/                 Expo (React Native + web)
│     └─ src/
│        ├─ app/              expo-router — file-based routes
│        ├─ components/       design system + verse presentation
│        ├─ theme/            colours, spacing, type scale
│        ├─ api/              client, endpoints, useAsync
│        └─ state/            auth + storage
├─ packages/shared/           TypeScript types shared by both apps
├─ infra/postgres/            pgvector init SQL
└─ docker-compose.yml         Postgres (+ optional containerised API)
```

The split is by **layer inside each app** and by **app inside the monorepo**.
A new feature touches one router, one service, one schema — and one screen.

---

## The API

| Method | Path | |
|---|---|---|
| `GET` | `/health` | liveness + dependency status |
| `GET` | `/api/v1/today` | verse of the day + curated shelf |
| `GET` | `/api/v1/books` | all books, canonical order |
| `GET` | `/api/v1/books/{book_id}/chapters` | accepts an id **or** a slug (`3` or `john`) |
| `GET` | `/api/v1/chapters/{chapter_id}/verses` | read a chapter |
| `GET` | `/api/v1/verses?reference=John+3:16` | look up by human reference |
| `GET` | `/api/v1/search?q=shepherd` | keyword search |
| `POST` | `/api/v1/verse-explanations` | **the core endpoint** — structured explanation |
| `POST` | `/api/v1/chapters/{id}/summary` | plain-language chapter summary |
| `GET` `POST` | `/api/v1/notes` | list / write (auth) |
| `PATCH` `DELETE` | `/api/v1/notes/{id}` | edit / delete (auth) |
| `GET` `POST` | `/api/v1/favorites` | list / save (auth) |
| `POST` | `/api/v1/auth/sign-up` `sign-in` | returns a bearer token |
| `GET` | `/api/v1/auth/me` | current user |

Try the one that matters:

```bash
curl -s localhost:8000/api/v1/verse-explanations \
  -H 'Content-Type: application/json' \
  -d '{"reference": "John 3:16", "tone": "plain"}' | python -m json.tool
```

### Errors

Every failure — validation, auth, missing row, upstream outage, unhandled bug —
comes back in one shape:

```json
{ "error": { "code": "not_found", "message": "No book matching 'habakkuk'.", "details": {} } }
```

Clients switch on `code`; humans read `message`. See `app/core/errors.py`.

---

## The AI layer

Everything above `services/ai/base.py` depends on a single protocol, so swapping
providers is a config change:

```
ExplanationProvider (Protocol)
├── MockProvider              default — offline, deterministic, free
└── OpenAICompatibleProvider  OpenAI, Azure, Together, Groq, vLLM, Ollama, LM Studio
```

Point it anywhere OpenAI-shaped:

```bash
AI_PROVIDER=openai
AI_BASE_URL=http://localhost:11434/v1    # Ollama, running locally
AI_MODEL=llama3.1
AI_API_KEY=ollama                        # local servers ignore the value
```

Three things worth knowing before you change it:

1. **Output is validated twice** — requested as a JSON schema, then parsed
   through Pydantic. Models drift; validation does not.
2. **Explanations are cached** per `(verse, tone, model)`. Readers cluster hard
   on the same few hundred verses, so the second request for John 3:16 never
   reaches the model. This is what makes a free tier affordable.
3. **Prompts live in one file** — `services/ai/prompts.py`. This app puts words
   in the mouth of scripture for people who trust it. The system prompt forbids
   inventing history, tells the model to name genuine disagreement between
   traditions rather than pick a side, and bars it from telling anyone what God
   wants them to decide. Review changes there like you would a migration.

---

## Postgres + pgvector

SQLite is the default so nothing blocks the first run. For anything real:

```bash
cp .env.example .env               # repository root
docker compose up -d db

# then in apps/api/.env
DATABASE_URL=postgresql+psycopg://selah:selah@localhost:5432/selah

python -m app.db.seed
```

The `verse_embeddings` table (pgvector, HNSW, cosine) registers **only** on
Postgres — see `app/models/__init__.py`. On SQLite it does not exist and search
falls back to keyword matching, which is honest rather than broken.

To run the API in a container too: `docker compose up`.

---

## Real Bible data

The seed set is six complete chapters, **hand-entered**, marked as such at the
top of `data/seed/bible.json`. It is enough to develop against and demo, and it
is not enough to ship.

```bash
python scripts/import_bible.py path/to/web.json --code WEB
```

The importer takes the standard flat JSON shape (66 books, each with an array of
chapters, each an array of verse strings) — the format used by
[thiagobodruk/bible](https://github.com/thiagobodruk/bible), which publishes WEB
and other public-domain translations. It is idempotent and recomputes chapter
and verse counts from what it loads.

**Verify any dataset before shipping it.** A transcription error here is not a
cosmetic bug.

---

## Auth

The scaffold ships working local email + password: PBKDF2-HMAC-SHA256 from the
standard library, plus a signed JWT. It is real, and it is not what you should
deploy.

Moving to a hosted provider is one function. `verify_access_token` in
`app/core/security.py` already dispatches on `AUTH_PROVIDER`; implement the
Firebase or Supabase branch (verify the client's JWT against the provider's
JWKS, cache the keys, fail closed) and every route keeps working untouched.

Notes and favorites filter on `user_id` in the **service layer**, not in each
router, so a new endpoint cannot forget to. Fetching someone else's note returns
`404`, not `403` — it does not confirm the row exists.

---

## Development

```bash
# Backend
cd apps/api
pytest                       # 18 tests: content, errors, auth, notes, favorites
ruff check . && ruff format .
python -m app.db.seed --reset

# Frontend (from the root)
npm run typecheck            # both workspaces
npm run web                  # browser
```

A few conventions worth keeping:

- **Routers are thin.** Validate, delegate to a service, shape the response.
- **Services own the rules.** Ownership checks, caching, transactions.
- **`useAsync` is a placeholder on purpose.** It covers loading, error, refresh,
  and cancel-on-unmount. When you need caching and optimistic updates, swap in
  TanStack Query — the call sites already have the right shape.
- **Scripture is serif, the app is sans.** The design system enforces it. Verse
  text is always the highest-contrast element on screen.
- **`packages/shared` is hand-written**, mirroring the Pydantic schemas. Change
  a schema and its TypeScript type in the same commit.

`typedRoutes` is off in `app.json` so `tsc --noEmit` passes without first running
Expo to generate route types. Turn it on once you have a CI step that does.

---

## Deploying

| Piece | Target | Notes |
|---|---|---|
| API | Render, Fly.io, Azure Container Apps | `apps/api/Dockerfile` is multi-stage, non-root, ready |
| Database | Neon, Supabase, RDS | needs the `vector` extension |
| Web | Vercel, Netlify | `npx expo export --platform web` |
| iOS / Android | EAS Build | `eas build` — set `EXPO_PUBLIC_API_URL` per profile |

Before the first deploy:

- [ ] Generate a real `JWT_SECRET` (`python -c "import secrets; print(secrets.token_urlsafe(48))"`)
- [ ] Set `ENVIRONMENT=production` — this alone disables the demo account
- [ ] Replace `create_all` with Alembic migrations
- [ ] Import a verified full Bible
- [ ] Add rate limiting to `POST /verse-explanations`
- [ ] Delete the demo-account block from `apps/mobile/src/app/sign-in.tsx`

---

## Deliberately not built yet

Named so nobody wonders whether they were forgotten: reading plans, audio,
highlighting, cross-device sync beyond notes, social sharing, push
notifications, offline packs, and billing. The premium card in **You** is a
placeholder with a `TODO(billing)` on it.

The AI Q&A surface is currently verse-scoped explanation only — free-form
conversation over scripture needs retrieval grounding (that is what the pgvector
table is for) and a much more careful prompt than a scaffold should ship.

---

## Scripture text

World English Bible — public domain, no attribution required, no licensing cost.
That is why it is the default. Modern translations (NIV, ESV, NLT) are
copyrighted and need a licensing agreement; the `Translation.is_premium` flag is
where they belong when you have one.
