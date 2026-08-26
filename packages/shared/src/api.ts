/**
 * The API contract, hand-mirrored from the FastAPI Pydantic schemas.
 *
 * Kept by hand rather than generated because the surface is small and reading
 * it teaches you the domain. When it outgrows that, generate it instead:
 *
 *   npm run types:generate     (root) — writes this file from /openapi.json
 *
 * If you change a Pydantic schema in apps/api, change it here in the same commit.
 */

// ---------------------------------------------------------------------------
// Bible content
// ---------------------------------------------------------------------------

export type Testament = 'old' | 'new';

export interface Translation {
  id: number;
  code: string;
  name: string;
  language: string;
  license: string;
  is_premium: boolean;
}

export interface Book {
  id: number;
  slug: string;
  name: string;
  abbreviation: string;
  /** The form used inside a citation: "Psalm", not "Psalms". */
  reference_name: string;
  testament: Testament;
  position: number;
  chapter_count: number;
  blurb: string | null;
}

export interface Chapter {
  id: number;
  book_id: number;
  number: number;
  verse_count: number;
  summary: string | null;
}

export interface ChapterWithBook extends Chapter {
  book_name: string;
  book_slug: string;
}

export interface Verse {
  id: number;
  chapter_id: number;
  translation_id: number;
  number: number;
  text: string;
  /** "John 3:16" — denormalised so labels never need a join. */
  reference: string;
}

// ---------------------------------------------------------------------------
// Study
// ---------------------------------------------------------------------------

/** The voice an explanation is written in. Mirrors `Tone` in schemas/study.py. */
export type Tone = 'plain' | 'devotional' | 'scholarly' | 'kids';

export interface RelatedVerse {
  reference: string;
  reason: string;
}

/** The four-part structure the product promises on every verse. */
export interface Explanation {
  id: string;
  verse_id: number;
  tone: Tone;
  model: string;
  summary: string;
  meaning: string;
  context: string;
  application: string;
  related_verses: RelatedVerse[];
  created_at: string;
  /** True when served from a previous generation rather than freshly made. */
  cached: boolean;
}

export interface ExplanationWithVerse extends Explanation {
  verse: Verse;
}

export interface ExplanationRequest {
  verse_id?: number;
  reference?: string;
  translation_code?: string;
  tone?: Tone;
  language?: string;
  refresh?: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  verse_id: number | null;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  verse: Verse | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  verse_id: number;
  created_at: string;
  verse: Verse | null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  display_name: string;
  is_premium: boolean;
  auth_provider: string;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export interface FeaturedVerse {
  label: string;
  verse: Verse;
}

export interface Today {
  date: string;
  verse_of_the_day: FeaturedVerse | null;
  featured: FeaturedVerse[];
}

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Every failure from the API arrives in this shape. See core/errors.py. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details: Record<string, unknown>;
  };
}

export type ApiErrorCode =
  | 'bad_request'
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'upstream_error'
  | 'internal_error'
  | 'http_error'
  | 'network_error';

export interface Health {
  status: 'ok' | 'degraded';
  app: string;
  environment: string;
  version: string;
  database: string;
  ai_provider: string;
}
