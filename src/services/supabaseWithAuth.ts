import { supabase } from '@/integrations/supabase/client';
import AuthGateway, { isAuthError } from './AuthGateway';

/**
 * Cria uma query autenticada que:
 * 1. Garante sessão válida antes de executar
 * 2. Tenta refresh e retry em caso de erro de auth
 */
export async function createAuthenticatedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any | null }>
): Promise<T> {
  const gateway = AuthGateway.getInstance();

  // Verificar se está autenticado
  if (!gateway.isAuthenticated()) {
    console.warn('⚠️ [supabaseWithAuth] Não autenticado');
    throw new Error('Usuário não autenticado');
  }

  // Garantir sessão válida antes de executar
  return gateway.withValidSession(async () => {
    const response = await queryFn();

    if (response.error) {
      // Se for erro de auth, tentar refresh e retry UMA vez
      if (isAuthError(response.error)) {
        console.log('🔄 [supabaseWithAuth] Erro de auth detectado, tentando refresh...');
        
        const refreshed = await gateway.forceRefresh();
        
        if (refreshed) {
          console.log('✅ [supabaseWithAuth] Refresh bem sucedido, retentando query...');
          const retryResponse = await queryFn();
          
          if (retryResponse.error) {
            console.error('❌ [supabaseWithAuth] Query falhou mesmo após refresh:', retryResponse.error);
            throw retryResponse.error;
          }
          
          return retryResponse.data as T;
        } else {
          console.error('❌ [supabaseWithAuth] Refresh falhou');
          throw response.error;
        }
      }
      
      throw response.error;
    }

    return response.data as T;
  });
}

/**
 * Wrapper para queries que não requerem autenticação
 * (rotas públicas)
 */
export async function createPublicQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any | null }>
): Promise<T> {
  const response = await queryFn();
  
  if (response.error) {
    throw response.error;
  }
  
  return response.data as T;
}

/**
 * Helper para criar uma mutation autenticada
 */
export async function createAuthenticatedMutation<T>(
  mutationFn: () => Promise<{ data: T | null; error: any | null }>
): Promise<T> {
  // Usa a mesma lógica de query
  return createAuthenticatedQuery(mutationFn);
}

export { supabase };
