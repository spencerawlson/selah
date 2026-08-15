-- Runs once, the first time the database volume is created.
--
-- Only extensions belong here. Tables come from the application
-- (`app.db.session.init_db`, and Alembic once you add it) so there is exactly
-- one definition of the schema.

-- Semantic search over verses and explanations.
CREATE EXTENSION IF NOT EXISTS vector;

-- Trigram indexes make ILIKE keyword search fast enough to keep as the
-- fallback path when an embedding is missing.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
