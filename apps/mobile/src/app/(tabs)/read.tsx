/**
 * Read — the book/chapter picker.
 *
 * Books grouped by testament, each expanding to a grid of chapter numbers.
 * Only seeded chapters appear, so the app never offers a page it cannot open.
 */

import type { Book, Chapter } from '@selah/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Card, Row, SectionHeader, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export default function ReadScreen() {
  const t = useTheme();
  const { data: books, error, isLoading, isRefreshing, refresh } = useAsync(
    (signal) => api.getBooks(signal),
    [],
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const oldTestament = books?.filter((b) => b.testament === 'old') ?? [];
  const newTestament = books?.filter((b) => b.testament === 'new') ?? [];

  return (
    <Screen
      title="Read"
      subtitle="The World English Bible."
      onRefresh={refresh}
      refreshing={isRefreshing}
    >
      {isLoading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      {books && books.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="No books loaded"
          message="Run `python -m app.db.seed` in apps/api to load the sample chapters."
        />
      ) : null}

      {oldTestament.length > 0 ? (
        <View style={{ gap: t.spacing.md, marginBottom: t.spacing.xxl }}>
          <SectionHeader title="Old Testament" />
          {oldTestament.map((book) => (
            <BookRow
              key={book.id}
              book={book}
              expanded={expanded === book.slug}
              onToggle={() => setExpanded(expanded === book.slug ? null : book.slug)}
            />
          ))}
        </View>
      ) : null}

      {newTestament.length > 0 ? (
        <View style={{ gap: t.spacing.md }}>
          <SectionHeader title="New Testament" />
          {newTestament.map((book) => (
            <BookRow
              key={book.id}
              book={book}
              expanded={expanded === book.slug}
              onToggle={() => setExpanded(expanded === book.slug ? null : book.slug)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function BookRow({
  book,
  expanded,
  onToggle,
}: {
  book: Book;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();

  return (
    <Card padded={false} style={styles.bookCard}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [{ padding: t.spacing.lg, opacity: pressed ? 0.7 : 1 }]}
      >
        <Row style={styles.between}>
          <View style={styles.bookText}>
            <Text variant="title">{book.name}</Text>
            {book.blurb ? (
              <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {book.blurb}
              </Text>
            ) : null}
          </View>
          <Text variant="caption" tone="subtle">
            {book.chapter_count} {book.chapter_count === 1 ? 'ch' : 'chs'}
          </Text>
        </Row>
      </Pressable>

      {expanded ? <ChapterGrid book={book} /> : null}
    </Card>
  );
}

function ChapterGrid({ book }: { book: Book }) {
  const t = useTheme();
  const router = useRouter();
  const { data, error, isLoading } = useAsync((signal) => api.getChapters(book.slug, signal), [
    book.slug,
  ]);

  return (
    <View
      style={{
        paddingHorizontal: t.spacing.lg,
        paddingBottom: t.spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: t.colors.border,
        paddingTop: t.spacing.lg,
      }}
    >
      {isLoading ? <LoadingState label="Loading chapters…" /> : null}
      {error ? <ErrorState error={error} /> : null}

      <View style={styles.grid}>
        {data?.map((chapter: Chapter) => (
          <Pressable
            key={chapter.id}
            onPress={() => router.push(`/chapter/${chapter.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${book.name} chapter ${chapter.number}`}
            style={({ pressed }) => [
              styles.chapterChip,
              {
                backgroundColor: pressed ? t.colors.accentMuted : t.colors.surfaceMuted,
                borderRadius: t.radius.md,
              },
            ]}
          >
            <Text variant="heading">{chapter.number}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bookCard: { overflow: 'hidden' },
  between: { justifyContent: 'space-between', gap: 12 },
  bookText: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chapterChip: {
    minWidth: 52,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
