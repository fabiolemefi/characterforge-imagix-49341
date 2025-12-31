import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  isUserActive: boolean;
  initialize: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

// Helper to check if user is active in profiles table
async function checkUserActive(userId: string): Promise<boolean> {
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
    
    return data?.is_active ?? false;
  } catch (err) {
    console.error('❌ [AuthStore] Exceção ao verificar status:', err);
    return false;
  }
}

// Refresh interval management
let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

function startRefreshInterval() {
  if (refreshIntervalId) return;
  
  console.log('⏰ [AuthStore] Iniciando refresh interval (30s)');
  
  refreshIntervalId = setInterval(async () => {
    const state = useAuthStore.getState();
    if (!state.session) return;
    
    const expiresAt = state.session.expires_at;
    if (!expiresAt) return;
    
    const now = Date.now();
    const expiryTime = expiresAt * 1000;
    const timeUntilExpiry = expiryTime - now;
    const tenMinutes = 10 * 60 * 1000; // 10 minutos de margem
    
    console.log(`⏰ [AuthStore] Token expira em ${Math.round(timeUntilExpiry / 1000 / 60)} minutos`);
    
    if (timeUntilExpiry > 0 && timeUntilExpiry < tenMinutes) {
      console.log('🔄 [AuthStore] Refresh proativo do token...');
      await state.refreshSession();
    }
  }, 30 * 1000); // Verificar a cada 30 segundos
}

function stopRefreshInterval() {
  if (refreshIntervalId) {
    console.log('⏹️ [AuthStore] Parando refresh interval');
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}

// Track visibility changes and inactive time
let lastVisibleTime = Date.now();
let visibilityListenerAttached = false;
let storageListenerAttached = false;
let sessionVerificationPromise: Promise<void> | null = null;
let sessionVerificationResolve: (() => void) | null = null;

async function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    const inactiveTime = Date.now() - lastVisibleTime;
    console.log(`👁️ [AuthStore] Aba voltou após ${Math.round(inactiveTime / 1000)}s inativo`);
    
    const state = useAuthStore.getState();
    if (!state.session) return;
    
    // Criar promise para sincronização
    sessionVerificationPromise = new Promise<void>((resolve) => {
      sessionVerificationResolve = resolve;
    });
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        console.log('⚠️ [AuthStore] Sessão inválida ao retornar, tentando refresh...');
        const refreshed = await state.refreshSession();
        if (!refreshed) {
          console.log('❌ [AuthStore] Refresh falhou, fazendo logout...');
        }
      } else {
        useAuthStore.setState({ 
          session: data.session, 
          user: data.session.user 
        });
      }
    } finally {
      sessionVerificationResolve?.();
      sessionVerificationPromise = null;
      sessionVerificationResolve = null;
    }
  } else {
    lastVisibleTime = Date.now();
  }
}

// Handle storage events for multi-tab sync
function handleStorageChange(event: StorageEvent) {
  if (event.key?.includes('auth-token')) {
    console.log('🔄 [AuthStore] Sessão mudou em outra aba, sincronizando...');
    
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        useAuthStore.setState({ 
          session: data.session, 
          user: data.session.user 
        });
        console.log('✅ [AuthStore] Sessão sincronizada de outra aba');
      } else {
        // Outra aba fez logout
        useAuthStore.setState({ 
          session: null, 
          user: null,
          isUserActive: false 
        });
        console.log('🚪 [AuthStore] Logout detectado em outra aba');
      }
    });
  }
}

// Export function to wait for session verification
export async function waitForSessionVerification(): Promise<void> {
  if (sessionVerificationPromise) {
    await sessionVerificationPromise;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isReady: false,
  isUserActive: false,

  initialize: async () => {
    console.log('🚀 [AuthStore] Inicializando...');
    
    // Setup visibility change listener (once)
    if (!visibilityListenerAttached) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityListenerAttached = true;
    }
    
    // Setup storage listener for multi-tab sync (once)
    if (!storageListenerAttached) {
      window.addEventListener('storage', handleStorageChange);
      storageListenerAttached = true;
    }
    
    // Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 [AuthStore] Auth event:', event, {
          userId: session?.user?.id?.slice(0, 8),
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
        });
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            stopRefreshInterval();
            set({ user: null, session: null, isUserActive: false, isReady: true });
            return;
          }
        }
        
        if (session?.user) {
          set({ user: session.user, session });
          
          // Defer Supabase call to avoid deadlock
          setTimeout(async () => {
            const isActive = await checkUserActive(session.user.id);
            set({ isUserActive: isActive, isReady: true });
            startRefreshInterval();
          }, 0);
        } else {
          set({ user: null, session: null, isUserActive: false, isReady: true });
        }
      }
    );

    // Get initial session
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ [AuthStore] Erro ao obter sessão inicial:', error);
        set({ isReady: true });
        return;
      }
      
      if (session?.user) {
        console.log('📦 [AuthStore] Sessão inicial encontrada:', session.user.id.slice(0, 8));
        set({ user: session.user, session });
        
        const isActive = await checkUserActive(session.user.id);
        set({ isUserActive: isActive, isReady: true });
        startRefreshInterval();
      } else {
        set({ isReady: true });
      }
    } catch (err) {
      console.error('❌ [AuthStore] Exceção ao inicializar:', err);
      set({ isReady: true });
    }
    
    console.log('✅ [AuthStore] Inicialização concluída');
  },

  refreshSession: async () => {
    const MAX_RETRIES = 3;
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`🔄 [AuthStore] Tentativa de refresh ${retryCount + 1}/${MAX_RETRIES}...`);
        
        const { data, error } = await supabase.auth.refreshSession();
        
        if (!error && data.session) {
          console.log('✅ [AuthStore] Token renovado com sucesso');
          set({ session: data.session, user: data.session.user });
          return true;
        }
        
        // Erros irrecuperáveis - não tentar novamente
        if (error?.message?.includes('refresh_token_not_found') ||
            error?.message?.includes('invalid_grant') ||
            error?.message?.includes('Invalid Refresh Token')) {
          console.error('❌ [AuthStore] Erro irrecuperável de refresh:', error.message);
          break;
        }
        
        // Erro recuperável - tentar novamente com backoff
        console.warn(`⚠️ [AuthStore] Erro de refresh (tentativa ${retryCount + 1}):`, error?.message);
        retryCount++;
        
        if (retryCount < MAX_RETRIES) {
          const delay = 1000 * retryCount;
          console.log(`⏳ [AuthStore] Aguardando ${delay}ms antes de retry...`);
          await new Promise(r => setTimeout(r, delay));
        }
        
      } catch (err) {
        console.error(`❌ [AuthStore] Exceção no refresh (tentativa ${retryCount + 1}):`, err);
        retryCount++;
        
        if (retryCount < MAX_RETRIES) {
          const delay = 1000 * retryCount;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    
    // Esgotou retries - fazer logout
    console.error('❌ [AuthStore] Todas as tentativas de refresh falharam, fazendo logout...');
    await get().signOut();
    return false;
  },

  signOut: async () => {
    const wasForced = get().session !== null;
    
    stopRefreshInterval();
    
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('❌ [AuthStore] Erro ao fazer signOut:', err);
    }
    
    set({ user: null, session: null, isUserActive: false, isReady: true });
    
    if (wasForced) {
      toast.error('Sessão expirada', {
        description: 'Por favor, faça login novamente.'
      });
    }
    
    console.log('🚪 [AuthStore] Logout realizado');
  }
}));

// Initialize on load
useAuthStore.getState().initialize();
