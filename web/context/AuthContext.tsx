'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '@/lib/types';
import { login as apiLogin, register as apiRegister, getDashboard } from '@/lib/apiClient';

interface AuthContextType {
  user: User | null;
  authToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        setAuthToken(token);
        setUser(JSON.parse(userStr));
      }
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = (data: AuthResponse) => {
    setUser(data.user);
    setAuthToken(data.token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Also set cookie for middleware
      document.cookie = `authToken=${data.token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    }
  };

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    handleAuthSuccess(data);
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    const data = await apiRegister(email, password, firstName, lastName);
    handleAuthSuccess(data);
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Remove cookie
      document.cookie = 'authToken=; path=/; max-age=0';
    }
  };

  const refreshUser = async () => {
    if (!authToken) return;
    
    try {
      const dashboardData = await getDashboard();
      const updatedUser = dashboardData.user;
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authToken,
        isAuthenticated: !!user && !!authToken,
        login,
        register,
        logout,
        refreshUser,
        loading,
      }}
    >
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

