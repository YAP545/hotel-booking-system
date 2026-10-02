import { createContext, useContext, useState, ReactNode } from 'react';
import { AuthUser } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('authUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      localStorage.setItem('accessToken', res.accessToken);
      if (res.refreshToken) {
        localStorage.setItem('refreshToken', res.refreshToken);
      }
      localStorage.setItem('authUser', JSON.stringify(res.user));
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authUser');
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
