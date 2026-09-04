import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/user';
import { INITIAL_INSPECTOR_USER, INITIAL_ADMIN_USER } from '../services/mockData';

export interface LoginParams {
  badgeOrUsername: string;
  pinOrPassword: string;
  role: 'ADMINISTRATOR' | 'INSPECTOR';
  jurisdiction?: string;
}

export interface RegisterParams {
  name: string;
  badgeNumber: string;
  email?: string;
  password: string;
  role: 'ADMINISTRATOR' | 'INSPECTOR';
  jurisdiction?: string;
  phone?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInspector: boolean;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<{ success: boolean; error?: string }>;
  register: (params: RegisterParams) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: 'ADMINISTRATOR' | 'INSPECTOR') => void;
  updateUserJurisdiction: (jurisdiction: string) => void;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'lmpc_auth_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (res.ok) {
        const sessionUser = (await res.json()) as UserProfile;
        setUser(sessionUser);
      } else {
        setUser(null);
      }
    } catch {
      // Offline / error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = async ({ badgeOrUsername, pinOrPassword, role, jurisdiction }: LoginParams): Promise<{ success: boolean; error?: string }> => {
    if (!badgeOrUsername || !pinOrPassword) {
      return { success: false, error: 'Please enter your username/badge and password.' };
    }
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: badgeOrUsername, password: pinOrPassword, role })
      });

      if (!response.ok) {
        let errMessage = 'Invalid credentials. Please verify your badge and password.';
        try {
          const data = await response.json();
          if (data && data.error) errMessage = data.error;
        } catch {
          // Ignored
        }
        return { success: false, error: errMessage };
      }

      const authenticated = (await response.json()) as UserProfile;
      setUser({ ...authenticated, jurisdiction: jurisdiction || authenticated.jurisdiction });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error. Ensure the server is running.' };
    }
  };

  const register = async (params: RegisterParams): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        let errMessage = 'Registration failed.';
        try {
          const data = await response.json();
          if (data && data.error) errMessage = data.error;
        } catch {
          // Ignored
        }
        return { success: false, error: errMessage };
      }

      const createdUser = (await response.json()) as UserProfile;
      setUser(createdUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error. Ensure the server is running.' };
    }
  };

  const logout = () => {
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const switchRole = (role: 'ADMINISTRATOR' | 'INSPECTOR') => {
    if (role === 'ADMINISTRATOR') {
      setUser(INITIAL_ADMIN_USER);
    } else {
      setUser(INITIAL_INSPECTOR_USER);
    }
  };

  const updateUserJurisdiction = (jurisdiction: string) => {
    if (user) {
      setUser({ ...user, jurisdiction });
    }
  };

  const isAdmin = user?.role === 'ADMINISTRATOR' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'COMPLIANCE_DIRECTOR';
  const isInspector = !isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin,
        isInspector,
        isLoading,
        login,
        register,
        logout,
        switchRole,
        updateUserJurisdiction,
        checkSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
