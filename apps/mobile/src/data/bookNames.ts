/**
 * Localized book names, keyed by canonical slug.
 *
 * The API returns book names in English; these French/Spanish names (kept in
 * step with the backend's `canon.py`) let the reader show a book in the
 * language the user chose. English falls through to whatever the API sent.
 */

import type { Book } from '@selah/shared';

import type { Locale } from '@/state/locale';

const NAMES: Record<string, { fr: string; es: string }> = {
  genesis: { fr: 'Genèse', es: 'Génesis' },
  exodus: { fr: 'Exode', es: 'Éxodo' },
  leviticus: { fr: 'Lévitique', es: 'Levítico' },
  numbers: { fr: 'Nombres', es: 'Números' },
  deuteronomy: { fr: 'Deutéronome', es: 'Deuteronomio' },
  joshua: { fr: 'Josué', es: 'Josué' },
  judges: { fr: 'Juges', es: 'Jueces' },
  ruth: { fr: 'Ruth', es: 'Rut' },
  '1-samuel': { fr: '1 Samuel', es: '1 Samuel' },
  '2-samuel': { fr: '2 Samuel', es: '2 Samuel' },
  '1-kings': { fr: '1 Rois', es: '1 Reyes' },
  '2-kings': { fr: '2 Rois', es: '2 Reyes' },
  '1-chronicles': { fr: '1 Chroniques', es: '1 Crónicas' },
  '2-chronicles': { fr: '2 Chroniques', es: '2 Crónicas' },
  ezra: { fr: 'Esdras', es: 'Esdras' },
  nehemiah: { fr: 'Néhémie', es: 'Nehemías' },
  esther: { fr: 'Esther', es: 'Ester' },
  job: { fr: 'Job', es: 'Job' },
  psalms: { fr: 'Psaumes', es: 'Salmos' },
  proverbs: { fr: 'Proverbes', es: 'Proverbios' },
  ecclesiastes: { fr: 'Ecclésiaste', es: 'Eclesiastés' },
  'song-of-solomon': { fr: 'Cantique des Cantiques', es: 'Cantares' },
  isaiah: { fr: 'Ésaïe', es: 'Isaías' },
  jeremiah: { fr: 'Jérémie', es: 'Jeremías' },
  lamentations: { fr: 'Lamentations', es: 'Lamentaciones' },
  ezekiel: { fr: 'Ézéchiel', es: 'Ezequiel' },
  daniel: { fr: 'Daniel', es: 'Daniel' },
  hosea: { fr: 'Osée', es: 'Oseas' },
  joel: { fr: 'Joël', es: 'Joel' },
  amos: { fr: 'Amos', es: 'Amós' },
  obadiah: { fr: 'Abdias', es: 'Abdías' },
  jonah: { fr: 'Jonas', es: 'Jonás' },
  micah: { fr: 'Michée', es: 'Miqueas' },
  nahum: { fr: 'Nahum', es: 'Nahúm' },
  habakkuk: { fr: 'Habacuc', es: 'Habacuc' },
  zephaniah: { fr: 'Sophonie', es: 'Sofonías' },
  haggai: { fr: 'Aggée', es: 'Hageo' },
  zechariah: { fr: 'Zacharie', es: 'Zacarías' },
  malachi: { fr: 'Malachie', es: 'Malaquías' },
  matthew: { fr: 'Matthieu', es: 'Mateo' },
  mark: { fr: 'Marc', es: 'Marcos' },
  luke: { fr: 'Luc', es: 'Lucas' },
  john: { fr: 'Jean', es: 'Juan' },
  acts: { fr: 'Actes', es: 'Hechos' },
  romans: { fr: 'Romains', es: 'Romanos' },
  '1-corinthians': { fr: '1 Corinthiens', es: '1 Corintios' },
  '2-corinthians': { fr: '2 Corinthiens', es: '2 Corintios' },
  galatians: { fr: 'Galates', es: 'Gálatas' },
  ephesians: { fr: 'Éphésiens', es: 'Efesios' },
  philippians: { fr: 'Philippiens', es: 'Filipenses' },
  colossians: { fr: 'Colossiens', es: 'Colosenses' },
  '1-thessalonians': { fr: '1 Thessaloniciens', es: '1 Tesalonicenses' },
  '2-thessalonians': { fr: '2 Thessaloniciens', es: '2 Tesalonicenses' },
  '1-timothy': { fr: '1 Timothée', es: '1 Timoteo' },
  '2-timothy': { fr: '2 Timothée', es: '2 Timoteo' },
  titus: { fr: 'Tite', es: 'Tito' },
  philemon: { fr: 'Philémon', es: 'Filemón' },
  hebrews: { fr: 'Hébreux', es: 'Hebreos' },
  james: { fr: 'Jacques', es: 'Santiago' },
  '1-peter': { fr: '1 Pierre', es: '1 Pedro' },
  '2-peter': { fr: '2 Pierre', es: '2 Pedro' },
  '1-john': { fr: '1 Jean', es: '1 Juan' },
  '2-john': { fr: '2 Jean', es: '2 Juan' },
  '3-john': { fr: '3 Jean', es: '3 Juan' },
  jude: { fr: 'Jude', es: 'Judas' },
  revelation: { fr: 'Apocalypse', es: 'Apocalipsis' },
};

/** The book's name in the chosen language, falling back to the API's English. */
export function bookName(slug: string, fallback: string, locale: Locale): string {
  if (locale === 'fr') return NAMES[slug]?.fr ?? fallback;
  if (locale === 'es') return NAMES[slug]?.es ?? fallback;
  return fallback;
}

/**
 * Prefer the localized name the API now sends (`name_fr`/`name_es`); fall back
 * to the local map so it still localizes against an older server, then English.
 */
export function localBookName(
  book: Pick<Book, 'slug' | 'name' | 'name_fr' | 'name_es'>,
  locale: Locale,
): string {
  if (locale === 'fr') return book.name_fr || NAMES[book.slug]?.fr || book.name;
  if (locale === 'es') return book.name_es || NAMES[book.slug]?.es || book.name;
  return book.name;
}
