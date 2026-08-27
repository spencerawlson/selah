/**
 * "Continue with Google" — web, iOS and Android.
 *
 * Uses expo-auth-session's Google provider to obtain an ID token, which the
 * caller trades for a Selah session at POST /auth/google. One styled button on
 * every platform. Enabled once the relevant client id is configured:
 *
 *   EXPO_PUBLIC_GOOGLE_CLIENT_ID          (web + Expo Go)
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID      (standalone iOS)
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID  (standalone Android)
 *
 * Without one it shows a stand-in that triggers the caller's setup note.
 */

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { Button } from '@/components/ui';

// Completes the auth session when the browser redirects back (web + native).
WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

const CONFIGURED =
  Platform.OS === 'web' ? !!WEB_CLIENT_ID : !!(WEB_CLIENT_ID || IOS_CLIENT_ID || ANDROID_CLIENT_ID);

export function GoogleButton({
  label,
  onCredential,
  onUnavailable,
  onError,
}: {
  label: string;
  onCredential: (idToken: string) => void;
  /** Pressed when Google isn't configured — the caller explains the setup. */
  onUnavailable: () => void;
  onError?: () => void;
}) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      if (idToken) onCredential(idToken);
      else onError?.();
    } else if (response.type === 'error') {
      onError?.();
    }
    // "dismiss"/"cancel" are silent — the reader backed out on purpose.
  }, [response]);

  return (
    <Button
      title={label}
      icon="logo-google"
      variant="secondary"
      fullWidth
      disabled={CONFIGURED && !request}
      onPress={() => {
        if (!CONFIGURED) {
          onUnavailable();
          return;
        }
        void promptAsync();
      }}
    />
  );
}
