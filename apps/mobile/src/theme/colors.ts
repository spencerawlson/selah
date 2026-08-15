/**
 * Palette.
 *
 * The app is meant to feel like good paper, not like a dashboard: warm neutrals,
 * a single terracotta accent for actions, and muted gold reserved for premium.
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
    background: '#FBF7F1',
    surface: '#FFFFFF',
    surfaceMuted: '#F2ECE3',
    border: '#E7DED1',

    text: '#1B1917',
    textMuted: '#6C645A',
    textSubtle: '#9C9387',
    textOnAccent: '#FFFFFF',

    accent: '#A85B32',
    accentPressed: '#8E4B27',
    accentMuted: '#F6E7DD',

    gold: '#A9803A',
    goldMuted: '#F6EEDD',

    highlight: '#FAEFD8',

    danger: '#B3261E',
    dangerMuted: '#FBE9E7',
  },

  dark: {
    background: '#121110',
    surface: '#1B1917',
    surfaceMuted: '#252120',
    border: '#332E2A',

    text: '#F4EFE8',
    textMuted: '#A9A093',
    textSubtle: '#7D746A',
    textOnAccent: '#1B1917',

    accent: '#E08B5C',
    accentPressed: '#C97748',
    accentMuted: '#3A2A20',

    gold: '#D6B069',
    goldMuted: '#332A18',

    highlight: '#3A2F1C',

    danger: '#F2B8B5',
    dangerMuted: '#3B1E1C',
  },
};
