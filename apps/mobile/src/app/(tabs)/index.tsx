/**
 * Today — the landing screen.
 *
 * One verse, given room to breathe, and a single way forward. Deliberately not a
 * feed: someone reads one thing well and leaves. Everything else lives a tap away
 * in the Reader.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { FadeIn } from '@/components/motion';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/states';
import { Button, Text } from '@/components/ui';
import { VerseHero } from '@/components/verse';
import { useAuth } from '@/state/auth';
import { TRANSLATION_FOR, useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

function greetingKey(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'today.morning';
  if (hour < 18) return 'today.afternoon';
  return 'today.evening';
}

/** Format the API's YYYY-MM-DD without tripping over UTC parsing. */
function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

export default function TodayScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { locale, t: tr } = useLocale();
  const { data, error, isLoading, isRefreshing, refresh } = useAsync(
    (signal) => api.getToday(TRANSLATION_FOR[locale], signal),
    [locale],
  );

  const name = user?.display_name.split(' ')[0];
  const votd = data?.verse_of_the_day;

  return (
    <Screen
      title={name ? `${tr(greetingKey())}, ${name}` : tr(greetingKey())}
      subtitle={tr('today.subtitle')}
      onRefresh={refresh}
      refreshing={isRefreshing}
    >
      {isLoading ? <LoadingState label={tr('today.finding')} /> : null}
      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      {votd ? (
        <FadeIn style={{ gap: t.spacing.lg }}>
          <VerseHero
            verse={votd.verse}
            label={tr('today.votd')}
            date={formatDate(data?.date)}
            onPress={() => router.push(`/verse/${votd.verse.id}`)}
          />
          <Button
            title={tr('today.reflect')}
            icon="sparkles-outline"
            fullWidth
            onPress={() => router.push(`/verse/${votd.verse.id}`)}
          />
          <Pressable
            onPress={() => router.navigate('/read')}
            style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text variant="callout" tone="muted">
              {tr('today.openReader')}
            </Text>
            <Ionicons name="arrow-forward" size={15} color={t.colors.textMuted} />
          </Pressable>
        </FadeIn>
      ) : null}

      {data && !user ? (
        <Text variant="caption" tone="subtle" center style={{ marginTop: t.spacing.xxxl }}>
          {tr('today.signinPre')}
          <Text variant="caption" tone="accent" onPress={() => router.push('/sign-in')}>
            {tr('today.signinLink')}
          </Text>
          {tr('today.signinPost')}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
});
