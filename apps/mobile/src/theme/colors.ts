/**
 * Palette.
 *
 * Selah wears the Lumen palette, light mode only: warm cream paper, ink text,
 * a gold accent, and a soft gold verse highlight. Deliberately not dark-aware.
 * Scripture is always the highest-contrast thing on screen — chrome recedes.
 */

export type ColorScheme = 'light' | 'dark';

/** Every colour the app is allowed to use. Adding one means adding it here. */
export interface Colors {
  /** Page background — warm off-white, easier on the eyes than pure white. */
  background: string;
  /** Cards and sheets that sit above the page. */
  surface: string;
  /** Quiet fills: inputs, chips, skeletons. */
  surfaceMuted: string;
  border: string;

  /** Scripture and headings. */
  text: string;
  /** Supporting copy. */
  textMuted: string;
  /** Verse numbers, timestamps, captions. */
  textSubtle: string;
  /** Text on an accent-filled surface. */
  textOnAccent: string;

  accent: string;
  accentPressed: string;
  accentMuted: string;

  /** Premium and saved-verse marks. */
  gold: string;
  goldMuted: string;

  /** Selected verse in the reader. */
  highlight: string;

  danger: string;
  dangerMuted: string;
}

export const palette: Record<ColorScheme, Colors> = {
  // Exact Lumen palette. Kept 1:1 with the Lumen mockup's CSS custom properties
  // (--bg/--shell/--surface/--surface2/--ink/--muted/--line/--gold) plus its
  // section-label, verse-highlight and vnum tints. Selah is Lumen, in light.
  light: {
    background: '#FAF8F3', //  --shell
    surface: '#FFFDF8', //  --surface
    surfaceMuted: '#F3EEE4', //  --surface2
    border: '#DED7CA', //  --line

    text: '#201D19', //  --ink
    textMuted: '#777066', //  --muted
    textSubtle: '#968B7B', //  .section-label
    textOnAccent: '#FFFFFF',

    accent: '#A48350', //  --gold
    accentPressed: '#8A6E3D',
    accentMuted: '#F2E9D8',

    gold: '#A48350', //  --gold
    goldMuted: '#F2E9D8',

    highlight: '#F2E8D6', //  .verseblock.highlight

    danger: '#B3261E',
    dangerMuted: '#F6E5E0',
  },

  // Night reading: a warm near-black ground, warm off-white text, and a brighter
  // gold accent lifted for contrast.
  dark: {
    background: '#0C0B08',
    surface: '#16130D',
    surfaceMuted: '#201B12',
    border: '#322B1E',

    text: '#EDE7D6',
    textMuted: '#A79C86',
    textSubtle: '#746B57',
    textOnAccent: '#16130D',

    accent: '#CBA96A',
    accentPressed: '#B18F52',
    accentMuted: '#241D10',

    gold: '#CBA96A',
    goldMuted: '#241D10',

    highlight: '#241D10',

    danger: '#F2B8B5',
    dangerMuted: '#2A1513',
  },
};
