/**
 * A shareable verse image.
 *
 * A calm, typographic composition — soft sage wash, the verse in serif, a hair
 * rule, the reference, and a quiet SELAH wordmark so every image that leaves the
 * app carries its name. Rendered at a fixed 4:5 ratio and captured to PNG by the
 * share screen. Theme-aware: lovely in light or dark.
 */

import type { Verse } from '@selah/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

/** Bigger type for short verses, smaller for long ones, so it always fits. */
function verseSize(length: number) {
  if (length < 90) return { fontSize: 29, lineHeight: 43 };
  if (length < 160) return { fontSize: 24, lineHeight: 37 };
  if (length < 260) return { fontSize: 21, lineHeight: 32 };
  return { fontSize: 18, lineHeight: 28 };
}

export const ShareableVerse = forwardRef<View, { verse: Verse; width: number }>(
  function ShareableVerse({ verse, width }, ref) {
    const t = useTheme();
    const height = Math.round(width * 1.25);
    const size = verseSize(verse.text.length);

    // Soft, token-derived wash: a whisper of sage settling into the paper.
    const wash: [string, string] =
      t.scheme === 'dark'
        ? [t.colors.surfaceMuted, t.colors.background]
        : [t.colors.accentMuted, t.colors.background];

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.card,
          { width, height, borderRadius: t.radius.lg, borderColor: t.colors.border },
        ]}
      >
        <LinearGradient
          colors={wash}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <Text
          style={[styles.mark, { color: t.colors.accent, fontFamily: t.fonts.serif }]}
        >
          “
        </Text>

        <View style={styles.body}>
          <Text style={[styles.verse, size, { fontFamily: t.fonts.serif }]}>{verse.text}</Text>
          <View style={[styles.rule, { backgroundColor: t.colors.accent }]} />
          <Text variant="overline" tone="accent" center>
            {verse.reference.toUpperCase()}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text variant="overline" tone="subtle" center style={styles.wordmark}>
            SELAH
          </Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  mark: { position: 'absolute', top: 2, left: 22, fontSize: 120, lineHeight: 120, opacity: 0.12 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 22 },
  verse: { textAlign: 'center', letterSpacing: -0.2 },
  rule: { width: 40, height: 2, borderRadius: 2, opacity: 0.85 },
  footer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  wordmark: { letterSpacing: 3 },
});
