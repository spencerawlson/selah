/**
 * Verse action sheet.
 *
 * Tapping a verse in the reader opens this: like it (→ favorites), study it in
 * one of four voices, or open it in Notes to write around it with AI help.
 */

import { Ionicons } from '@expo/vector-icons';
import type { Tone, Verse } from '@selah/shared';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapFeedback } from '@/components/haptics';
import { Button, Divider, Pill, Row, Text } from '@/components/ui';
import { useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

const TONES: Tone[] = ['plain', 'devotional', 'scholarly', 'kids'];

export function VerseActionSheet({
  verse,
  liked,
  onClose,
  onToggleLike,
  onStudy,
  onNotes,
}: {
  verse: Verse | null;
  liked: boolean;
  onClose: () => void;
  onToggleLike: () => void;
  onStudy: (tone: Tone) => void;
  onNotes: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr } = useLocale();

  return (
    <Modal
      visible={verse !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        {/* Stop taps on the sheet from closing it. */}
        <Pressable
          onPress={() => {}}
          style={[
            styles.sheet,
            {
              backgroundColor: t.colors.surface,
              borderColor: t.colors.border,
              borderTopLeftRadius: t.radius.xl,
              borderTopRightRadius: t.radius.xl,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.colors.border }]} />

          {verse ? (
            <>
              <Text variant="overline" tone="accent">
                {verse.reference.toUpperCase()}
              </Text>
              <Text variant="quote" style={styles.verse} numberOfLines={3}>
                {verse.text}
              </Text>

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
                  size={22}
                  color={liked ? t.colors.accent : t.colors.text}
                />
                <Text variant="heading">{liked ? tr('verseact.unlike') : tr('verseact.like')}</Text>
              </Pressable>

              <Divider style={styles.divider} />

              <Text variant="overline" tone="subtle">
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
                style={styles.notesBtn}
                onPress={onNotes}
              />
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,16,10,0.4)' },
  sheet: { paddingHorizontal: 24, paddingTop: 10, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  verse: { marginTop: 2 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, marginTop: 6 },
  divider: { marginVertical: 4 },
  tones: { flexWrap: 'wrap' },
  notesBtn: { marginTop: 14 },
});
