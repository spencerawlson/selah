/**
 * Verse action popup — shown inline, directly under the tapped verse.
 *
 * Like it (→ Favorites), study it in one of four voices (→ Study tab), or open
 * it in Notes to write around it with AI help (→ Notes tab).
 */

import { Ionicons } from '@expo/vector-icons';
import type { Tone } from '@selah/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/components/haptics';
import { Button, Divider, Pill, Row, Text } from '@/components/ui';
import { useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

const TONES: Tone[] = ['plain', 'devotional', 'scholarly', 'kids'];

export function VerseActions({
  liked,
  onToggleLike,
  onStudy,
  onNotes,
}: {
  liked: boolean;
  onToggleLike: () => void;
  onStudy: (tone: Tone) => void;
  onNotes: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useLocale();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: t.colors.surfaceMuted,
          borderColor: t.colors.border,
          borderRadius: t.radius.md,
        },
      ]}
    >
      <Pressable
        onPress={() => {
          tapFeedback();
          onToggleLike();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.likeRow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={20}
          color={liked ? t.colors.accent : t.colors.text}
        />
        <Text variant="callout" tone={liked ? 'accent' : 'default'}>
          {liked ? tr('verseact.unlike') : tr('verseact.like')}
        </Text>
      </Pressable>

      <Divider />

      <Text variant="overline" tone="subtle" style={styles.label}>
        {tr('verseact.study').toUpperCase()}
      </Text>
      <Row gap={8} style={styles.tones}>
        {TONES.map((tone) => (
          <Pill key={tone} label={tr(`tone.${tone}`)} onPress={() => onStudy(tone)} />
        ))}
      </Row>

      <Button
        title={tr('verseact.notes')}
        icon="create-outline"
        variant="secondary"
        fullWidth
        style={styles.notes}
        onPress={onNotes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
    marginTop: 4,
    marginBottom: 6,
    marginLeft: 26, // line up under the verse text, past the verse number
  },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  label: { marginTop: 2 },
  tones: { flexWrap: 'wrap' },
  notes: { marginTop: 6 },
});
