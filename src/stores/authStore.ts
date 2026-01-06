import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  isUserActive: boolean;
  
  // Método principal: verificar sessão sob demanda
  ensureSession: () => Promise<{ valid: boolean; session: Session | null }>;
  signOut: () => Promise<void>;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isReady: false,
  isUserActive: false,

  ensureSession: async () => {
    console.log('🔐 [AuthStore] === ENSURE SESSION START ===');
    console.log('🔐 [AuthStore] Timestamp:', new Date().toISOString());
    console.log('🔐 [AuthStore] Estado atual:', {
      hasUser: !!get().user,
      hasSession: !!get().session,
      isReady: get().isReady,
      isUserActive: get().isUserActive
    });
    
    // Verificar localStorage para debug
    try {
      const localStorageKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('auth'));
      console.log('🔐 [AuthStore] LocalStorage keys relacionadas:', localStorageKeys);
      
      const authToken = localStorage.getItem('sb-dbxaamdirxjrbolsegwz-auth-token');
      if (authToken) {
        const parsed = JSON.parse(authToken);
        console.log('🔐 [AuthStore] Token no localStorage:', {
          hasAccessToken: !!parsed?.access_token,
          hasRefreshToken: !!parsed?.refresh_token,
          refreshTokenPreview: parsed?.refresh_token?.substring(0, 20) + '...',
          expiresAt: parsed?.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : null
        });
      } else {
        console.log('⚠️ [AuthStore] Nenhum token no localStorage!');
      }
    } catch (e) {
      console.log('⚠️ [AuthStore] Erro ao ler localStorage:', e);
    }
    
    try {
      console.log('🔐 [AuthStore] Chamando supabase.auth.getSession()...');
      // Supabase automaticamente usa o refresh_token se o access_token expirou
      const { data, error } = await supabase.auth.getSession();
      
      console.log('🔐 [AuthStore] getSession response:', {
        hasSession: !!data.session,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: (error as any)?.code,
        userId: data.session?.user?.id,
        userEmail: data.session?.user?.email,
        expiresAt: data.session?.expires_at 
          ? new Date(data.session.expires_at * 1000).toISOString() 
          : null,
        hasAccessToken: !!data.session?.access_token,
        hasRefreshToken: !!data.session?.refresh_token,
        refreshTokenPreview: data.session?.refresh_token?.substring(0, 20) + '...'
      });
      
      if (error) {
        console.error('❌ [AuthStore] Erro ao obter sessão:', error);
        set({ user: null, session: null, isUserActive: false, isReady: true });
        return { valid: false, session: null };
      }
      
      if (!data.session) {
        console.log('⚠️ [AuthStore] Sem sessão válida - redirecionando para login');
        set({ user: null, session: null, isUserActive: false, isReady: true });
        return { valid: false, session: null };
      }
      
      // Verificar se usuário está ativo no banco
      const isActive = await checkUserActive(data.session.user.id);
      
      if (!isActive) {
        console.log('⚠️ [AuthStore] Usuário não está ativo');
        set({ user: null, session: null, isUserActive: false, isReady: true });
        return { valid: false, session: null };
      }
      
      // Sessão válida e usuário ativo
      console.log('✅ [AuthStore] Sessão válida, atualizando estado:', {
        userId: data.session.user.id,
        isActive,
        expiresAt: new Date((data.session.expires_at || 0) * 1000).toISOString()
      });
      set({ 
        user: data.session.user, 
        session: data.session, 
        isUserActive: true,
        isReady: true 
      });
      
      console.log('🔐 [AuthStore] === ENSURE SESSION END (SUCCESS) ===');
      return { valid: true, session: data.session };
    } catch (err) {
      console.error('❌ [AuthStore] Exceção ao verificar sessão:', err);
      set({ user: null, session: null, isUserActive: false, isReady: true });
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
    
    set({ user: null, session: null, isUserActive: false, isReady: true });
    console.log('✅ [AuthStore] Logout realizado');
  }
}));

// Listener para eventos de auth (login/logout em outras abas)
supabase.auth.onAuthStateChange((event, session) => {
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
