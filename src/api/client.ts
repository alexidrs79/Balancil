import axios from 'axios';

const AUTH_TOKEN_KEY = 'balancil-auth-token';
const AUTH_EXPIRY_KEY = 'balancil-auth-expires-at';

export class ApiError extends Error {
  status?: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status?: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const token = storage.getItem(AUTH_TOKEN_KEY);
    if (!token) continue;
    const expiresAt = storage.getItem(AUTH_EXPIRY_KEY);
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      storage.removeItem(AUTH_TOKEN_KEY);
      storage.removeItem(AUTH_EXPIRY_KEY);
      continue;
    }
    return token;
  }
  return null;
}

export function storeAuthToken(token: string, expiresAt: string, remember: boolean) {
  const selected = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;
  selected.setItem(AUTH_TOKEN_KEY, token);
  selected.setItem(AUTH_EXPIRY_KEY, expiresAt);
  other.removeItem(AUTH_TOKEN_KEY);
  other.removeItem(AUTH_EXPIRY_KEY);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    storage.removeItem(AUTH_TOKEN_KEY);
    storage.removeItem(AUTH_EXPIRY_KEY);
    storage.removeItem('balancil-session');
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Axios turns FormData into JSON whenever a JSON content type is already set,
  // which silently drops file uploads. Clearing it lets the browser write the
  // multipart type with its boundary.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    // No response at all means the request never completed, so say that plainly
    // rather than blaming the request itself.
    if (!error.response) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return Promise.reject(new ApiError('You are offline. Reconnect and try again.'));
      }

      return Promise.reject(
        new ApiError(
          error.code === 'ECONNABORTED'
            ? 'The server took too long to respond. Please try again.'
            : 'Cannot reach the server. Make sure it is running, then try again.',
        ),
      );
    }

    const status = error.response.status;
    const body = error.response.data as
      { message?: string; errors?: Record<string, string[]> } | undefined;

    if (status === 401) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('balancil:unauthorized'));
      }
    }

    const firstValidationError = body?.errors ? Object.values(body.errors).flat()[0] : undefined;
    return Promise.reject(
      new ApiError(
        firstValidationError ?? body?.message ?? 'Something went wrong. Please try again.',
        status,
        body?.errors,
      ),
    );
  },
);
