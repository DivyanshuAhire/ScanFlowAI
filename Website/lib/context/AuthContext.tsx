'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'ADMIN' | 'COMPANY_OPERATOR' | 'CLINIC_OPERATOR' | 'EMPLOYEE';
  clinicId?: string;
  employeeId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Initial load
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = (accessToken: string, loggedInUser: User) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    setToken(accessToken);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch (error) {
      toast.error('Failed to log out cleanly');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        login(data.accessToken, data.user);
      } else {
        // Clear session if refresh fails
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      console.error('Session check failed', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
