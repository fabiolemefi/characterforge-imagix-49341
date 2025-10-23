import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "@/integrations/supabase/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper function to retry Supabase operations with automatic token refresh
 * Useful for long-running operations that might encounter expired tokens
 */
export async function retryWithAuthRefresh<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Executing Supabase operation (attempt ${attempt + 1}/${maxRetries})`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Supabase operation failed (attempt ${attempt + 1}):`, error.message);

      // Check if this is an authentication-related error
      const isAuthError = error.message?.includes('JWT') ||
                         error.message?.includes('expired') ||
                         error.message?.includes('unauthorized') ||
                         error.status === 401 ||
                         error.code === 'PGRST301';

      if (isAuthError && attempt < maxRetries - 1) {
        console.log(`🔑 Authentication error detected. Refreshing session...`);

        try {
          // Force a session refresh
          const { error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.error('❌ Failed to refresh session:', refreshError);
            throw refreshError;
          }

          console.log('✅ Session refreshed successfully');

          // Wait a bit before retrying to allow session to propagate
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));

        } catch (refreshError) {
          console.error('❌ Critical: Session refresh failed:', refreshError);
          throw refreshError; // Don't retry if refresh itself fails
        }
      } else {
        // Not a recoverable error or last attempt - throw immediately
        throw error;
      }
    }
  }

  console.error('❌ All retry attempts failed');
  throw lastError;
}
