import { createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuthGateway } from '@/hooks/useAuthGateway';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Agora usa o AuthGateway internamente
 * 
 * Mantém a mesma interface para compatibilidade com código existente
 * mas delega toda a lógica para o AuthGateway
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, session, isReady, isAuthenticated } = useAuthGateway();

  const value = {
    user,
    session,
    loading: !isReady,
    isAuthenticated,
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
