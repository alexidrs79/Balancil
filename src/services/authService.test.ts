import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, clearAuthToken } from '../api/client';
import type { AuthSession } from '../types';
import { authApi } from './authService';

const session: AuthSession = {
  token: 'real-token',
  expiresAt: '2026-09-29T12:00:00.000Z',
  user: {
    id: 'user-id',
    name: 'Alex Morgan',
    email: 'alex@balancil.app',
    initials: 'AM',
    currency: 'USD',
  },
};

describe('authApi token persistence', () => {
  beforeEach(() => {
    clearAuthToken();
    vi.restoreAllMocks();
  });

  it('stores a remembered token in local storage', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: session });

    await authApi.login('alex@balancil.app', 'balancil123', true);

    expect(localStorage.getItem('balancil-auth-token')).toBe('real-token');
    expect(sessionStorage.getItem('balancil-auth-token')).toBeNull();
  });

  it('stores a session-only token in session storage', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: session });

    await authApi.login('alex@balancil.app', 'balancil123', false);

    expect(sessionStorage.getItem('balancil-auth-token')).toBe('real-token');
    expect(localStorage.getItem('balancil-auth-token')).toBeNull();
  });

  it('stores a new account token only for the current browser session', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: session });

    await authApi.register('Alex Morgan', 'alex@balancil.app', 'a-long-password');

    expect(sessionStorage.getItem('balancil-auth-token')).toBe('real-token');
    expect(localStorage.getItem('balancil-auth-token')).toBeNull();
  });
});
