/** Formatting helpers used by more than one app. Pure functions only. */

import type { Book, Verse } from './api';

/** "John 3:16" from its parts. Uses the citation form, so Psalms → "Psalm". */
export function formatReference(book: Pick<Book, 'reference_name'>, chapter: number, verse?: number): string {
  const base = `${book.reference_name} ${chapter}`;
  return verse === undefined ? base : `${base}:${verse}`;
}

/** "John 3:16-18" for a run of verses; falls back to a single reference. */
export function formatVerseRange(verses: Pick<Verse, 'reference' | 'number'>[]): string {
  if (verses.length === 0) return '';
  if (verses.length === 1) return verses[0].reference;

  const first = verses[0];
  const last = verses[verses.length - 1];
  return `${first.reference}-${last.number}`;
}

/** Relative time for note timestamps: "just now", "3h ago", "12 Mar". */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;

  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** First `n` characters on a word boundary, with an ellipsis. */
export function truncate(text: string, n = 120): string {
  if (text.length <= n) return text;
  const cut = text.slice(0, n);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > n * 0.6 ? lastSpace : n).trimEnd()}…`;
}
