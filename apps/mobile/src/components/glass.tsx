/**
 * Frosted glass surface.
 *
 * A translucent, blurred panel with a soft top sheen — for chrome that floats
 * over the page (the sidebar, the tab bar, the inspector). A readable wash sits
 * over the blur so text never drops below contrast: glass, not a clear window.
 */

import { BlurView } from 'expo-blur';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

export function Glass({
  children,
  style,
  intensity = 30,
  sheen = true,
  ...rest
}: ViewProps & { intensity?: number; sheen?: boolean }) {
  const t = useTheme();
  const dark = t.scheme === 'dark';
  // ~80% opaque so scripture and labels stay legible over whatever is behind.
  const wash = dark ? 'rgba(22,19,13,0.62)' : 'rgba(255,253,246,0.66)';

  return (
    <View style={[styles.clip, style]} {...rest}>
      <BlurView intensity={intensity} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} pointerEvents="none" />
      {sheen ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderTopWidth: 1, borderTopColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)' },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
