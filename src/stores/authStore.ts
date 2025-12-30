import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  isUserActive: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

// Flags externas para garantir inicialização única
let isInitializing = false;
let isInitialized = false;
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// Funções auxiliares fora do store
async function checkUserActive(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ [AuthStore] Erro ao verificar is_active:', error);
      return true; // Assume ativo em caso de erro
    }
    
    return data?.is_active ?? true;
  } catch (err) {
    console.error('❌ [AuthStore] Exceção ao verificar is_active:', err);
    return true;
  }
}

function startRefreshInterval() {
  if (refreshInterval) return;
  
  console.log('⏰ [AuthStore] Iniciando refresh interval');
  
  refreshInterval = setInterval(async () => {
    const state = useAuthStore.getState();
    const { session } = state;
    
    if (!session?.expires_at) return;
    
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry > 0 && timeUntilExpiry < fiveMinutes) {
      console.log('🔄 [AuthStore] Token expirando em breve, renovando proativamente...');
      await state.refreshSession();
    }
  }, 60 * 1000); // Verifica a cada 1 minuto
}

function stopRefreshInterval() {
  if (refreshInterval) {
    console.log('⏹️ [AuthStore] Parando refresh interval');
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isReady: false,
  isUserActive: true,

  initialize: async () => {
    // Prevenir inicialização duplicada de forma absoluta
    if (isInitializing || isInitialized) {
      console.log('⚠️ [AuthStore] Já inicializado/inicializando, ignorando');
      return;
    }
    
    isInitializing = true;
    console.log('🚀 [AuthStore] Inicializando...');

    // ÚNICO listener em toda a aplicação
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 [AuthStore] Auth event: ${event}`, {
        userId: session?.user?.id?.substring(0, 8),
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
      });
      
      // Atualizar estado sincronamente
      set({ 
        session, 
        user: session?.user ?? null 
      });

      if (event === 'SIGNED_OUT') {
        set({ isUserActive: false, isReady: true });
        stopRefreshInterval();
        return;
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        console.log('✅ [AuthStore] Token renovado com sucesso');
        startRefreshInterval();
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Verificar is_active de forma assíncrona (usando setTimeout para evitar deadlock)
        setTimeout(async () => {
          const isActive = await checkUserActive(session.user.id);
          set({ isUserActive: isActive });
          
          if (!isActive) {
            console.log('🚫 [AuthStore] Usuário inativo, fazendo logout');
            get().signOut();
          } else {
            startRefreshInterval();
          }
        }, 0);
      }
    });

    // Buscar sessão inicial
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ [AuthStore] Erro ao buscar sessão inicial:', error);
        set({ isReady: true });
        isInitializing = false;
        isInitialized = true;
        return;
      }
      
      if (session?.user) {
        console.log('📦 [AuthStore] Sessão inicial encontrada:', session.user.id.substring(0, 8));
        
        // Verificar is_active
        const isActive = await checkUserActive(session.user.id);
        
        set({ 
          user: session.user, 
          session, 
          isReady: true,
          isUserActive: isActive 
        });
        
        if (isActive) {
          startRefreshInterval();
        } else {
          console.log('🚫 [AuthStore] Usuário inativo na sessão inicial');
        }
      } else {
        console.log('📭 [AuthStore] Sem sessão inicial');
        set({ isReady: true });
      }
    } catch (err) {
      console.error('❌ [AuthStore] Exceção ao buscar sessão inicial:', err);
      set({ isReady: true });
    }

    isInitializing = false;
    isInitialized = true;
    console.log('✅ [AuthStore] Inicialização concluída');
  },

  refreshSession: async () => {
    console.log('🔄 [AuthStore] Renovando sessão...');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ [AuthStore] Erro no refresh:', error);
        
        // Se for erro irrecuperável, fazer logout
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('invalid_grant') ||
            error.status === 400) {
          console.log('🚪 [AuthStore] Erro irrecuperável, fazendo logout');
          await get().signOut();
        }
        
        return false;
      }
      
      if (data.session) {
        console.log('✅ [AuthStore] Sessão renovada com sucesso');
        set({ session: data.session, user: data.session.user });
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('❌ [AuthStore] Exceção no refresh:', err);
      return false;
    }
  },

  signOut: async () => {
    console.log('🚪 [AuthStore] Fazendo logout...');
    stopRefreshInterval();
    
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('❌ [AuthStore] Erro no signOut:', err);
    }
    
    set({ user: null, session: null, isUserActive: false, isReady: true });
  }
}));

// Auto-inicializar quando o módulo é carregado
useAuthStore.getState().initialize();
