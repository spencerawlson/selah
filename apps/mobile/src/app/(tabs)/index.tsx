/**
 * Today — the landing screen.
 *
 * One verse, given room to breathe, then a short curated shelf. Deliberately
 * not a feed: the goal is that someone reads one thing well and leaves.
 */

import { useRouter } from 'expo-router';
import { View } from 'react-native';

import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/states';
import { Button, Card, SectionHeader, Text } from '@/components/ui';
import { VerseCard } from '@/components/verse';
import { useAuth } from '@/state/auth';
import { useTheme } from '@/theme';

function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data, error, isLoading, isRefreshing, refresh } = useAsync(
    (signal) => api.getToday(signal),
    [],
  );

  const name = user?.display_name.split(' ')[0];

  return (
    <Screen
      title={name ? `${greeting()}, ${name}` : greeting()}
      subtitle="Take a moment with one verse."
      onRefresh={refresh}
      refreshing={isRefreshing}
    >
      {isLoading ? <LoadingState label="Finding today's verse…" /> : null}
      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      {data?.verse_of_the_day ? (
        <View style={{ gap: t.spacing.md, marginBottom: t.spacing.xxl }}>
          <VerseCard
            verse={data.verse_of_the_day.verse}
            label={data.verse_of_the_day.label}
            onPress={() => router.push(`/verse/${data.verse_of_the_day!.verse.id}`)}
          />
          <Button
            title="Explain this verse"
            icon="sparkles-outline"
            fullWidth
            onPress={() => router.push(`/verse/${data.verse_of_the_day!.verse.id}`)}
          />
        </View>
      ) : null}

      {data && data.featured.length > 1 ? (
        <View style={{ gap: t.spacing.md }}>
          <SectionHeader title="Where to start" />
          {data.featured
            .filter((item) => item.verse.id !== data.verse_of_the_day?.verse.id)
            .map((item) => (
              <VerseCard
                key={item.verse.id}
                verse={item.verse}
                label={item.label}
                onPress={() => router.push(`/verse/${item.verse.id}`)}
              />
            ))}
        </View>
      ) : null}

      {data && !user ? (
        <Card variant="muted" style={{ gap: t.spacing.md, marginTop: t.spacing.xxl }}>
          <Text variant="heading">Save what you find</Text>
          <Text variant="callout" tone="muted">
            Reading never needs an account. Keeping notes and favorites does.
          </Text>
          <Button title="Create an account" variant="secondary" onPress={() => router.push('/sign-in')} />
        </Card>
      ) : null}
    </Screen>
  );
}
