import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError, apiClient, clearAuthToken, getAuthToken, storeAuthToken } from './client';

type Interceptor = (config: unknown) => unknown;

function runRequestInterceptors(config: unknown) {
  const { handlers } = apiClient.interceptors.request as unknown as {
    handlers: Array<{ fulfilled: Interceptor } | null>;
  };

  return handlers.reduce(
    (current, handler) => (handler ? handler.fulfilled(current) : current),
    config,
  );
}

function configFor(data: unknown) {
  return { data, headers: new AxiosHeaders({ 'Content-Type': 'application/json' }) };
}

describe('apiClient request headers', () => {
  it('drops the JSON content type for FormData so uploads stay multipart', () => {
    const config = configFor(new FormData());

    runRequestInterceptors(config);

    expect(config.headers.get('Content-Type')).toBeUndefined();
  });

  it('keeps the JSON content type for regular payloads', () => {
    const config = configFor({ name: 'Alex' });

    runRequestInterceptors(config);

    expect(config.headers.get('Content-Type')).toBe('application/json');
  });
});

function rejectWith(error: unknown) {
  const { handlers } = apiClient.interceptors.response as unknown as {
    handlers: Array<{ rejected: (error: unknown) => Promise<never> } | null>;
  };

  return handlers.find((handler) => handler)!.rejected(error);
}

const requestConfig = () => ({ headers: new AxiosHeaders() });

function transportError(code?: string) {
  return new AxiosError('Network Error', code, requestConfig(), undefined, undefined);
}

describe('unreachable server errors', () => {
  it('says the server cannot be reached when no response arrives', async () => {
    await expect(rejectWith(transportError())).rejects.toThrow(
      'Cannot reach the server. Make sure it is running, then try again.',
    );
  });

  it('names a timeout separately so it is not mistaken for a dead server', async () => {
    await expect(rejectWith(transportError('ECONNABORTED'))).rejects.toThrow(
      'The server took too long to respond. Please try again.',
    );
  });

  it('still surfaces the message the server sent when there is a response', async () => {
    const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', requestConfig(), undefined, {
      status: 422,
      data: { errors: { email: ['These credentials do not match our records.'] } },
      statusText: 'Unprocessable Content',
      headers: {},
      config: requestConfig(),
    });

    await expect(rejectWith(error)).rejects.toThrow('These credentials do not match our records.');
  });

  it('reports being offline when the browser knows it is', async () => {
    const online = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });

    await expect(rejectWith(transportError())).rejects.toBeInstanceOf(ApiError);
    await expect(rejectWith(transportError())).rejects.toThrow(
      'You are offline. Reconnect and try again.',
    );

    if (online) Object.defineProperty(window.navigator, 'onLine', online);
  });
});

describe('auth token expiry', () => {
  afterEach(clearAuthToken);

  it('removes an expired token before session restoration', () => {
    storeAuthToken('expired', new Date(Date.now() - 1_000).toISOString(), false);

    expect(getAuthToken()).toBeNull();
    expect(window.sessionStorage.getItem('balancil-auth-token')).toBeNull();
  });

  it('keeps an unexpired token', () => {
    storeAuthToken('valid', new Date(Date.now() + 60_000).toISOString(), false);

    expect(getAuthToken()).toBe('valid');
  });
});
