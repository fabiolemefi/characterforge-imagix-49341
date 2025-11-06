import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { checkSupabaseHealth } from '@/lib/supabaseHealthCheck';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  healthError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('🔐 [AuthContext] Iniciando verificação de autenticação...');
        
        // Health check apenas UMA VEZ na inicialização
        const healthCheck = await checkSupabaseHealth(10000);
        
        if (!mounted) return;

        if (!healthCheck.isHealthy) {
          console.error('❌ [AuthContext] Health check falhou:', healthCheck);
          setHealthError(healthCheck.error || 'Erro ao conectar ao servidor');
          setLoading(false);
          return;
        }

        console.log('✅ [AuthContext] Health check OK');

        // Obter sessão inicial
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          console.log('✅ [AuthContext] Sessão encontrada:', initialSession.user.id.substring(0, 8));
        } else {
          console.log('ℹ️ [AuthContext] Nenhuma sessão encontrada');
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ [AuthContext] Erro na inicialização:', error);
        if (mounted) {
          setHealthError('Erro inesperado ao inicializar autenticação');
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listener de mudanças de autenticação (apenas uma vez, globalizado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        console.log('🔄 [AuthContext] Auth event:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    healthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
