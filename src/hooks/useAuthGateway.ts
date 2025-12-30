import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import AuthGateway from '@/services/AuthGateway';

interface UseAuthGatewayResult {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  isAuthenticated: boolean;
  isUserActive: boolean;
  refreshSession: () => Promise<boolean>;
}

/**
 * Hook React para integração com o AuthGateway
 * 
 * Fornece:
 * - Estado de usuário e sessão
 * - Flag isReady para saber quando a inicialização terminou
 * - Função para forçar refresh
 */
export function useAuthGateway(): UseAuthGatewayResult {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isUserActive, setIsUserActive] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    const gateway = AuthGateway.getInstance();

    // Configurar callback para mudança de status
    gateway.onUserStatusChange((newUser, newSession) => {
      console.log('👤 [useAuthGateway] Status atualizado:', {
        hasUser: !!newUser,
        hasSession: !!newSession
      });
      setUser(newUser);
      setSession(newSession);
    });

    // Configurar callback para sessão perdida
    gateway.onSessionLost(() => {
      console.log('🚪 [useAuthGateway] Sessão perdida, redirecionando para login...');
      setUser(null);
      setSession(null);
      setIsUserActive(false);
      navigate('/login', { replace: true });
    });

    // Configurar callback para sessão renovada
    gateway.onSessionRefreshed((newSession) => {
      console.log('🔄 [useAuthGateway] Sessão renovada');
      setSession(newSession);
      setUser(newSession.user);
    });

    // Inicializar gateway
    gateway.initialize().then(async () => {
      const currentUser = gateway.getUser();
      const currentSession = gateway.getSession();
      
      setUser(currentUser);
      setSession(currentSession);
      
      // Verificar se usuário está ativo
      if (currentUser) {
        const isActive = await gateway.checkAndCacheUserStatus(currentUser.id);
        setIsUserActive(isActive);
      }
      
      setIsReady(true);
      
      console.log('✅ [useAuthGateway] Pronto:', {
        hasUser: !!currentUser,
        hasSession: !!currentSession
      });
    });

    // Cleanup não é necessário pois o gateway é singleton
    // mas podemos desregistrar callbacks se necessário
    return () => {
      // Gateway continua ativo para outras partes da aplicação
    };
  }, [navigate]);

  const refreshSession = useCallback(async () => {
    const gateway = AuthGateway.getInstance();
    return gateway.forceRefresh();
  }, []);

  return {
    user,
    session,
    isReady,
    isAuthenticated: user !== null && session !== null,
    isUserActive,
    refreshSession
  };
}

/**
 * Hook simplificado apenas para verificar autenticação
 * Útil em componentes que não precisam de toda a funcionalidade
 */
export function useIsAuthenticated(): boolean {
  const gateway = AuthGateway.getInstance();
  return gateway.isAuthenticated();
}
