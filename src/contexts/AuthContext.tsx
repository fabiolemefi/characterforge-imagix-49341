import { createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuthStore } from '@/stores/authStore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Agora delega para o AuthStore (Zustand)
 * 
 * Mantém a mesma interface para compatibilidade com código existente
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, session, isReady, isUserActive } = useAuthStore();

  const value = {
    user,
    session,
    loading: !isReady,
    isAuthenticated: !!user && isUserActive,
  };

  return (
    <AuthContext.Provider value={value}>
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
