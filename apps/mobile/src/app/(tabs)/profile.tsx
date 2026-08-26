/**
 * You — account, saved verses, and the premium surface.
 */

import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { API_BASE_URL } from '@/api/client';
import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Badge, Button, Card, Divider, Pill, Row, SectionHeader, Text } from '@/components/ui';
import { VerseCard } from '@/components/verse';
import { useAuth } from '@/state/auth';
import { LOCALES, useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

export default function ProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user, isSignedIn, isRestoring, signOut } = useAuth();
  const { locale, setLocale, t: tr } = useLocale();

  const favorites = useAsync(
    async (signal) => (isSignedIn ? api.getFavorites(signal) : null),
    [isSignedIn],
  );

  if (isRestoring) {
    return (
      <Screen title="You">
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen
      title={tr('nav.you')}
      onRefresh={isSignedIn ? favorites.refresh : undefined}
      refreshing={favorites.isRefreshing}
    >
      {/* ---- Account ---- */}
      {user ? (
        <Card style={{ gap: t.spacing.md }}>
          <Row style={styles.between}>
            <View style={styles.identity}>
              <Text variant="title">{user.display_name}</Text>
              <Text variant="caption" tone="muted">
                {user.email}
              </Text>
            </View>
            {user.is_premium ? <Badge label="Premium" tone="gold" /> : null}
          </Row>
          <Divider />
          <Button
            title={tr('profile.signout')}
            variant="ghost"
            onPress={() => {
              Alert.alert(tr('profile.signoutTitle'), tr('profile.signoutBody'), [
                { text: tr('common.cancel'), style: 'cancel' },
                { text: tr('profile.signout'), style: 'destructive', onPress: () => void signOut() },
              ]);
            }}
          />
        </Card>
      ) : (
        <Card style={{ gap: t.spacing.md }}>
          <Text variant="title">{tr('profile.notSignedIn')}</Text>
          <Text variant="callout" tone="muted">
            {tr('profile.notSignedInBody')}
          </Text>
          <Button title={tr('profile.signInCta')} onPress={() => router.push('/sign-in')} />
        </Card>
      )}

      {/* ---- Language ---- */}
      <View style={{ gap: t.spacing.md, marginTop: t.spacing.xl }}>
        <SectionHeader title={tr('settings.language')} />
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {LOCALES.map((l) => (
            <Pill
              key={l.value}
              label={l.label}
              selected={locale === l.value}
              onPress={() => setLocale(l.value)}
            />
          ))}
        </Row>
      </View>

      {/* ---- Premium ---- */}
      {!user?.is_premium ? (
        <Card
          variant="muted"
          style={{ gap: t.spacing.sm, marginTop: t.spacing.xl, borderColor: t.colors.gold }}
        >
          <Text variant="overline" tone="gold">
            {tr('profile.premiumLabel').toUpperCase()}
          </Text>
          <Text variant="heading">{tr('profile.premiumTitle')}</Text>
          <Text variant="callout" tone="muted">
            {tr('profile.premiumBody')}
          </Text>
          {/* TODO(billing): wire to RevenueCat or Stripe before launch. */}
          <Button
            title={tr('profile.comingSoon')}
            variant="secondary"
            disabled
            onPress={() => undefined}
            style={{ marginTop: t.spacing.sm }}
          />
        </Card>
      ) : null}

      {/* ---- Saved verses ---- */}
      {isSignedIn ? (
        <View style={{ gap: t.spacing.md, marginTop: t.spacing.xxl }}>
          <SectionHeader title={tr('profile.savedVerses')} />
          {favorites.isLoading ? <LoadingState /> : null}
          {favorites.error ? (
            <ErrorState error={favorites.error} onRetry={favorites.refresh} />
          ) : null}

          {favorites.data && favorites.data.items.length === 0 ? (
            <EmptyState
              icon="bookmark-outline"
              title={tr('profile.nothingSavedTitle')}
              message={tr('profile.nothingSavedBody')}
            />
          ) : null}

          {favorites.data?.items.map((favorite) =>
            favorite.verse ? (
              <VerseCard
                key={favorite.id}
                verse={favorite.verse}
                onPress={() => router.push(`/verse/${favorite.verse!.id}`)}
              />
            ) : null,
          )}
        </View>
      ) : null}

      {/* ---- Diagnostics ---- */}
      <View style={{ gap: t.spacing.sm, marginTop: t.spacing.xxl }}>
        <SectionHeader title={tr('profile.about')} />
        <Card variant="muted" style={{ gap: t.spacing.xs }}>
          <Text variant="caption" tone="muted">
            Selah 0.1.0 · {tr('profile.devBuild')}
          </Text>
          <Text variant="caption" tone="subtle">
            API: {API_BASE_URL}
          </Text>
          <Text variant="caption" tone="subtle">
            {tr('profile.scriptureNote')}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between', gap: 12 },
  identity: { flex: 1, gap: 2 },
});
