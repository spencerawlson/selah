/**
 * Palette.
 *
 * The app is meant to feel like good paper, not a dashboard: bright, soft paper
 * with a calm blue accent for actions and muted gold reserved for premium.
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
    background: '#F7F5F0',
    surface: '#FFFFFF',
    surfaceMuted: '#EDEFEA',
    border: '#E2E3DD',

    text: '#232A2E',
    textMuted: '#5F6B70',
    textSubtle: '#96A1A6',
    textOnAccent: '#FFFFFF',

    accent: '#4E86A6',
    accentPressed: '#3E6E88',
    accentMuted: '#E4EEF3',

    gold: '#B08D57',
    goldMuted: '#F0E9DA',

    highlight: '#E7F0F5',

    danger: '#B3261E',
    dangerMuted: '#F6E5E2',
  },

  // OLED-optimized: true-black ground, near-black raised surfaces defined more by
  // hairline borders than fill, soft cool-white text, and a calm blue accent.
  dark: {
    background: '#000000',
    surface: '#0C0E10',
    surfaceMuted: '#15181B',
    border: '#262B2F',

    text: '#E6EAEC',
    textMuted: '#95A1A7',
    textSubtle: '#66727A',
    textOnAccent: '#0C0E10',

    accent: '#6FA8C9',
    accentPressed: '#5990B0',
    accentMuted: '#12222B',

    gold: '#CBA96A',
    goldMuted: '#241F13',

    highlight: '#12222B',

    danger: '#F2B8B5',
    dangerMuted: '#2A1513',
  },
};
