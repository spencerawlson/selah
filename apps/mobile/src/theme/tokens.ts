/**
 * Spacing, radii, and type scale.
 *
 * Two families on purpose: a serif for scripture (it signals "this is the text"
 * and is genuinely easier to read at length) and the system sans for everything
 * the app itself says. Both are platform built-ins, so there is no font to load
 * and no flash of unstyled text on launch.
 */

import { Platform } from 'react-native';

/** 4pt grid. Use the scale, not raw numbers. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fonts = {
  /** Scripture, and pull-quotes of scripture. */
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, "Times New Roman", serif',
  }) as string,
  /** Everything the app says in its own voice. */
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  }) as string,
} as const;

export const typography = {
  /** Screen titles. */
  display: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 29, letterSpacing: -0.2 },
  /** Verse text in the reader. Generous line height — this gets read for minutes. */
  scripture: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 34 },
  /** A single verse quoted on a card. */
  quote: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 32 },

  heading: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23 },
  callout: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21 },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17 },
  /** Section labels: SMALL CAPS, WIDE. */
  overline: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    fontWeight: '700' as const,
  },
} as const;

/** One elevation, used sparingly — flat surfaces with borders read cleaner. */
export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#2B2620',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: { boxShadow: '0 4px 12px rgba(43, 38, 32, 0.06)' },
  }) as object,
} as const;
