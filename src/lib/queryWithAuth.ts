import { supabase } from "@/integrations/supabase/client";

/**
 * Detects if an error is related to authentication/authorization
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  const errorStatus = error.status;
  
  return (
    errorCode === 'PGRST301' ||
    errorCode === 'PGRST401' ||
    errorStatus === 401 ||
    errorStatus === 403 ||
    errorMessage.includes('jwt') ||
    errorMessage.includes('token') ||
    errorMessage.includes('auth') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('invalid claim') ||
    errorMessage.includes('session')
  );
}

/**
 * Wrapper for queries that handles authentication errors
 * Attempts to refresh the session before retrying
 */
export async function queryWithAuth<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    return await queryFn();
  } catch (error: any) {
    console.warn("⚠️ [queryWithAuth] Query error:", {
      error,
      code: error?.code,
      message: error?.message,
      isAuthError: isAuthError(error),
      timestamp: new Date().toISOString()
    });
    
    if (isAuthError(error)) {
      console.log("🔄 [queryWithAuth] Auth error detected, attempting session refresh...");
      
      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !data.session) {
          console.error("❌ [queryWithAuth] Session refresh FAILED:", {
            refreshError,
            hasSession: !!data?.session,
            timestamp: new Date().toISOString()
          });
          // Force logout and redirect
          await supabase.auth.signOut();
          window.location.href = '/login';
          throw new Error("Sessão expirada. Por favor, faça login novamente.");
        }
        
        console.log("✅ [queryWithAuth] Session refreshed successfully, retrying query...");
        // Retry the query after successful refresh
        return await queryFn();
      } catch (refreshError) {
        console.error("❌ [queryWithAuth] Error during session refresh:", {
          refreshError,
          timestamp: new Date().toISOString()
        });
        await supabase.auth.signOut();
        window.location.href = '/login';
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }
    }
    
    throw error;
  }
}

/**
 * Verifies if there's an active session before executing a query
 */
export async function ensureSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn("No active session found");
      return false;
    }
    
    // Check if token is about to expire (within 5 minutes)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresInMs = expiresAt * 1000 - Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (expiresInMs < fiveMinutes) {
        console.log("Session expiring soon, refreshing...");
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.error("Proactive refresh failed:", error);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error checking session:", error);
    return false;
  }
}
