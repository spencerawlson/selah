/**
 * The five sections.
 *
 * Chrome comes from <AppNav/>: a fixed-width left sidebar on wide screens, a
 * bottom bar on phones — laid out as real flex siblings of the content. The
 * built-in tab bar is hidden (tabBar renders nothing); AppNav navigates via the
 * router, so it fully controls its own width and position.
 */

import { Tabs } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { AppNav, WIDE } from '@/components/nav';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

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
