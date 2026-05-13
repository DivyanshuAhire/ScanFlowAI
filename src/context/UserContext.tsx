'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserContextType {
  user: any;
  loading: boolean;
  login: (userData: any, token: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('scanflow_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData: any, token: string) => {
    setUser(userData);
    localStorage.setItem('scanflow_user', JSON.stringify(userData));
    localStorage.setItem('scanflow_token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('scanflow_user');
    localStorage.removeItem('scanflow_token');
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
