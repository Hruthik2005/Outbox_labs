import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@reachinbox/shared';
import { authApi } from '../services/auth-api';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await authApi.getMe();
        setUser(profile);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const { url } = await authApi.getGoogleUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to get Google login URL', err);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
