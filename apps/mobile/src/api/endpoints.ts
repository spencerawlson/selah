/**
 * Every API call the app can make, in one file.
 *
 * Thin by design — each function is a typed name for one route. Grouping them
 * here means a backend change has exactly one place to land on the client.
 */

import type {
  AuthSession,
  Book,
  Chapter,
  ChapterWithBook,
  ExplanationRequest,
  ExplanationWithVerse,
  Favorite,
  Note,
  Page,
  Today,
  Translation,
  User,
  Verse,
} from '@selah/shared';

import { request } from './client';

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
export const getToday = (translation?: string, signal?: AbortSignal) =>
  request<Today>('/today', { query: translation ? { translation } : undefined, signal });

// ---------------------------------------------------------------------------
// Bible
// ---------------------------------------------------------------------------
export const getTranslations = (signal?: AbortSignal) =>
  request<Translation[]>('/translations', { signal });

export const getBooks = (signal?: AbortSignal) => request<Book[]>('/books', { signal });

export const getBook = (bookId: string | number, signal?: AbortSignal) =>
  request<Book>(`/books/${bookId}`, { signal });

export const getChapters = (bookId: string | number, signal?: AbortSignal) =>
  request<Chapter[]>(`/books/${bookId}/chapters`, { signal });

export const getChapter = (chapterId: number, signal?: AbortSignal) =>
  request<ChapterWithBook>(`/chapters/${chapterId}`, { signal });

export const getVerses = (chapterId: number, translation?: string, signal?: AbortSignal) =>
  request<Verse[]>(`/chapters/${chapterId}/verses`, {
    query: translation ? { translation } : undefined,
    signal,
  });

export const getVerse = (verseId: number, signal?: AbortSignal) =>
  request<Verse>(`/verses/${verseId}`, { signal });

export const lookupVerse = (reference: string, translation?: string, signal?: AbortSignal) =>
  request<Verse>('/verses', {
    query: translation ? { reference, translation } : { reference },
    signal,
  });

export const searchVerses = (q: string, signal?: AbortSignal) =>
  request<Page<Verse>>('/search', { query: { q, limit: 30 }, signal });

// ---------------------------------------------------------------------------
// Explanations
// ---------------------------------------------------------------------------
export const explainVerse = (payload: ExplanationRequest, signal?: AbortSignal) =>
  request<ExplanationWithVerse>('/verse-explanations', { method: 'POST', body: payload, signal });

export const summarizeChapter = (chapterId: number, signal?: AbortSignal) =>
  request<Chapter>(`/chapters/${chapterId}/summary`, { method: 'POST', signal });

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export const getNotes = (signal?: AbortSignal) => request<Page<Note>>('/notes', { signal });

export const createNote = (
  payload: { body: string; title?: string; verse_id?: number },
  signal?: AbortSignal,
) => request<Note>('/notes', { method: 'POST', body: payload, signal });

export const updateNote = (
  noteId: string,
  payload: { body?: string; title?: string },
  signal?: AbortSignal,
) => request<Note>(`/notes/${noteId}`, { method: 'PATCH', body: payload, signal });

export const deleteNote = (noteId: string, signal?: AbortSignal) =>
  request<void>(`/notes/${noteId}`, { method: 'DELETE', signal });

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------
export const getFavorites = (signal?: AbortSignal) =>
  request<Page<Favorite>>('/favorites', { signal });

export const addFavorite = (verseId: number, signal?: AbortSignal) =>
  request<Favorite>('/favorites', { method: 'POST', body: { verse_id: verseId }, signal });

export const removeFavorite = (verseId: number, signal?: AbortSignal) =>
  request<void>(`/favorites/${verseId}`, { method: 'DELETE', signal });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const signUp = (
  payload: { email: string; password: string; display_name: string },
  signal?: AbortSignal,
) => request<AuthSession>('/auth/sign-up', { method: 'POST', body: payload, anonymous: true, signal });

export const signIn = (payload: { email: string; password: string }, signal?: AbortSignal) =>
  request<AuthSession>('/auth/sign-in', { method: 'POST', body: payload, anonymous: true, signal });

export const getMe = (signal?: AbortSignal) => request<User>('/auth/me', { signal });
