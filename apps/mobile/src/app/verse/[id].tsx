/**
 * A single verse, explained.
 *
 * Reached from Today, the reader, search, and related-verse links. Loads the
 * verse first so the text is on screen while the explanation generates.
 */

import { Ionicons } from '@expo/vector-icons';
import type { ExplanationWithVerse, Tone } from '@selah/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { ErrorState, GeneratingState, LoadingState } from '@/components/states';
import { Button, Card, Pill, Row, Text } from '@/components/ui';
import { ExplanationView } from '@/components/verse';
import { useAuth } from '@/state/auth';
import { TRANSLATION_FOR, useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

const TONES: { value: Tone; label: string }[] = [
  { value: 'plain', label: 'Plain' },
  { value: 'devotional', label: 'Devotional' },
  { value: 'scholarly', label: 'Scholarly' },
  { value: 'kids', label: 'For kids' },
];

export default function VerseScreen() {
  const t = useTheme();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { locale, t: tr } = useLocale();

  const { id } = useLocalSearchParams<{ id: string }>();
  const verseId = Number(id);

  const [tone, setTone] = useState<Tone>('plain');
  const [explanation, setExplanation] = useState<ExplanationWithVerse | null>(null);
  const [generating, setGenerating] = useState(true);
  const [failure, setFailure] = useState<ApiError | null>(null);

  const verse = useAsync((signal) => api.getVerse(verseId, signal), [verseId]);

  const explain = useCallback(
    async (nextTone: Tone, refresh = false) => {
      setGenerating(true);
      setFailure(null);
      try {
        setExplanation(
          await api.explainVerse({ verse_id: verseId, tone: nextTone, refresh, language: locale }),
        );
      } catch (caught) {
        setFailure(
          caught instanceof ApiError
            ? caught
            : new ApiError('internal_error', tr('verse.couldNotExplain'), 0),
        );
      } finally {
        setGenerating(false);
      }
    },
    [verseId, locale],
  );

  useEffect(() => {
    void explain(tone);
    // Re-runs when the verse or the chosen tone changes.
  }, [explain, tone]);

  async function save() {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    try {
      await api.addFavorite(verseId);
      Alert.alert(
        tr('verse.savedTitle'),
        tr('verse.savedBody').replace('{ref}', verse.data?.reference ?? ''),
      );
    } catch (caught) {
      Alert.alert(
        tr('verse.couldNotSave'),
        caught instanceof ApiError ? caught.message : tr('common.somethingWrong'),
      );
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: verse.data?.reference ?? tr('verse.title'),
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/share/${verseId}`)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Share this verse"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="share-outline" size={22} color={t.colors.accent} />
            </Pressable>
          ),
        }}
      />

      <Screen edges={{ top: false }}>
        {verse.isLoading ? <LoadingState /> : null}
        {verse.error ? <ErrorState error={verse.error} onRetry={verse.refresh} /> : null}

        {/* The verse itself is on screen immediately, before any generation. */}
        {verse.data && !explanation ? (
          <Card style={{ gap: t.spacing.md, marginBottom: t.spacing.lg }}>
            <Text variant="overline" tone="accent">
              {verse.data.reference.toUpperCase()}
            </Text>
            <Text variant="quote">{verse.data.text}</Text>
          </Card>
        ) : null}

        <Row gap={8} style={[styles.wrap, { marginBottom: t.spacing.lg }]}>
          {TONES.map((option) => (
            <Pill
              key={option.value}
              label={tr(`tone.${option.value}`)}
              selected={tone === option.value}
              onPress={() => setTone(option.value)}
            />
          ))}
        </Row>

        {generating ? <GeneratingState /> : null}
        {failure ? <ErrorState error={failure} onRetry={() => void explain(tone)} /> : null}

        {explanation && !generating ? (
          <ExplanationView
            explanation={explanation}
            onSelectRelated={async (reference) => {
              // Related verses are references, not ids — resolve, then navigate.
              try {
                const target = await api.lookupVerse(reference, TRANSLATION_FOR[locale]);
                router.push(`/verse/${target.id}`);
              } catch {
                Alert.alert(
                  tr('verse.notLoadedTitle'),
                  tr('verse.notLoadedBody').replace('{ref}', reference),
                );
              }
            }}
          />
        ) : null}

        {explanation && !generating ? (
          <Row gap={8} style={{ marginTop: t.spacing.xl }}>
            <Button
              title={tr('verse.save')}
              icon="bookmark-outline"
              variant="secondary"
              style={styles.action}
              onPress={save}
            />
            <Button
              title={tr('verse.regenerate')}
              icon="refresh"
              variant="ghost"
              style={styles.action}
              onPress={() => void explain(tone, true)}
            />
          </Row>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexWrap: 'wrap' },
  action: { flex: 1 },
});
