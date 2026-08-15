/**
 * Theme access.
 *
 *   const t = useTheme();
 *   <View style={{ backgroundColor: t.colors.surface, padding: t.spacing.lg }} />
 *
 * Styles that depend on colour are built inside the component (colours change
 * with the scheme); everything static stays in a module-level StyleSheet.
 */

import { useColorScheme } from 'react-native';

import { type ColorScheme, type Colors, palette } from './colors';
import { fonts, radius, shadow, spacing, typography } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  fonts: typeof fonts;
  shadow: typeof shadow;
}

export function useTheme(): Theme {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: palette[scheme], spacing, radius, typography, fonts, shadow };
}

export { palette, spacing, radius, typography, fonts, shadow };
export type { ColorScheme, Colors };
