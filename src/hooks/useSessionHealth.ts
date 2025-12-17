import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSessionHealth() {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("👁️ [SessionHealth] Aba ativada, verificando sessão...", { timestamp: new Date().toISOString() });
        
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("❌ [SessionHealth] Erro ao verificar sessão:", {
              sessionError,
              timestamp: new Date().toISOString()
            });
            return;
          }
          
          if (!session) {
            console.warn("⚠️ [SessionHealth] Sem sessão ativa ao voltar para aba");
            return;
          }
          
          console.log("📋 [SessionHealth] Sessão atual:", {
            userId: session.user?.id,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
            expiresIn: session.expires_at ? Math.round((session.expires_at * 1000 - Date.now()) / 1000 / 60) + ' minutos' : 'N/A',
            timestamp: new Date().toISOString()
          });
          
          // Apenas tenta renovar a sessão proativamente
          const { error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.warn("⚠️ [SessionHealth] Não foi possível renovar sessão:", {
              error: error.message,
              timestamp: new Date().toISOString()
            });
          } else {
            console.log("✅ [SessionHealth] Sessão renovada ao voltar para aba");
          }
        } catch (error) {
          console.error("❌ [SessionHealth] Erro ao verificar sessão:", {
            error,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
