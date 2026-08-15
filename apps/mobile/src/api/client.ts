/**
 * The single place the app talks to the network.
 *
 * Responsibilities: resolve the base URL, attach the bearer token, and turn the
 * API's error envelope into a typed `ApiError`. Screens never touch `fetch`.
 */

import type { ApiErrorBody, ApiErrorCode } from '@selah/shared';
import { Platform } from 'react-native';

/**
 * Where the API lives.
 *
 * `EXPO_PUBLIC_API_URL` wins (set it in apps/mobile/.env). Otherwise we guess a
 * local backend — and the Android emulator reaches the host machine at
 * 10.0.2.2, not localhost, which is the classic first-run stumble.
 */
function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:8000`;
}

export const API_BASE_URL = resolveBaseUrl();
const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when retrying might actually help. */
  get isRetryable(): boolean {
    return this.code === 'network_error' || this.code === 'upstream_error' || this.status >= 500;
  }
}

/** Set by the auth provider; read on every request. */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  /** Skip the Authorization header even when signed in (used by /auth routes). */
  anonymous?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, anonymous } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken && !anonymous) headers.Authorization = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // A dead backend is the most common failure in development, so name it
    // precisely instead of surfacing "Network request failed".
    if (signal?.aborted) throw error;
    throw new ApiError(
      'network_error',
      `Can't reach the Selah API at ${API_BASE_URL}. Is the backend running?`,
      0,
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload: unknown = text ? safeParse(text) : null;

  if (!response.ok) {
    const envelope = payload as ApiErrorBody | null;
    throw new ApiError(
      envelope?.error?.code ?? 'http_error',
      envelope?.error?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      envelope?.error?.details ?? {},
    );
  }

  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Health lives outside the versioned prefix, so it bypasses `request`. */
export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal });
    return response.ok;
  } catch {
    return false;
  }
}
