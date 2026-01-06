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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isReady: false,
  isUserActive: false,

  ensureSession: async () => {
    console.log('🔍 [AuthStore] Verificando sessão on-demand...');
    
    try {
      // Supabase automaticamente usa o refresh_token se o access_token expirou
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ [AuthStore] Erro ao obter sessão:', error);
        set({ user: null, session: null, isUserActive: false, isReady: true });
        return { valid: false, session: null };
      }
      
      if (!data.session) {
        console.log('⚠️ [AuthStore] Sem sessão válida');
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
      console.log('✅ [AuthStore] Sessão válida');
      set({ 
        user: data.session.user, 
        session: data.session, 
        isUserActive: true,
        isReady: true 
      });
      
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
  console.log('🔄 [AuthStore] Auth event:', event);
  
  if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ 
      user: null, 
      session: null, 
      isUserActive: false, 
      isReady: true 
    });
  } else if (session) {
    // Atualizar estado com nova sessão, mas não bloquear
    useAuthStore.setState({ 
      user: session.user, 
      session: session 
    });
  }
});
