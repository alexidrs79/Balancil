import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/authService';
import type { User } from '../types';
import { setActiveCurrency, setActiveLocale, setActiveTimeZone } from '../utils/currency';

function applyFormattingPreferences(user: User) {
  setActiveCurrency(user.currency);
  setActiveLocale(user.locale ?? 'en-US');
  setActiveTimeZone(user.timezone ?? 'UTC');
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!authApi.hasToken()) {
        if (active) setIsInitializing(false);
        return;
      }
      try {
        const currentUser = await authApi.currentUser();
        if (active) {
          applyFormattingPreferences(currentUser);
          setUser(currentUser);
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsInitializing(false);
      }
    };
    void restore();

    const unauthorized = () => {
      queryClient.clear();
      setUser(null);
    };
    window.addEventListener('balancil:unauthorized', unauthorized);
    return () => {
      active = false;
      window.removeEventListener('balancil:unauthorized', unauthorized);
    };
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      queryClient.clear();
      const nextUser = await authApi.login(email, password, remember);
      applyFormattingPreferences(nextUser);
      setUser(nextUser);
      return nextUser;
    },
    [queryClient],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      queryClient.clear();
      const nextUser = await authApi.register(name, email, password);
      applyFormattingPreferences(nextUser);
      setUser(nextUser);
      return nextUser;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const updateUser = useCallback((nextUser: User) => {
    applyFormattingPreferences(nextUser);
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, isInitializing, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
