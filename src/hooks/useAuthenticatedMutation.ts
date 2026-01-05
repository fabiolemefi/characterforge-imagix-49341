import { useAuthStore, waitForSessionVerification } from "@/stores/authStore";

/**
 * Ensures a valid session exists before making authenticated requests.
 * - Waits for any ongoing session verification
 * - Proactively refreshes token if it expires within 2 minutes
 * - Returns true if session is valid, false otherwise
 */
export async function ensureValidSession(): Promise<boolean> {
  // Wait for any ongoing session verification (e.g., from tab visibility change)
  await waitForSessionVerification();
  
  const state = useAuthStore.getState();
  const session = state.session;
  
  if (!session) {
    console.warn("⚠️ [ensureValidSession] No session found");
    return false;
  }
  
  // Check if token expires within 2 minutes
  const expiresAt = session.expires_at;
  if (expiresAt) {
    const now = Date.now();
    const expiryTime = expiresAt * 1000;
    const twoMinutes = 2 * 60 * 1000;
    
    if (expiryTime - now < twoMinutes) {
      console.log("🔄 [ensureValidSession] Token expiring soon, refreshing proactively...");
      const refreshed = await state.refreshSession();
      if (!refreshed) {
        console.error("❌ [ensureValidSession] Failed to refresh session");
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || "";
  const statusCode = error.status || error.statusCode;
  
  return (
    statusCode === 401 ||
    statusCode === 403 ||
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("unauthorized") ||
    message.includes("not authenticated") ||
    message.includes("session") ||
    message.includes("expired")
  );
}

/**
 * Wraps an async function with session validation and retry logic
 */
export async function withAuthRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  // Ensure valid session before first attempt
  const sessionValid = await ensureValidSession();
  if (!sessionValid) {
    throw new Error("Sessão expirada. Por favor, faça login novamente.");
  }
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // If auth error and we have retries left, try to refresh and retry
      if (isAuthError(error) && attempt < maxRetries) {
        console.log(`🔄 [withAuthRetry] Auth error on attempt ${attempt + 1}, refreshing session...`);
        
        const refreshed = await useAuthStore.getState().refreshSession();
        if (refreshed) {
          console.log("✅ [withAuthRetry] Session refreshed, retrying operation...");
          continue;
        } else {
          console.error("❌ [withAuthRetry] Failed to refresh session, giving up");
          throw new Error("Sessão expirada. Por favor, faça login novamente.");
        }
      }
      
      // Not an auth error or no retries left, throw
      throw error;
    }
  }
  
  throw lastError;
}
