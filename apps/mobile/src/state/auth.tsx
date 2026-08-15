/**
 * Session state.
 *
 * Reading scripture never requires an account. Notes and favorites do — so the
 * app stays usable signed-out and prompts only where it must.
 */

import type { AuthSession, User } from '@selah/shared';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { setAuthToken } from '@/api/client';
import * as api from '@/api/endpoints';
import * as storage from '@/state/storage';

const TOKEN_KEY = 'selah.access_token';

interface AuthContextValue {
  user: User | null;
  isSignedIn: boolean;
  /** True until the stored token has been checked — hold UI decisions until then. */
  isRestoring: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // On launch, trust the stored token only far enough to ask the API who it is.
  useEffect(() => {
    let active = true;

    (async () => {
      const token = await storage.getItem(TOKEN_KEY);
      if (!token) {
        if (active) setIsRestoring(false);
        return;
      }

      setAuthToken(token);
      try {
        const me = await api.getMe();
        if (active) setUser(me);
      } catch {
        // Expired or revoked — clear it rather than leaving a broken session.
        setAuthToken(null);
        await storage.removeItem(TOKEN_KEY);
      } finally {
        if (active) setIsRestoring(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const adopt = useCallback(async (session: AuthSession) => {
    setAuthToken(session.access_token);
    await storage.setItem(TOKEN_KEY, session.access_token);
    setUser(session.user);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await adopt(await api.signIn({ email: email.trim(), password }));
    },
    [adopt],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      await adopt(
        await api.signUp({ email: email.trim(), password, display_name: displayName.trim() }),
      );
    },
    [adopt],
  );

  const signOut = useCallback(async () => {
    setAuthToken(null);
    await storage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isSignedIn: user !== null, isRestoring, signIn, signUp, signOut }),
    [user, isRestoring, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
