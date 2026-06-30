import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchCurrentUser, loginUser } from '../api/client';
import type { ConfigUser } from '../api/types';

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  permissions_meta?: Array<{ code: string; label: string; description: string }>;
  all_permissions_meta?: Array<{ code: string; label: string; description: string }>;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'fundlens_auth_session';
const SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const restoreSession = useCallback(async () => {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) {
      setLoading(false);
      return;
    }

    try {
      const session = JSON.parse(sessionStr);
      const now = Date.now();

      // Check session expiry
      if (now - session.loginTime > SESSION_EXPIRY_MS) {
        logout();
        setLoading(false);
        return;
      }

      // Fetch user profile and permissions from backend (/api/auth/me)
      const profile = await fetchCurrentUser(session.id);
      setUser(profile);
    } catch (err) {
      console.error('Failed to restore session:', err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (userId: string) => {
    setError(null);
    try {
      const res = await loginUser(userId);
      if (res.success && res.user) {
        const session = {
          id: res.user.id,
          loginTime: Date.now(),
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        setUser(res.user);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      const errMsg = (err as Error).message || 'Invalid user ID';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
