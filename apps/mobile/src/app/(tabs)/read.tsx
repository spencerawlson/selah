/**
 * Reader — the study workspace.
 *
 * The passage on the left (Immersion / Study toggle, gold verse numbers) and,
 * on a wide screen, the Context Inspector on the right: tap a verse and its
 * meaning, context, application and cross-references appear beside it, generated
 * by the AI. On a phone the inspector isn't shown side-by-side — tapping a verse
 * opens the full explanation screen instead.
 */

import { Ionicons } from '@expo/vector-icons';
import type { ExplanationWithVerse, Testament, Verse } from '@selah/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Glass } from '@/components/glass';
import { EmptyState, ErrorState, GeneratingState, LoadingState } from '@/components/states';
import { Pill, Row, Segmented, Text } from '@/components/ui';
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
  const [testament, setTestament] = useState<Testament>('new');
  const [pickerOpen, setPickerOpen] = useState(true);

  const books = useAsync((signal) => api.getBooks(signal), []);
  const chapters = useAsync((signal) => api.getChapters(slug, signal), [slug]);

  // Default to the first chapter of the chosen book whenever the list changes.
  useEffect(() => {
    if (chapters.data && chapters.data.length > 0) {
      const stillValid = chapters.data.some((c) => c.id === chapterId);
      if (!stillValid) setChapterId(chapters.data[0].id);
    }
  }, [chapters.data]);

  // Line the Testament tab up with the book being read, once, on first load.
  const didInitTestament = useRef(false);
  useEffect(() => {
    if (!didInitTestament.current && books.data) {
      const current = books.data.find((b) => b.slug === slug);
      if (current) setTestament(current.testament);
      didInitTestament.current = true;
    }
  }, [books.data, slug]);

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

  // Swipe left/right in the reader to move between the current book's chapters.
  const chapterIds = chapters.data?.map((c) => c.id) ?? [];
  const chapterIdx = chapterId ? chapterIds.indexOf(chapterId) : -1;
  const navRef = useRef({ ids: chapterIds, idx: chapterIdx, set: setChapterId });
  navRef.current = { ids: chapterIds, idx: chapterIdx, set: setChapterId };
  const swipe = useRef(
    PanResponder.create({
      // Claim horizontal drags only, so vertical scrolling still works.
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_e, g) => {
        const { ids, idx, set } = navRef.current;
        if (idx < 0) return;
        if (g.dx <= -60 && idx < ids.length - 1) set(ids[idx + 1]);
        else if (g.dx >= 60 && idx > 0) set(ids[idx - 1]);
      },
    }),
  ).current;

  const currentBook = books.data?.find((b) => b.slug === slug);
  const currentBookName = chapter.data?.book_name ?? currentBook?.name ?? '';
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
        {...swipe.panHandlers}
      >
        <View style={styles.column}>
          {/* Navigation: Testament → Book → Chapter. Collapsible, and the book
              and chapter lists wrap instead of scrolling off-screen, so every
              book is reachable — not cut off at Samuel. */}
          {books.data ? (
            <View style={styles.nav}>
              <Pressable
                onPress={() => setPickerOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel={currentBookName}
                style={({ pressed }) => [
                  styles.navHeader,
                  {
                    backgroundColor: t.colors.surfaceMuted,
                    borderColor: t.colors.border,
                    borderRadius: t.radius.md,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Row gap={8}>
                  <Ionicons name="book-outline" size={16} color={t.colors.accent} />
                  <Text variant="heading">
                    {currentBookName}
                    {chapter.data ? ` ${chapter.data.number}` : ''}
                  </Text>
                </Row>
                <Ionicons
                  name={pickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={t.colors.textMuted}
                />
              </Pressable>

              {pickerOpen ? (
                <View style={styles.picker}>
                  <Segmented
                    fullWidth
                    options={[
                      { value: 'old', label: tr('reader.ot') },
                      { value: 'new', label: tr('reader.nt') },
                    ]}
                    value={testament}
                    onChange={setTestament}
                  />

                  <View style={styles.grid}>
                    {books.data
                      .filter((book) => book.testament === testament)
                      .map((book) => (
                        <Pill
                          key={book.id}
                          label={book.name}
                          selected={book.slug === slug}
                          onPress={() => setSlug(book.slug)}
                        />
                      ))}
                  </View>

                  {chapters.data && chapters.data.length > 1 ? (
                    <>
                      <Text variant="overline" tone="subtle" style={styles.gridLabel}>
                        {tr('reader.chapter').toUpperCase()}
                      </Text>
                      <View style={styles.grid}>
                        {chapters.data.map((c) => (
                          <Pill
                            key={c.id}
                            label={String(c.number)}
                            selected={c.id === chapterId}
                            onPress={() => {
                              setChapterId(c.id);
                              setPickerOpen(false); // reveal the reading once a chapter is chosen
                            }}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
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
  nav: { gap: 10, marginBottom: 8 },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  picker: { gap: 12, paddingBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridLabel: { marginTop: 2 },
  head: { alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 16 },
  range: { marginBottom: 12 },
  immersionText: { lineHeight: 36 },
  supNum: { fontSize: 12 },
  inspector: { width: 340, borderLeftWidth: StyleSheet.hairlineWidth },
  inspectorHead: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
