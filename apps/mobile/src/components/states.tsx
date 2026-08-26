/**
 * Loading, empty and error states.
 *
 * Centralised because these are the screens users actually see when something
 * is wrong, and a vague "Error" is how an app loses trust. The error view reads
 * the typed `ApiError` and says what to do about it.
 */

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Breathe } from '@/components/motion';
import { Button, Card, Text } from '@/components/ui';
import { useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

export function LoadingState({ label }: { label?: string }) {
  const t = useTheme();
  const { t: tr } = useLocale();
  return (
    <View style={[styles.center, { paddingVertical: t.spacing.xxxl, gap: t.spacing.md }]}>
      <ActivityIndicator color={t.colors.accent} />
      <Text variant="callout" tone="subtle">
        {label ?? tr('state.loading')}
      </Text>
    </View>
  );
}

/** Shown while an explanation is generating — a held breath, not a spinner. */
export function GeneratingState() {
  const t = useTheme();
  const { t: tr } = useLocale();
  return (
    <Card
      variant="muted"
      style={{ gap: t.spacing.lg, alignItems: 'center', paddingVertical: t.spacing.xl }}
    >
      <Breathe>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: t.colors.accent }} />
      </Breathe>
      <View style={{ gap: t.spacing.xs, alignItems: 'center' }}>
        <Text variant="heading" center>
          {tr('state.generatingTitle')}
        </Text>
        <Text variant="callout" tone="muted" center style={styles.prose}>
          {tr('state.generatingBody')}
        </Text>
      </View>
    </Card>
  );
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.center, { paddingVertical: t.spacing.xxl, gap: t.spacing.md }]}>
      <View
        style={[
          styles.iconWell,
          { backgroundColor: t.colors.surfaceMuted, borderRadius: t.radius.pill },
        ]}
      >
        <Ionicons name={icon} size={24} color={t.colors.textSubtle} />
      </View>
      <Text variant="title" center>
        {title}
      </Text>
      <Text variant="body" tone="muted" center style={styles.prose}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const t = useTheme();
  const { t: tr } = useLocale();

  // The offline case is common in development and has a specific fix, so it
  // gets specific words rather than the generic failure copy.
  const isOffline = error.code === 'network_error';

  return (
    <Card style={{ gap: t.spacing.md, borderColor: t.colors.danger }}>
      <View style={[styles.row, { gap: t.spacing.sm }]}>
        <Ionicons
          name={isOffline ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={20}
          color={t.colors.danger}
        />
        <Text variant="heading">{isOffline ? tr('state.offlineTitle') : tr('state.brokeTitle')}</Text>
      </View>

      <Text variant="callout" tone="muted">
        {error.message}
      </Text>

      {isOffline ? (
        <Text variant="caption" tone="subtle">
          {tr('state.offlineHintPre')}
          {'  '}
          <Text variant="caption" tone="accent">
            uvicorn app.main:app --reload
          </Text>
          {'  '}
          {tr('state.offlineHintPost')}
        </Text>
      ) : null}

      {onRetry && error.isRetryable ? (
        <Button title={tr('common.tryAgain')} variant="secondary" icon="refresh" onPress={onRetry} />
      ) : null}
    </Card>
  );
}

/** Prompt shown where a signed-out user hits something that needs an account. */
export function SignInPrompt({ message, onPress }: { message: string; onPress: () => void }) {
  const { t: tr } = useLocale();
  return (
    <EmptyState
      icon="bookmark-outline"
      title={tr('state.signinTitle')}
      message={message}
      actionLabel={tr('signin.signInBtn')}
      onAction={onPress}
    />
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWell: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  prose: { maxWidth: 320 },
});
