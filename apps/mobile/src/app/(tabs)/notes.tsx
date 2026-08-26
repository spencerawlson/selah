/**
 * Notes — what the reader wrote.
 *
 * Requires an account, because notes have to survive a reinstall. Signed-out
 * users see the reason, not a locked door.
 */

import type { Note } from '@selah/shared';
import { formatRelativeTime } from '@selah/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState, SignInPrompt } from '@/components/states';
import { Button, Card, Row, Text } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

export default function NotesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { isSignedIn, isRestoring } = useAuth();
  const { t: tr } = useLocale();

  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, error, isLoading, isRefreshing, refresh } = useAsync(
    async (signal) => (isSignedIn ? api.getNotes(signal) : null),
    [isSignedIn],
  );

  async function save() {
    const body = draft.trim();
    if (!body) return;

    setSaving(true);
    try {
      await api.createNote({ body });
      setDraft('');
      refresh();
    } catch (caught) {
      Alert.alert(
        'Could not save',
        caught instanceof ApiError ? caught.message : 'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(note: Note) {
    Alert.alert('Delete this note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteNote(note.id);
            refresh();
          } catch (caught) {
            Alert.alert(
              'Could not delete',
              caught instanceof ApiError ? caught.message : 'Something went wrong.',
            );
          }
        },
      },
    ]);
  }

  if (isRestoring) {
    return (
      <Screen title={tr('nav.notes')}>
        <LoadingState />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen title={tr('nav.notes')}>
        <SignInPrompt message={tr('notes.signin')} onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen
      title={tr('nav.notes')}
      subtitle={tr('notes.subtitle')}
      onRefresh={refresh}
      refreshing={isRefreshing}
    >
      <Card style={{ gap: t.spacing.md, marginBottom: t.spacing.xl }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={tr('notes.placeholder')}
          placeholderTextColor={t.colors.textSubtle}
          multiline
          accessibilityLabel="New note"
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
        <Button
          title={tr('notes.save')}
          icon="checkmark"
          fullWidth
          loading={saving}
          disabled={!draft.trim()}
          onPress={save}
        />
      </Card>

      {isLoading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon="create-outline"
          title={tr('notes.emptyTitle')}
          message={tr('notes.emptyMsg')}
        />
      ) : null}

      <View style={{ gap: t.spacing.md }}>
        {data?.items.map((note) => (
          <Card key={note.id} style={{ gap: t.spacing.sm }}>
            {note.verse ? (
              <Pressable
                onPress={() => router.push(`/verse/${note.verse!.id}`)}
                accessibilityRole="button"
              >
                <Text variant="overline" tone="accent">
                  {note.verse.reference.toUpperCase()}
                </Text>
              </Pressable>
            ) : null}

            {note.title ? <Text variant="heading">{note.title}</Text> : null}
            <Text variant="body">{note.body}</Text>

            <Row style={styles.between}>
              <Text variant="caption" tone="subtle">
                {formatRelativeTime(note.created_at)}
              </Text>
              <Pressable
                onPress={() => confirmDelete(note)}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
                hitSlop={8}
              >
                <Text variant="caption" tone="danger">
                  {tr('notes.delete')}
                </Text>
              </Pressable>
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 96, padding: 14, textAlignVertical: 'top' },
  between: { justifyContent: 'space-between' },
});
