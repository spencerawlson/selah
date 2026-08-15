/**
 * The reader.
 *
 * The whole chapter in one scroll, in serif, with as little chrome as possible.
 * Tapping a verse selects it and raises an action bar — explain, save, or note
 * — so the reading surface itself stays free of buttons.
 */

import type { Verse } from '@selah/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/states';
import { Button, Card, Divider, Row, Text } from '@/components/ui';
import { VerseLine } from '@/components/verse';
import { useAuth } from '@/state/auth';
import { useTheme } from '@/theme';

export default function ChapterScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();

  const { id } = useLocalSearchParams<{ id: string }>();
  const chapterId = Number(id);

  const [selected, setSelected] = useState<Verse | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const chapter = useAsync((signal) => api.getChapter(chapterId, signal), [chapterId]);
  const verses = useAsync((signal) => api.getVerses(chapterId, signal), [chapterId]);

  const title = chapter.data ? `${chapter.data.book_name} ${chapter.data.number}` : '';

  async function summarize() {
    setSummarizing(true);
    try {
      const updated = await api.summarizeChapter(chapterId);
      setSummary(updated.summary);
    } catch (caught) {
      Alert.alert(
        'Could not summarise',
        caught instanceof ApiError ? caught.message : 'Something went wrong.',
      );
    } finally {
      setSummarizing(false);
    }
  }

  async function save(verse: Verse) {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    try {
      await api.addFavorite(verse.id);
      Alert.alert('Saved', `${verse.reference} is in your saved verses.`);
    } catch (caught) {
      Alert.alert(
        'Could not save',
        caught instanceof ApiError ? caught.message : 'Something went wrong.',
      );
    }
  }

  const shownSummary = summary ?? chapter.data?.summary ?? null;

  return (
    <>
      <Stack.Screen options={{ title }} />

      <Screen edges={{ top: false }} onRefresh={verses.refresh} refreshing={verses.isRefreshing}>
        {chapter.isLoading || verses.isLoading ? <LoadingState /> : null}
        {chapter.error ? <ErrorState error={chapter.error} onRetry={chapter.refresh} /> : null}
        {verses.error ? <ErrorState error={verses.error} onRetry={verses.refresh} /> : null}

        {chapter.data ? (
          <View style={{ marginBottom: t.spacing.xl }}>
            <Text variant="display">{title}</Text>
            <Text variant="caption" tone="subtle" style={{ marginTop: t.spacing.xs }}>
              {chapter.data.verse_count} verses · World English Bible
            </Text>
          </View>
        ) : null}

        {/* Chapter summary: opt-in, so opening a chapter never costs a generation. */}
        {shownSummary ? (
          <Card variant="muted" style={{ gap: t.spacing.sm, marginBottom: t.spacing.xl }}>
            <Text variant="overline" tone="subtle">
              IN SHORT
            </Text>
            <Text variant="body">{shownSummary}</Text>
          </Card>
        ) : chapter.data ? (
          <Button
            title="Summarise this chapter"
            variant="secondary"
            icon="sparkles-outline"
            loading={summarizing}
            onPress={summarize}
            style={{ marginBottom: t.spacing.xl }}
          />
        ) : null}

        <View style={{ gap: t.spacing.xs }}>
          {verses.data?.map((verse) => (
            <VerseLine
              key={verse.id}
              verse={verse}
              selected={selected?.id === verse.id}
              onPress={() => setSelected(selected?.id === verse.id ? null : verse)}
            />
          ))}
        </View>

        {verses.data && verses.data.length > 0 ? (
          <Text variant="caption" tone="subtle" center style={{ marginTop: t.spacing.xxl }}>
            Tap any verse to explain or save it.
          </Text>
        ) : null}
      </Screen>

      {/* Action bar for the selected verse. */}
      {selected ? (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: t.colors.surface,
              borderTopColor: t.colors.border,
              paddingBottom: insets.bottom + t.spacing.md,
            },
          ]}
        >
          <Text variant="overline" tone="accent">
            {selected.reference.toUpperCase()}
          </Text>
          <Divider style={{ marginVertical: t.spacing.md }} />
          <Row gap={8}>
            <Button
              title="Explain"
              icon="sparkles-outline"
              style={styles.action}
              onPress={() => router.push(`/verse/${selected.id}`)}
            />
            <Button
              title="Save"
              icon="bookmark-outline"
              variant="secondary"
              style={styles.action}
              onPress={() => void save(selected)}
            />
          </Row>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: { flex: 1 },
});
