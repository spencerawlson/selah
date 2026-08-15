/**
 * A minimal data-fetching hook.
 *
 * Handles the four things every screen needs — loading, error, refresh, and
 * cancel-on-unmount — and nothing else. When the app needs real caching,
 * dedupe, or optimistic updates, swap this for TanStack Query; the call sites
 * already have the right shape for it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from './client';

export interface AsyncState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  /** True on the first load only — use it to choose skeleton vs. spinner. */
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => void;
}

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

export function useAsync<T>(fetcher: Fetcher<T>, deps: readonly unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep the latest fetcher without making it a dependency — callers pass an
  // inline arrow function, which would otherwise re-run this on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const hasLoaded = useRef(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (hasLoaded.current) setIsRefreshing(true);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(undefined);
      })
      .catch((caught: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError('internal_error', 'Something went wrong.', 0),
        );
      })
      .finally(() => {
        if (!active) return;
        hasLoaded.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { data, error, isLoading, isRefreshing, refresh };
}
