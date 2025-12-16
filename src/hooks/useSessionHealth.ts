import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSessionHealth() {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            window.location.href = '/login';
            return;
          }
          
          // Check if token is close to expiring (10 minutes)
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const now = Date.now();
          const tenMinutes = 10 * 60 * 1000;
          
          if (expiresAt - now < tenMinutes) {
            await supabase.auth.refreshSession();
          }
        } catch (error) {
          console.error("Error checking session health:", error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
