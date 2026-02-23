'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { storageService } from '@/lib/services/storage-service';
import { authService } from '@/lib/services/auth-service';
import type { AuthContextType, User } from '../types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_EXPIRES_IN = 900; // 15 minutes in seconds
const REFRESH_BUFFER = 60; // refresh 60 seconds before expiry
const RETRY_DELAY = 30_000; // 30 seconds
const MAX_RETRIES = 3;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  // Track whether component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  const clearTimers = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const performLogout = useCallback(() => {
    clearTimers();
    retryCountRef.current = 0;
    if (mountedRef.current) {
      setUser(null);
    }
    storageService.clearAll();
    routerRef.current.push('/login');
  }, [clearTimers]);

  const attemptRefresh = useCallback(() => {
    const refreshToken = storageService.getRefreshToken();
    if (!refreshToken) {
      performLogout();
      return;
    }

    authService
      .refreshToken(refreshToken)
      .then((response) => {
        if (!mountedRef.current) return;
        retryCountRef.current = 0;
        // Schedule next refresh
        scheduleRefresh(response.expiresIn);
      })
      .catch((error: Error) => {
        if (!mountedRef.current) return;
        // 401 error (token invalid/expired) - logout immediately
        if (error.message.includes('無効または期限切れ')) {
          performLogout();
          return;
        }
        // Network/other error - retry with backoff
        retryCountRef.current += 1;
        if (retryCountRef.current >= MAX_RETRIES) {
          performLogout();
          return;
        }
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            attemptRefresh();
          }
        }, RETRY_DELAY);
      });
  }, [performLogout]);

  const scheduleRefresh = useCallback(
    (expiresIn: number) => {
      clearTimers();
      const delay = Math.max((expiresIn - REFRESH_BUFFER) * 1000, 0);
      refreshTimerRef.current = setTimeout(() => {
        attemptRefresh();
      }, delay);
    },
    [clearTimers, attemptRefresh]
  );

  // login: set user state, save to StorageService, schedule refresh
  const login = useCallback(
    (newUser: User) => {
      setUser(newUser);
      storageService.setUser(newUser);
      retryCountRef.current = 0;
      scheduleRefresh(DEFAULT_EXPIRES_IN);
    },
    [scheduleRefresh]
  );

  // logout: clear state, storage, timers, redirect
  const logout = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // Initialization: restore auth state from localStorage on mount
  useEffect(() => {
    mountedRef.current = true;

    const accessToken = storageService.getAccessToken();
    const storedUser = storageService.getUser();

    if (accessToken && storedUser) {
      setUser(storedUser);
      scheduleRefresh(DEFAULT_EXPIRES_IN);
    }

    setIsLoading(false);

    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, []);

  const isAuthenticated = !!user && !!storageService.getAccessToken();

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
