/**
 * Welcome — the landing screen.
 *
 * The first thing a signed-out reader sees (once), and the hub every "sign in"
 * link points to. Create an account, continue with Google, sign in, or just
 * start reading — scripture never requires an account.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/googleButton';
import { Button, Text } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useLocale } from '@/state/locale';
import * as storage from '@/state/storage';
import { useTheme } from '@/theme';

/** Set once the reader has passed through here, so it isn't shown every launch. */
export const WELCOME_SEEN_KEY = 'selah.welcome_seen';

export default function WelcomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tr } = useLocale();
  const { signInWithGoogle } = useAuth();

  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function markSeen() {
    try {
      await storage.setItem(WELCOME_SEEN_KEY, '1');
    } catch {
      /* best effort */
    }
  }

  async function enterAsGuest() {
    await markSeen();
    router.replace('/(tabs)');
  }

  async function handleGoogleCredential(idToken: string) {
    setBusy(true);
    setNote(null);
    try {
      await signInWithGoogle(idToken);
      await markSeen();
      router.replace('/(tabs)');
    } catch {
      setNote(tr('welcome.googleError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: t.colors.background,
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.hero}>
        <View style={styles.brand}>
          <View style={[styles.mark, { backgroundColor: t.colors.text }]}>
            <Text style={[styles.markGlyph, { color: t.colors.background, fontFamily: t.fonts.serif }]}>
              S
            </Text>
          </View>
          <Text style={[styles.wordmark, { color: t.colors.text, fontFamily: t.fonts.serif }]}>
            Selah
          </Text>
        </View>

        <Text style={[styles.tagline, { color: t.colors.text, fontFamily: t.fonts.serif }]}>
          {tr('welcome.tagline')}
        </Text>
        <Text variant="body" tone="muted" center style={styles.subtitle}>
          {tr('welcome.subtitle')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title={tr('welcome.createAccount')}
          fullWidth
          loading={busy}
          onPress={() => router.push('/sign-in?mode=sign-up')}
        />

        <GoogleButton
          label={tr('welcome.google')}
          onCredential={handleGoogleCredential}
          onUnavailable={() => setNote(tr('welcome.googleSetup'))}
          onError={() => setNote(tr('welcome.googleError'))}
        />

        {note ? (
          <Text variant="caption" tone="subtle" center style={styles.note}>
            {note}
          </Text>
        ) : null}

        <Button
          title={tr('welcome.haveAccount')}
          variant="ghost"
          fullWidth
          onPress={() => router.push('/sign-in')}
        />

        <Pressable
          onPress={enterAsGuest}
          accessibilityRole="button"
          style={({ pressed }) => [styles.guest, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text variant="callout" tone="muted" center>
            {tr('welcome.guest')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, maxWidth: 460, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  mark: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  markGlyph: { fontSize: 26, fontWeight: '700', marginTop: -2 },
  wordmark: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  tagline: { fontSize: 27, lineHeight: 35, textAlign: 'center', letterSpacing: -0.3, marginTop: 8 },
  subtitle: { marginTop: 4, lineHeight: 23 },
  actions: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: 12 },
  note: { marginTop: -2 },
  guest: { paddingVertical: 10 },
});
