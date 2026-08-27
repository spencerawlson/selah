/**
 * "Continue with Google".
 *
 * On the web, when EXPO_PUBLIC_GOOGLE_CLIENT_ID is set, this renders Google's
 * own Identity Services button and hands the resulting ID token up to the
 * caller (which trades it for a Selah session at POST /auth/google). No native
 * modules are pulled in, so the Metro bundle is unaffected.
 *
 * When the client id is missing — or on native, where this web flow doesn't
 * apply — it shows a styled button that explains the one-time setup instead.
 */

import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.reject(new Error('web only'));
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

export function GoogleButton({
  label,
  onCredential,
  onUnavailable,
}: {
  label: string;
  onCredential: (idToken: string) => void;
  /** Pressed when Google isn't configured — the caller explains the setup. */
  onUnavailable: () => void;
}) {
  const hostRef = useRef<View>(null);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  const [rendered, setRendered] = useState(false);

  const configured = Platform.OS === 'web' && !!CLIENT_ID;

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        const google = (globalThis as { google?: any }).google;
        const host = hostRef.current as unknown as HTMLElement | null;
        if (!google?.accounts?.id || !host) return;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response?.credential) cbRef.current(response.credential);
          },
        });
        google.accounts.id.renderButton(host, {
          theme: 'outline',
          size: 'large',
          width: 300,
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
        });
        setRendered(true);
      })
      .catch(() => setRendered(false));
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (configured) {
    // Google renders its own button into this host once GIS loads.
    return <View ref={hostRef} style={[styles.host, !rendered && styles.hidden]} />;
  }

  // Not configured (or native): a styled stand-in that triggers the setup note.
  return (
    <Button title={label} icon="logo-google" variant="secondary" fullWidth onPress={onUnavailable} />
  );
}

const styles = StyleSheet.create({
  host: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  hidden: { opacity: 0 },
});
