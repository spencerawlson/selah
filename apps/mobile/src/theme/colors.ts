/**
 * Palette.
 *
 * The app is meant to feel like real paper: a soft, near-white linen page, ink
 * text, and a warm gold accent — the colour of the Selah mark itself.
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
  light: {
    background: '#FAF5EA',
    surface: '#FFFDF6',
    surfaceMuted: '#F1E9D6',
    border: '#E7DEC9',

    text: '#221E17',
    textMuted: '#756B58',
    textSubtle: '#A79C84',
    textOnAccent: '#FFFFFF',

    accent: '#A48350',
    accentPressed: '#8C6E3E',
    accentMuted: '#F1E7CF',

    gold: '#A48350',
    goldMuted: '#F1E7CF',

    highlight: '#F3E7CB',

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
