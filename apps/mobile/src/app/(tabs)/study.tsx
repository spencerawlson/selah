/**
 * Study — look up any verse and have it explained.
 *
 * Two ways in, because people arrive with either a reference in mind or a
 * phrase they half-remember: exact lookup ("John 3:16") and keyword search.
 */

import type { Tone } from '@selah/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { ErrorState, GeneratingState } from '@/components/states';
import { Button, Card, Pill, Row, SectionHeader, Text } from '@/components/ui';
import { ExplanationView, VerseCard } from '@/components/verse';
import { useTheme } from '@/theme';

const TONES: { value: Tone; label: string }[] = [
  { value: 'plain', label: 'Plain' },
  { value: 'devotional', label: 'Devotional' },
  { value: 'scholarly', label: 'Scholarly' },
  { value: 'kids', label: 'For kids' },
];

/** Looks like a reference ("John 3:16") rather than a search phrase. */
function isReference(input: string): boolean {
  return /^\s*(?:[1-3]\s*)?[A-Za-z][A-Za-z\s.]*\s*\d+\s*[:.]\s*\d+\s*$/.test(input);
}

export default function StudyScreen() {
  const t = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [tone, setTone] = useState<Tone>('plain');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<Awaited<ReturnType<typeof api.explainVerse>> | null>(
    null,
  );
  const [failure, setFailure] = useState<ApiError | null>(null);

  // Keyword search runs only when the input clearly is not a reference.
  const search = useAsync(
    async (signal) =>
      submitted && !isReference(submitted) ? api.searchVerses(submitted, signal) : null,
    [submitted],
  );

  async function explain(reference: string, nextTone: Tone = tone) {
    setExplaining(true);
    setFailure(null);
    setExplanation(null);
    try {
      setExplanation(await api.explainVerse({ reference, tone: nextTone }));
    } catch (caught) {
      setFailure(
        caught instanceof ApiError
          ? caught
          : new ApiError('internal_error', 'Could not explain that verse.', 0),
      );
    } finally {
      setExplaining(false);
    }
  }

  function submit() {
    const value = query.trim();
    if (!value) return;

    setSubmitted(value);
    if (isReference(value)) void explain(value);
    else {
      setExplanation(null);
      setFailure(null);
    }
  }

  function changeTone(next: Tone) {
    setTone(next);
    // Re-explain in the new voice if we are already showing one.
    if (explanation) void explain(explanation.verse.reference, next);
  }

  return (
    <Screen title="Study" subtitle="Ask about any verse.">
      <Card style={{ gap: t.spacing.md, marginBottom: t.spacing.xl }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          placeholder="John 3:16, or a phrase like “do not be anxious”"
          placeholderTextColor={t.colors.textSubtle}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Verse reference or search phrase"
          style={[
            styles.input,
            t.typography.body,
            {
              backgroundColor: t.colors.surfaceMuted,
              borderRadius: t.radius.md,
              color: t.colors.text,
            },
          ]}
        />

        <Row gap={8} style={styles.wrap}>
          {TONES.map((option) => (
            <Pill
              key={option.value}
              label={option.label}
              selected={tone === option.value}
              onPress={() => changeTone(option.value)}
            />
          ))}
        </Row>

        <Button
          title="Explain"
          icon="sparkles-outline"
          fullWidth
          loading={explaining}
          disabled={!query.trim()}
          onPress={submit}
        />
      </Card>

      {explaining ? <GeneratingState /> : null}
      {failure ? (
        <ErrorState error={failure} onRetry={() => submitted && void explain(submitted)} />
      ) : null}

      {explanation && !explaining ? (
        <ExplanationView
          explanation={explanation}
          onSelectRelated={(reference) => {
            setQuery(reference);
            void explain(reference);
          }}
        />
      ) : null}

      {search.error ? <ErrorState error={search.error} onRetry={search.refresh} /> : null}

      {search.data ? (
        <View style={{ gap: t.spacing.md }}>
          <SectionHeader title={`${search.data.total} matches for “${submitted}”`} />
          {search.data.items.length === 0 ? (
            <Card variant="muted">
              <Text variant="callout" tone="muted">
                Nothing in the loaded chapters matches that. The sample data set covers Genesis 1,
                Psalm 23 and 100, John 3, 1 Corinthians 13, and Philippians 4.
              </Text>
            </Card>
          ) : null}
          {search.data.items.map((verse) => (
            <VerseCard
              key={verse.id}
              verse={verse}
              onPress={() => router.push(`/verse/${verse.id}`)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12 },
  wrap: { flexWrap: 'wrap' },
});
