import { apiClient, clearAuthToken, getAuthToken, storeAuthToken } from '../api/client';
import type { AuthSession, User } from '../types';

type MeResponse = User | { user: User; expiresAt?: string };

export const authApi = {
  hasToken: () => Boolean(getAuthToken()),

  async currentUser() {
    const { data } = await apiClient.get<MeResponse>('/me');
    return 'user' in data ? data.user : data;
  },

  async login(email: string, password: string, remember = false) {
    const { data } = await apiClient.post<AuthSession>('/login', {
      email,
      password,
      remember,
    });
    storeAuthToken(data.token, data.expiresAt, remember);
    return data.user;
  },

  async register(name: string, email: string, password: string) {
    const { data } = await apiClient.post<AuthSession>('/register', {
      name,
      email,
      password,
      password_confirmation: password,
    });
    storeAuthToken(data.token, data.expiresAt, false);
    return data.user;
  },

  async logout() {
    try {
      if (getAuthToken()) await apiClient.post('/logout');
    } finally {
      clearAuthToken();
    }
  },

  async forgotPassword(email: string) {
    const { data } = await apiClient.post<{ message: string }>('/forgot-password', { email });
    return data;
  },

  async resetPassword(input: {
    token: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  }) {
    const { data } = await apiClient.post<{ message: string }>('/reset-password', {
      token: input.token,
      email: input.email,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    });
    return data;
  },

  async confirmEmailChange(token: string) {
    const { data } = await apiClient.post<{ message: string }>('/email-change/confirm', { token });
    return data;
  },

  async deleteAccount(password: string) {
    await apiClient.delete('/me', { data: { password } });
    clearAuthToken();
  },
};
