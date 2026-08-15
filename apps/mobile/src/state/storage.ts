/**
 * Cross-platform key/value storage for the session token.
 *
 * Native uses the OS keychain/keystore via expo-secure-store. Web has no
 * equivalent, so it falls back to localStorage — which is readable by any
 * script on the origin. That is an accepted trade-off for a dev/demo web build;
 * a production web app should keep the session in an httpOnly cookie set by the
 * API instead.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    // Storage being unavailable should sign the user out, never crash the app.
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    /* non-fatal: the session simply will not persist across launches */
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    /* non-fatal */
  }
}
