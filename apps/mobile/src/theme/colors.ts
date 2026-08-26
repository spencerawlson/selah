/**
 * Palette.
 *
 * The app is meant to feel like real paper: a soft, near-white linen page, ink
 * text, a calm slate-blue accent for actions, and muted gold reserved for premium.
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
    background: '#FAF7EF',
    surface: '#FFFDF8',
    surfaceMuted: '#F0EADD',
    border: '#E5DECF',

    text: '#201D19',
    textMuted: '#777066',
    textSubtle: '#A79E8B',
    textOnAccent: '#FFFFFF',

    accent: '#4E7C93',
    accentPressed: '#3F6579',
    accentMuted: '#E7EEF1',

    gold: '#A48350',
    goldMuted: '#F0E8D6',

    highlight: '#F3E9D3',

    danger: '#B3261E',
    dangerMuted: '#F6E5E0',
  },

  // Night reading: a soft cool near-black (matching the mockup's dark), warm-white
  // text, and the same slate-blue accent lifted for contrast.
  dark: {
    background: '#0A0B0C',
    surface: '#121315',
    surfaceMuted: '#1B1D1F',
    border: '#2C2E31',

    text: '#EEE9DF',
    textMuted: '#9C9992',
    textSubtle: '#6C6A65',
    textOnAccent: '#121315',

    accent: '#71A1B8',
    accentPressed: '#5C8AA2',
    accentMuted: '#17242A',

    gold: '#C8A96E',
    goldMuted: '#241F13',

    highlight: '#17242A',

    danger: '#F2B8B5',
    dangerMuted: '#2A1513',
  },
};
