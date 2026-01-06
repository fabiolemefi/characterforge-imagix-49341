import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  isUserActive: boolean;
  _isEnsuring: boolean;
  
  // Método principal: verificar sessão sob demanda
  ensureSession: () => Promise<{ valid: boolean; session: Session | null }>;
  signOut: () => Promise<void>;
}

// Helper para adicionar timeout em promessas
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutError: Error): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(timeoutError), ms);
  });
  return Promise.race([promise, timeout]);
}

// Helper to check if user is active in profiles table
async function checkUserActive(userId: string): Promise<boolean> {
  console.log('🔍 [AuthStore] Verificando se usuário está ativo:', userId);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ [AuthStore] Erro ao verificar status do usuário:', error);
      return false;
    }
    
    console.log('✅ [AuthStore] Status do usuário:', data?.is_active);
    return data?.is_active ?? false;
  } catch (err) {
    console.error('❌ [AuthStore] Exceção ao verificar status:', err);
    return false;
  }
}

// Debounce para eventos de auth
let authChangeDebounce: NodeJS.Timeout | null = null;
let lastProcessedEvent: { event: string; timestamp: number } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isReady: false,
  isUserActive: false,
  _isEnsuring: false,

  ensureSession: async () => {
    console.log('🔐 [AuthStore] === ENSURE SESSION START ===');
    console.log('🔐 [AuthStore] Timestamp:', new Date().toISOString());
    
    // Evitar chamadas concorrentes
    if (get()._isEnsuring) {
      console.log('⚠️ [AuthStore] ensureSession já em andamento, aguardando...');
      // Aguardar até a flag ser liberada (máximo 10 segundos)
      const startWait = Date.now();
      while (get()._isEnsuring && Date.now() - startWait < 10000) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (get()._isEnsuring) {
        console.log('⚠️ [AuthStore] Timeout aguardando ensureSession, forçando nova tentativa');
        set({ _isEnsuring: false });
      } else {
        console.log('✅ [AuthStore] ensureSession anterior concluída, retornando estado atual');
        return { valid: !!get().session, session: get().session };
      }
    }
    
    set({ _isEnsuring: true });
    
    try {
      // Verificar se já temos sessão válida em cache (não expirada)
      const currentSession = get().session;
      if (currentSession && currentSession.expires_at) {
        const expiresAt = currentSession.expires_at * 1000;
        const now = Date.now();
        const bufferTime = 60 * 1000; // 1 minuto de buffer
        
        if (expiresAt - now > bufferTime) {
          console.log('✅ [AuthStore] Usando sessão em cache (ainda válida):', {
            expiresIn: Math.round((expiresAt - now) / 1000) + 's',
            userId: currentSession.user?.id
          });
          set({ _isEnsuring: false });
          return { valid: true, session: currentSession };
        } else {
          console.log('⚠️ [AuthStore] Sessão em cache próxima de expirar, renovando...');
        }
      }
      
      console.log('🔐 [AuthStore] Chamando supabase.auth.getSession() com timeout de 5s...');
      
      let sessionData: { session: Session | null } | null = null;
      let sessionError: Error | null = null;
      
      try {
        const result = await withTimeout(
          supabase.auth.getSession(),
          5000,
          new Error('Timeout ao obter sessão')
        );
        sessionData = result.data;
        if (result.error) {
          sessionError = result.error;
        }
      } catch (timeoutErr: any) {
        if (timeoutErr.message === 'Timeout ao obter sessão') {
          console.error('⏰ [AuthStore] getSession travou - tentando recuperar do localStorage...');
          
          // Tentar recuperar do localStorage
          try {
            const authToken = localStorage.getItem('sb-dbxaamdirxjrbolsegwz-auth-token');
            if (authToken) {
              const parsed = JSON.parse(authToken);
              if (parsed?.access_token && parsed?.refresh_token) {
                console.log('🔄 [AuthStore] Tentando setSession com token do localStorage');
                
                const { data: setSessionData, error: setSessionError } = await withTimeout(
                  supabase.auth.setSession({
                    access_token: parsed.access_token,
                    refresh_token: parsed.refresh_token
                  }),
                  5000,
                  new Error('Timeout ao definir sessão')
                );
                
                if (!setSessionError && setSessionData.session) {
                  console.log('✅ [AuthStore] Sessão recuperada do localStorage');
                  sessionData = { session: setSessionData.session };
                } else {
                  console.error('❌ [AuthStore] Falha ao recuperar sessão:', setSessionError);
                  sessionError = setSessionError;
                }
              }
            }
          } catch (localStorageErr) {
            console.error('❌ [AuthStore] Erro ao recuperar do localStorage:', localStorageErr);
            sessionError = localStorageErr as Error;
          }
        } else {
          throw timeoutErr;
        }
      }
      
      console.log('🔐 [AuthStore] getSession response:', {
        hasSession: !!sessionData?.session,
        hasError: !!sessionError,
        errorMessage: sessionError?.message,
        userId: sessionData?.session?.user?.id,
        userEmail: sessionData?.session?.user?.email,
        expiresAt: sessionData?.session?.expires_at 
          ? new Date(sessionData.session.expires_at * 1000).toISOString() 
          : null
      });
      
      if (sessionError) {
        console.error('❌ [AuthStore] Erro ao obter sessão:', sessionError);
        set({ user: null, session: null, isUserActive: false, isReady: true, _isEnsuring: false });
        return { valid: false, session: null };
      }
      
      if (!sessionData?.session) {
        console.log('⚠️ [AuthStore] Sem sessão válida - redirecionando para login');
        set({ user: null, session: null, isUserActive: false, isReady: true, _isEnsuring: false });
        return { valid: false, session: null };
      }
      
      // Verificar se usuário está ativo no banco
      const isActive = await checkUserActive(sessionData.session.user.id);
      
      if (!isActive) {
        console.log('⚠️ [AuthStore] Usuário não está ativo');
        set({ user: null, session: null, isUserActive: false, isReady: true, _isEnsuring: false });
        return { valid: false, session: null };
      }
      
      // Sessão válida e usuário ativo
      console.log('✅ [AuthStore] Sessão válida, atualizando estado:', {
        userId: sessionData.session.user.id,
        isActive,
        expiresAt: new Date((sessionData.session.expires_at || 0) * 1000).toISOString()
      });
      set({ 
        user: sessionData.session.user, 
        session: sessionData.session, 
        isUserActive: true,
        isReady: true,
        _isEnsuring: false
      });
      
      console.log('🔐 [AuthStore] === ENSURE SESSION END (SUCCESS) ===');
      return { valid: true, session: sessionData.session };
    } catch (err) {
      console.error('❌ [AuthStore] Exceção ao verificar sessão:', err);
      set({ user: null, session: null, isUserActive: false, isReady: true, _isEnsuring: false });
      return { valid: false, session: null };
    }
  },

  signOut: async () => {
    console.log('🚪 [AuthStore] Fazendo logout...');
    
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('❌ [AuthStore] Erro ao fazer signOut:', err);
    }
    
    set({ user: null, session: null, isUserActive: false, isReady: true, _isEnsuring: false });
    console.log('✅ [AuthStore] Logout realizado');
  }
}));

// Listener para eventos de auth (login/logout em outras abas) com debounce
supabase.auth.onAuthStateChange((event, session) => {
  const now = Date.now();
  
  // Evitar processar eventos duplicados (mesmo evento em menos de 200ms)
  if (lastProcessedEvent && 
      lastProcessedEvent.event === event && 
      now - lastProcessedEvent.timestamp < 200) {
    console.log('🔄 [AuthStore] Evento duplicado ignorado:', event);
    return;
  }
  
  // Debounce para evitar processar múltiplos eventos simultâneos
  if (authChangeDebounce) {
    clearTimeout(authChangeDebounce);
  }
  
  authChangeDebounce = setTimeout(() => {
    console.log('🌐 [AuthStore] === AUTH STATE CHANGE ===');
    console.log('🌐 [AuthStore] Event:', event);
    console.log('🌐 [AuthStore] Timestamp:', new Date().toISOString());
    console.log('🌐 [AuthStore] Session info:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      expiresAt: session?.expires_at 
        ? new Date(session.expires_at * 1000).toISOString() 
        : null,
      hasRefreshToken: !!session?.refresh_token
    });
    
    lastProcessedEvent = { event, timestamp: now };
    
    if (event === 'SIGNED_OUT') {
      console.log('🚪 [AuthStore] Usuário deslogado, limpando estado');
      useAuthStore.setState({ 
        user: null, 
        session: null, 
        isUserActive: false, 
        isReady: true 
      });
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('🔄 [AuthStore] Token atualizado automaticamente');
      useAuthStore.setState({ 
        user: session?.user ?? null, 
        session: session 
      });
    } else if (session) {
      console.log('✅ [AuthStore] Sessão atualizada');
      // Atualizar estado com nova sessão, mas não bloquear
      useAuthStore.setState({ 
        user: session.user, 
        session: session 
      });
    }
  }, 100); // 100ms debounce
});

// Listener para mudanças de visibilidade da aba
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    console.log('👁️ [Visibility] Tab visibility changed:', {
      state: document.visibilityState,
      timestamp: new Date().toISOString()
    });
  });
}
