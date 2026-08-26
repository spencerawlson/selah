/**
 * Reader — the study workspace.
 *
 * The passage on the left (Immersion / Study toggle, gold verse numbers) and,
 * on a wide screen, the Context Inspector on the right: tap a verse and its
 * meaning, context, application and cross-references appear beside it, generated
 * by the AI. On a phone the inspector isn't shown side-by-side — tapping a verse
 * opens the full explanation screen instead.
 */

import type { ExplanationWithVerse, Verse } from '@selah/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Glass } from '@/components/glass';
import { EmptyState, ErrorState, GeneratingState, LoadingState } from '@/components/states';
import { Pill, Segmented, Text } from '@/components/ui';
import { ExplanationView, VerseLine } from '@/components/verse';
import { TRANSLATION_FOR, useLocale } from '@/state/locale';
import { useReader } from '@/state/reader';
import { useTheme } from '@/theme';

const WIDE = 900;

export default function ReadScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const { mode, setMode } = useReader();
  const { locale, t: tr } = useLocale();
  const immersion = mode === 'immersion';

  const [slug, setSlug] = useState('john');
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Verse | null>(null);
  const [explanation, setExplanation] = useState<ExplanationWithVerse | null>(null);
  const [explaining, setExplaining] = useState(false);

  const books = useAsync((signal) => api.getBooks(signal), []);
  const chapters = useAsync((signal) => api.getChapters(slug, signal), [slug]);

  // Default to the first chapter of the chosen book whenever the list changes.
  useEffect(() => {
    if (chapters.data && chapters.data.length > 0) {
      const stillValid = chapters.data.some((c) => c.id === chapterId);
      if (!stillValid) setChapterId(chapters.data[0].id);
    }
  }, [chapters.data]);

  const chapter = useAsync(
    (signal) => (chapterId ? api.getChapter(chapterId, signal) : Promise.resolve(null)),
    [chapterId],
  );
  const verses = useAsync(
    (signal) =>
      chapterId
        ? api.getVerses(chapterId, TRANSLATION_FOR[locale], signal)
        : Promise.resolve([] as Verse[]),
    [chapterId, locale],
  );

  const openVerse = useCallback(
    async (verse: Verse) => {
      if (!wide) {
        router.push(`/verse/${verse.id}`);
        return;
      }
      setSelected(verse);
      setExplaining(true);
      setExplanation(null);
      try {
        setExplanation(await api.explainVerse({ verse_id: verse.id, tone: 'plain', language: locale }));
      } catch {
        setExplanation(null);
      } finally {
        setExplaining(false);
      }
    },
    [wide, router, locale],
  );

  const title = chapter.data ? `${chapter.data.book_name} ${chapter.data.number}` : 'Reader';

  return (
    <View style={[styles.root, { flexDirection: wide ? 'row' : 'column', backgroundColor: t.colors.background }]}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 48,
          paddingHorizontal: 20,
        }}
      >
        <View style={styles.column}>
          {/* Book switcher */}
          {books.data ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillrow}>
              {books.data.map((book) => (
                <Pill
                  key={book.id}
                  label={book.name}
                  selected={book.slug === slug}
                  onPress={() => setSlug(book.slug)}
                />
              ))}
            </ScrollView>
          ) : null}

          {/* Chapter switcher */}
          {chapters.data && chapters.data.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillrow}>
              {chapters.data.map((c) => (
                <Pill
                  key={c.id}
                  label={String(c.number)}
                  selected={c.id === chapterId}
                  onPress={() => setChapterId(c.id)}
                />
              ))}
            </ScrollView>
          ) : null}

          {chapter.isLoading || verses.isLoading ? <LoadingState /> : null}
          {chapter.error ? <ErrorState error={chapter.error} onRetry={chapter.refresh} /> : null}

          {chapter.data ? (
            <View style={styles.head}>
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
            <Text variant="overline" tone="subtle" style={styles.range}>
              {chapter.data.book_name} {chapter.data.number}:1–{verses.data.length}
            </Text>
          ) : null}

          {/* Verses */}
          {immersion ? (
            verses.data && verses.data.length > 0 ? (
              <Text variant="scripture" style={styles.immersionText}>
                {verses.data.map((verse) => (
                  <Text key={verse.id}>
                    <Text style={[styles.supNum, { color: t.colors.gold }]}>{verse.number} </Text>
                    {verse.text}
                    {'  '}
                  </Text>
                ))}
              </Text>
            ) : null
          ) : (
            <View style={{ gap: t.spacing.sm }}>
              {verses.data?.map((verse) => (
                <VerseLine
                  key={verse.id}
                  verse={verse}
                  selected={selected?.id === verse.id}
                  onPress={() => openVerse(verse)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Context Inspector (wide screens) */}
      {wide ? (
        <Glass style={[styles.inspector, { borderLeftColor: t.colors.border }]}>
          <View style={[styles.inspectorHead, { borderBottomColor: t.colors.border }]}>
            <Text variant="heading">{tr('inspector.title')}</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: t.spacing.lg }}>
            {explaining ? <GeneratingState /> : null}
            {!explaining && explanation ? (
              <ExplanationView
                explanation={explanation}
                onSelectRelated={async (reference) => {
                  try {
                    const target = await api.lookupVerse(reference, TRANSLATION_FOR[locale]);
                    void openVerse(target);
                  } catch {
                    /* not in the sample set */
                  }
                }}
              />
            ) : null}
            {!explaining && !explanation ? (
              <EmptyState
                icon="book-outline"
                title={tr('inspector.emptyTitle')}
                message={tr('inspector.emptyMsg')}
              />
            ) : null}
          </ScrollView>
        </Glass>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  pillrow: { gap: 8, paddingVertical: 6, paddingRight: 8 },
  head: { alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 16 },
  range: { marginBottom: 12 },
  immersionText: { lineHeight: 36 },
  supNum: { fontSize: 12 },
  inspector: { width: 340, borderLeftWidth: StyleSheet.hairlineWidth },
  inspectorHead: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
