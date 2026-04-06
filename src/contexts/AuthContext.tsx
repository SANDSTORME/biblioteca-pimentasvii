import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, UserRole } from '@/types';
import {
  getCurrentSession,
  loginWithCredentials,
  logoutSession,
  registerAccount,
  ApiError,
} from '@/services/api';
import {
  AUTH_CHANGED_EVENT,
  LIBRARY_UPDATED_EVENT,
  clearStoredSessionToken,
  emitAuthChanged,
  getStoredSessionToken,
  setStoredSessionToken,
} from '@/lib/session';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (
    nome: string,
    email: string,
    senha: string,
    role: UserRole,
    turma?: string,
    token?: string,
  ) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(async () => {
    const token = getStoredSessionToken();
    if (!token) {
      setUser(null);
      setIsReady(true);
      return;
    }

    try {
      const nextUser = await getCurrentSession();
      setUser(nextUser);
    } catch {
      clearStoredSessionToken();
      setUser(null);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== 'biblioteca-pimentasvii:session-token') {
        return;
      }

      void refreshSession();
    };

    const handleAuthChanged = () => {
      void refreshSession();
    };

    const handleLibraryUpdated = () => {
      if (getStoredSessionToken()) {
        void refreshSession();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    window.addEventListener(LIBRARY_UPDATED_EVENT, handleLibraryUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      window.removeEventListener(LIBRARY_UPDATED_EVENT, handleLibraryUpdated);
    };
  }, [refreshSession]);

  const login = useCallback(async (email: string, senha: string) => {
    try {
      const result = await loginWithCredentials(email, senha);
      setStoredSessionToken(result.token);
      setUser(result.user);
      emitAuthChanged();
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } catch {
      // Mesmo se o servidor falhar, a sessao local precisa ser encerrada.
    } finally {
      clearStoredSessionToken();
      setUser(null);
      emitAuthChanged();
    }
  }, []);

  const register = useCallback<AuthContextType['register']>(
    async (nome, email, senha, role, turma, token) => {
      try {
        const result = await registerAccount({ nome, email, senha, role, turma, token });
        setStoredSessionToken(result.token);
        setUser(result.user);
        emitAuthChanged();
        return { success: true, message: result.message };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error, 'Nao foi possivel concluir o cadastro.'),
        };
      }
    },
    [],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isReady,
      login,
      logout,
      register,
    }),
    [isReady, login, logout, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
