/**
 * The five sections.
 *
 * Chrome comes from <AppNav/>: a fixed-width left sidebar on wide screens, a
 * bottom bar on phones — laid out as real flex siblings of the content. The
 * built-in tab bar is hidden (tabBar renders nothing); AppNav navigates via the
 * router, so it fully controls its own width and position.
 */

import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { AppNav, WIDE } from '@/components/nav';
import { useAuth } from '@/state/auth';
import * as storage from '@/state/storage';
import { useTheme } from '@/theme';
import { WELCOME_SEEN_KEY } from '../welcome';

export default function TabsLayout() {
  const t = useTheme();
  const router = useRouter();
  const { isSignedIn, isRestoring } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

  // First launch for a signed-out reader: send them to the landing page once.
  // Wait until the stored session has been checked, so we never flash it at a
  // returning signed-in user.
  useEffect(() => {
    if (isRestoring || isSignedIn) return;
    let active = true;
    (async () => {
      let seen = false;
      try {
        seen = (await storage.getItem(WELCOME_SEEN_KEY)) !== null;
      } catch {
        seen = true; // if storage is unavailable, don't nag
      }
      if (active && !seen) router.replace('/welcome');
    })();
    return () => {
      active = false;
    };
  }, [isRestoring, isSignedIn]);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: wide ? 'row' : 'column',
        backgroundColor: t.colors.background,
      }}
    >
      {wide ? <AppNav /> : null}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: t.colors.background },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Today' }} />
          <Tabs.Screen name="read" options={{ title: 'Reader' }} />
          <Tabs.Screen name="study" options={{ title: 'Study' }} />
          <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
          <Tabs.Screen name="profile" options={{ title: 'You' }} />
        </Tabs>
      </View>

      {!wide ? <AppNav /> : null}
    </View>
  );
}
