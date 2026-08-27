/**
 * Write a note around a verse — with optional AI help.
 *
 * Reached from a verse's action sheet. The verse sits at the top; below it the
 * reader writes freely, and "Draft with AI" seeds a reflection they can edit.
 */

import type { Verse } from '@selah/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/states';
import { Button, Card, Row, Text } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

export default function NoteComposerScreen() {
  const t = useTheme();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { locale, t: tr } = useLocale();

  const { verseId } = useLocalSearchParams<{ verseId: string }>();
  const id = Number(verseId);

  const verse = useAsync<Verse>((signal) => api.getVerse(id, signal), [id]);

  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  async function draftWithAI() {
    setAiBusy(true);
    try {
      const explanation = await api.explainVerse({ verse_id: id, tone: 'devotional', language: locale });
      // A gentle, editable starting point — the reader makes it their own.
      const seed = `${explanation.summary}\n\n${explanation.application}`;
      setDraft((current) => (current.trim() ? `${current.trim()}\n\n${seed}` : seed));
    } catch (caught) {
      Alert.alert(
        tr('note.aiFailed'),
        caught instanceof ApiError ? caught.message : tr('common.somethingWrong'),
      );
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    const body = draft.trim();
    if (!body) return;
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    setSaving(true);
    try {
      await api.createNote({ body, verse_id: id });
      router.replace('/notes');
    } catch (caught) {
      Alert.alert(
        tr('note.saveFailed'),
        caught instanceof ApiError ? caught.message : tr('common.somethingWrong'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: verse.data?.reference ?? tr('nav.notes') }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <Screen edges={{ top: false }}>
          {verse.isLoading ? <LoadingState /> : null}
          {verse.error ? <ErrorState error={verse.error} onRetry={verse.refresh} /> : null}

          {verse.data ? (
            <Card style={{ gap: t.spacing.sm, marginBottom: t.spacing.lg }}>
              <Text variant="overline" tone="accent">
                {verse.data.reference.toUpperCase()}
              </Text>
              <Text variant="quote">{verse.data.text}</Text>
            </Card>
          ) : null}

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={tr('note.placeholder')}
            placeholderTextColor={t.colors.textSubtle}
            multiline
            autoFocus
            accessibilityLabel="Your note"
            style={[
              styles.input,
              t.typography.body,
              {
                backgroundColor: t.colors.surfaceMuted,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
                color: t.colors.text,
              },
            ]}
          />

          <Row gap={10} style={styles.actions}>
            <Button
              title={tr('note.aiHelp')}
              icon="sparkles-outline"
              variant="secondary"
              style={styles.action}
              loading={aiBusy}
              onPress={draftWithAI}
            />
            <Button
              title={tr('notes.save')}
              icon="checkmark"
              style={styles.action}
              loading={saving}
              disabled={!draft.trim()}
              onPress={save}
            />
          </Row>
        </Screen>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  input: {
    minHeight: 180,
    padding: 14,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: { marginTop: 16 },
  action: { flex: 1 },
});
