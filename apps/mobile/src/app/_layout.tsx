/**
 * Root layout: providers, navigation theme, and the stack that sits above the tabs.
 */

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type Theme as NavigationTheme,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/state/auth';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const t = useTheme();

  // Hand our palette to React Navigation so headers, backgrounds and the back
  // gesture's peek all match the app instead of defaulting to system grey.
  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.colors.accent,
        background: t.colors.background,
        card: t.colors.background,
        text: t.colors.text,
        border: t.colors.border,
      },
    };
  }, [t]);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: t.fonts.sans, fontSize: 17, fontWeight: '600' },
              headerTintColor: t.colors.accent,
              contentStyle: { backgroundColor: t.colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="chapter/[id]" options={{ title: '' }} />
            <Stack.Screen name="verse/[id]" options={{ title: 'Explanation' }} />
            <Stack.Screen
              name="sign-in"
              options={{ presentation: 'modal', title: 'Your account' }}
            />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
