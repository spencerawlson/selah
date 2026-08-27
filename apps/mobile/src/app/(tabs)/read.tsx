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
import type { ExplanationWithVerse, Testament, Tone, Verse } from '@selah/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { bookName, localBookName } from '@/data/bookNames';
import { Glass } from '@/components/glass';
import { tapFeedback } from '@/components/haptics';
import { EmptyState, ErrorState, GeneratingState, LoadingState } from '@/components/states';
import { Pill, Row, Segmented, Text } from '@/components/ui';
import { ExplanationView, VerseLine } from '@/components/verse';
import { VerseActions } from '@/components/verseActions';
import { useAuth } from '@/state/auth';
import { TRANSLATION_FOR, useLocale } from '@/state/locale';
import { useReader } from '@/state/reader';
import { useTheme } from '@/theme';

const TONES: Tone[] = ['plain', 'devotional', 'scholarly', 'kids'];

const WIDE = 900;

export default function ReadScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const { mode, setMode } = useReader();
  const { locale, t: tr } = useLocale();
  const { isSignedIn } = useAuth();
  const immersion = mode === 'immersion';

  const [slug, setSlug] = useState('john');
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Verse | null>(null);
  const [explanation, setExplanation] = useState<ExplanationWithVerse | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [inspectorTone, setInspectorTone] = useState<Tone>('plain');
  const [testament, setTestament] = useState<Testament>('new');
  const [pickerOpen, setPickerOpen] = useState(true);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  // The verse whose inline action popup is open; null when none.
  const [openVerseId, setOpenVerseId] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

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

  // The reader's liked verses (their favorites), so hearts show filled state.
  const favorites = useAsync(
    (signal) => (isSignedIn ? api.getFavorites(signal) : Promise.resolve(null)),
    [isSignedIn],
  );
  useEffect(() => {
    setLikedIds(favorites.data ? new Set(favorites.data.items.map((f) => f.verse_id)) : new Set());
  }, [favorites.data]);

  const toggleLike = useCallback(
    async (verseId: number) => {
      if (!isSignedIn) {
        router.push('/sign-in');
        return;
      }
      tapFeedback();
      const wasLiked = likedIds.has(verseId);
      // Optimistic — flip immediately, roll back only if the call fails.
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(verseId);
        else next.add(verseId);
        return next;
      });
      try {
        if (wasLiked) await api.removeFavorite(verseId);
        else await api.addFavorite(verseId);
      } catch {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(verseId);
          else next.delete(verseId);
          return next;
        });
      }
    },
    [isSignedIn, likedIds, router],
  );

  // When navigation jumps into another book's chapter (e.g. tapping a related
  // verse in the inspector), keep the book + Testament picker in step with it.
  useEffect(() => {
    const cd = chapter.data;
    if (cd && cd.book_slug !== slug) {
      setSlug(cd.book_slug);
      const match = books.data?.find((b) => b.slug === cd.book_slug);
      if (match) setTestament(match.testament);
    }
  }, [chapter.data]);

  // On wide screens the Context Inspector shows a live explanation of the verse.
  const openVerse = useCallback(
    async (verse: Verse, tone: Tone = 'plain') => {
      if (!wide) return;
      setSelected(verse);
      setInspectorTone(tone);
      setRelatedError(null);
      setExplaining(true);
      setExplanation(null);
      try {
        setExplanation(await api.explainVerse({ verse_id: verse.id, tone, language: locale }));
      } catch {
        setExplanation(null);
      } finally {
        setExplaining(false);
      }
    },
    [wide, locale],
  );

  // Tapping a verse toggles its inline action popup (and, on wide, previews the
  // explanation in the inspector).
  const handleVersePress = useCallback(
    (verse: Verse) => {
      setOpenVerseId((current) => (current === verse.id ? null : verse.id));
      if (wide) void openVerse(verse);
    },
    [wide, openVerse],
  );

  // The popup's actions route into the matching tabs.
  const studyVerse = useCallback(
    (verseId: number, tone: Tone) => {
      setOpenVerseId(null);
      router.navigate(`/study?verse=${verseId}&tone=${tone}`);
    },
    [router],
  );
  const noteVerse = useCallback(
    (verseId: number) => {
      setOpenVerseId(null);
      router.navigate(`/notes?verse=${verseId}`);
    },
    [router],
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
  const currentBookName = currentBook
    ? localBookName(currentBook, locale)
    : bookName(slug, chapter.data?.book_name ?? '', locale);
  const title = chapter.data
    ? `${bookName(chapter.data.book_slug, chapter.data.book_name, locale)} ${chapter.data.number}`
    : 'Reader';

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
                          label={localBookName(book, locale)}
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
              {bookName(chapter.data.book_slug, chapter.data.book_name, locale)} {chapter.data.number}
              :1–{verses.data.length}
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
                <View key={verse.id}>
                  <VerseLine
                    verse={verse}
                    selected={openVerseId === verse.id || selected?.id === verse.id}
                    onPress={() => handleVersePress(verse)}
                    liked={likedIds.has(verse.id)}
                    onToggleLike={() => toggleLike(verse.id)}
                  />
                  {openVerseId === verse.id ? (
                    <VerseActions
                      liked={likedIds.has(verse.id)}
                      onToggleLike={() => toggleLike(verse.id)}
                      onStudy={(tone) => studyVerse(verse.id, tone)}
                      onNotes={() => noteVerse(verse.id)}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Context Inspector (wide screens) */}
      {wide ? (
        <Glass style={[styles.inspector, { borderLeftColor: t.colors.border }]}>
          <View style={[styles.inspectorHead, { borderBottomColor: t.colors.border }]}>
            <Row style={styles.between}>
              <Text variant="heading">{tr('inspector.title')}</Text>
              {selected ? (
                <Row gap={16}>
                  <Pressable
                    onPress={() => toggleLike(selected.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      likedIds.has(selected.id) ? tr('verseact.unlike') : tr('verseact.like')
                    }
                  >
                    <Ionicons
                      name={likedIds.has(selected.id) ? 'heart' : 'heart-outline'}
                      size={20}
                      color={likedIds.has(selected.id) ? t.colors.accent : t.colors.textSubtle}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => router.navigate(`/notes?verse=${selected.id}`)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={tr('verseact.notes')}
                  >
                    <Ionicons name="create-outline" size={20} color={t.colors.textSubtle} />
                  </Pressable>
                </Row>
              ) : null}
            </Row>
          </View>
          <ScrollView contentContainerStyle={{ padding: t.spacing.lg }}>
            {selected ? (
              <Row gap={8} style={[styles.tones, { marginBottom: t.spacing.md }]}>
                {TONES.map((tone) => (
                  <Pill
                    key={tone}
                    label={tr(`tone.${tone}`)}
                    selected={inspectorTone === tone}
                    onPress={() => openVerse(selected, tone)}
                  />
                ))}
              </Row>
            ) : null}
            {explaining ? <GeneratingState /> : null}
            {!explaining && explanation ? (
              <ExplanationView
                explanation={explanation}
                onSelectRelated={async (reference) => {
                  try {
                    const target = await api.lookupVerse(reference, TRANSLATION_FOR[locale]);
                    setChapterId(target.chapter_id); // show the passage in the reader
                    void openVerse(target); // and its explanation in the inspector
                  } catch {
                    setRelatedError(reference);
                  }
                }}
              />
            ) : null}
            {!explaining && relatedError ? (
              <Text variant="caption" tone="danger" style={styles.relatedError}>
                {tr('verse.notLoadedBody').replace('{ref}', relatedError)}
              </Text>
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
  between: { justifyContent: 'space-between' },
  tones: { flexWrap: 'wrap' },
  relatedError: { paddingHorizontal: 20, paddingBottom: 16 },
});
