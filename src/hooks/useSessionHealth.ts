import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSessionHealth() {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          // Apenas tenta renovar a sessão proativamente
          // NÃO redirecionar - deixar isso para o ProtectedRoute
          const { error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.warn("⚠️ [SessionHealth] Não foi possível renovar sessão:", error.message);
          } else {
            console.log("✅ [SessionHealth] Sessão renovada ao voltar para aba");
          }
        } catch (error) {
          console.error("❌ [SessionHealth] Erro ao verificar sessão:", error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
