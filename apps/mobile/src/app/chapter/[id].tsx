/**
 * The reader.
 *
 * The whole chapter in one scroll, in serif, with as little chrome as possible.
 * Tapping a verse selects it and raises an action bar — explain, save, or note
 * — so the reading surface itself stays free of buttons.
 */

import type { Verse } from '@selah/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/states';
import { Button, Card, Divider, Row, Segmented, Text } from '@/components/ui';
import { VerseLine } from '@/components/verse';
import { useAuth } from '@/state/auth';
import { TRANSLATION_FOR, useLocale } from '@/state/locale';
import { useReader } from '@/state/reader';
import { useTheme } from '@/theme';

export default function ChapterScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { mode, setMode } = useReader();
  const { locale, t: tr } = useLocale();
  const immersion = mode === 'immersion';

  const { id } = useLocalSearchParams<{ id: string }>();
  const chapterId = Number(id);

  const [selected, setSelected] = useState<Verse | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const chapter = useAsync((signal) => api.getChapter(chapterId, signal), [chapterId]);
  const verses = useAsync(
    (signal) => api.getVerses(chapterId, TRANSLATION_FOR[locale], signal),
    [chapterId, locale],
  );

  const title = chapter.data ? `${chapter.data.book_name} ${chapter.data.number}` : '';

  // Immersion has no selection UI; clear any lingering pick when entering it.
  useEffect(() => {
    if (immersion) setSelected(null);
  }, [immersion]);

  async function summarize() {
    setSummarizing(true);
    try {
      const updated = await api.summarizeChapter(chapterId);
      setSummary(updated.summary);
    } catch (caught) {
      Alert.alert(
        tr('chapter.couldNotSummarise'),
        caught instanceof ApiError ? caught.message : tr('common.somethingWrong'),
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
      Alert.alert(tr('verse.savedTitle'), tr('verse.savedBody').replace('{ref}', verse.reference));
    } catch (caught) {
      Alert.alert(
        tr('verse.couldNotSave'),
        caught instanceof ApiError ? caught.message : tr('common.somethingWrong'),
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
          <View style={{ alignItems: 'center', marginBottom: t.spacing.xl, gap: t.spacing.md }}>
            <Text variant="display" center>
              {title}
            </Text>
            <Segmented
              options={[
                { value: 'immersion', label: tr('reader.immersion') },
                { value: 'study', label: tr('reader.study') },
              ]}
              value={mode}
              onChange={setMode}
            />
          </View>
        ) : null}

        {chapter.data && verses.data && verses.data.length > 0 ? (
          <Text variant="overline" tone="subtle" style={{ marginBottom: t.spacing.md }}>
            {chapter.data.book_name} {chapter.data.number}:1–{verses.data.length}
          </Text>
        ) : null}

        {!immersion ? (
          <>
            {/* Chapter summary: opt-in, so opening a chapter never costs a generation. */}
            {shownSummary ? (
              <Card variant="muted" style={{ gap: t.spacing.sm, marginBottom: t.spacing.xl }}>
                <Text variant="overline" tone="subtle">
                  {tr('chapter.inShort').toUpperCase()}
                </Text>
                <Text variant="body">{shownSummary}</Text>
              </Card>
            ) : chapter.data ? (
              <Button
                title={tr('chapter.summarise')}
                variant="secondary"
                icon="sparkles-outline"
                loading={summarizing}
                onPress={summarize}
                style={{ marginBottom: t.spacing.xl }}
              />
            ) : null}

            <View style={{ gap: t.spacing.sm }}>
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
                {tr('chapter.tapHint')}
              </Text>
            ) : null}
          </>
        ) : verses.data ? (
          // Immersion: flowing prose with faint superscript verse numbers.
          <Text variant="scripture" style={styles.immersionText}>
            {verses.data.map((verse) => (
              <Text key={verse.id}>
                <Text style={[styles.supNum, { color: t.colors.gold }]}>{verse.number} </Text>
                {verse.text}
                {'  '}
              </Text>
            ))}
          </Text>
        ) : null}
      </Screen>

      {/* Action bar for the selected verse (study mode only). */}
      {selected && !immersion ? (
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
              title={tr('chapter.explain')}
              icon="sparkles-outline"
              style={styles.action}
              onPress={() => router.push(`/verse/${selected.id}`)}
            />
            <Button
              title={tr('chapter.save')}
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
  immersionText: { lineHeight: 36 },
  supNum: { fontSize: 12 },
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
