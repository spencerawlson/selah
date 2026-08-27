/**
 * Favorites — the verses the reader hearted.
 *
 * Fed by the heart in the reader's verse popup. Requires an account, since
 * favorites have to survive a reinstall.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState, SignInPrompt } from '@/components/states';
import { VerseCard } from '@/components/verse';
import { useAuth } from '@/state/auth';
import { useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

export default function FavoritesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { isSignedIn, isRestoring } = useAuth();
  const { t: tr } = useLocale();

  const { data, error, isLoading, isRefreshing, refresh } = useAsync(
    async (signal) => (isSignedIn ? api.getFavorites(signal) : null),
    [isSignedIn],
  );

  async function unfavorite(verseId: number) {
    try {
      await api.removeFavorite(verseId);
      refresh();
    } catch {
      /* leave it; a refresh will reconcile */
    }
  }

  if (isRestoring) {
    return (
      <Screen title={tr('nav.favorites')}>
        <LoadingState />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen title={tr('nav.favorites')}>
        <SignInPrompt message={tr('favorites.signin')} onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen
      title={tr('nav.favorites')}
      subtitle={tr('favorites.subtitle')}
      onRefresh={refresh}
      refreshing={isRefreshing}
    >
      {isLoading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title={tr('favorites.emptyTitle')}
          message={tr('favorites.emptyMsg')}
        />
      ) : null}

      <View style={{ gap: t.spacing.md }}>
        {data?.items.map((favorite) =>
          favorite.verse ? (
            <VerseCard
              key={favorite.id}
              verse={favorite.verse}
              onPress={() => router.push(`/verse/${favorite.verse!.id}`)}
              footer={
                <Pressable
                  onPress={() => unfavorite(favorite.verse!.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={tr('verseact.unlike')}
                >
                  <Ionicons name="heart" size={18} color={t.colors.accent} />
                </Pressable>
              }
            />
          ) : null,
        )}
      </View>
    </Screen>
  );
}
