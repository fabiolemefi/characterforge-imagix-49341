import { supabase } from "@/integrations/supabase/client";

export interface SafeQueryOptions {
  timeout?: number; // Em ms, padrão 15000
  maxRetries?: number; // Padrão 3
  retryDelay?: number; // Delay inicial em ms, padrão 1000
  operationName?: string; // Nome da operação para logs
}

export interface SafeQueryResult<T> {
  data: T | null;
  error: any | null;
  success: boolean;
  attempts: number;
}

/**
 * Wrapper seguro para queries do Supabase com:
 * - Timeout configurável
 * - Retry automático com exponential backoff
 * - Renovação automática de sessão em erros de autenticação
 * - Logs detalhados
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any | null }>,
  options: SafeQueryOptions = {}
): Promise<SafeQueryResult<T>> {
  const {
    timeout = 15000,
    maxRetries = 3,
    retryDelay = 1000,
    operationName = 'Query'
  } = options;

  let lastError: any = null;
  let attempts = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    attempts++;
    const startTime = Date.now();

    try {
      console.log(`🔄 [SafeQuery] ${operationName} - Tentativa ${attempt + 1}/${maxRetries}`);

      // Criar promise de timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout após ${timeout}ms`)), timeout)
      );

      // Executar query com timeout
      const result = await Promise.race([
        queryFn(),
        timeoutPromise
      ]) as { data: T | null; error: any | null };

      const duration = Date.now() - startTime;

      if (result.error) {
        lastError = result.error;
        console.error(`❌ [SafeQuery] ${operationName} falhou em ${duration}ms:`, {
          message: result.error.message,
          code: result.error.code,
          status: result.error.status,
          hint: result.error.hint
        });

        // Verificar se é erro de autenticação
        const isAuthError = 
          result.error.message?.includes('JWT') ||
          result.error.message?.includes('expired') ||
          result.error.message?.includes('unauthorized') ||
          result.error.code === 'PGRST301' ||
          result.error.status === 401;

        if (isAuthError && attempt < maxRetries - 1) {
          console.log(`🔑 [SafeQuery] Erro de autenticação detectado, renovando sessão...`);
          
          try {
            const { error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('❌ [SafeQuery] Falha ao renovar sessão:', refreshError);
              throw refreshError;
            }
            
            console.log('✅ [SafeQuery] Sessão renovada com sucesso');
            
            // Aguardar antes de tentar novamente
            const delay = retryDelay * Math.pow(2, attempt);
            console.log(`⏳ [SafeQuery] Aguardando ${delay}ms antes de nova tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            continue; // Tentar novamente
          } catch (refreshError) {
            console.error('❌ [SafeQuery] Erro crítico ao renovar sessão:', refreshError);
            return {
              data: null,
              error: refreshError,
              success: false,
              attempts
            };
          }
        }

        // Se não é erro de auth ou é a última tentativa, retornar erro
        if (attempt === maxRetries - 1) {
          console.error(`❌ [SafeQuery] ${operationName} falhou após ${attempts} tentativas`);
          return {
            data: null,
            error: result.error,
            success: false,
            attempts
          };
        }

        // Aguardar antes de tentar novamente
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`⏳ [SafeQuery] Aguardando ${delay}ms antes de nova tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } else {
        // Sucesso!
        console.log(`✅ [SafeQuery] ${operationName} concluída com sucesso em ${duration}ms`);
        
        if (duration > 5000) {
          console.warn(`⚠️ [SafeQuery] Query lenta: ${operationName} levou ${duration}ms`);
        }

        return {
          data: result.data,
          error: null,
          success: true,
          attempts
        };
      }
    } catch (error: any) {
      lastError = error;
      const duration = Date.now() - startTime;
      
      console.error(`❌ [SafeQuery] ${operationName} - Exceção após ${duration}ms:`, {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });

      // Se for timeout e não for a última tentativa, tentar novamente
      if (error.message?.includes('Timeout') && attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`⏳ [SafeQuery] Timeout detectado, aguardando ${delay}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Última tentativa ou erro não recuperável
      if (attempt === maxRetries - 1) {
        console.error(`❌ [SafeQuery] ${operationName} falhou após ${attempts} tentativas`);
        return {
          data: null,
          error,
          success: false,
          attempts
        };
      }
    }
  }

  // Fallback (nunca deve chegar aqui, mas por segurança)
  console.error(`❌ [SafeQuery] ${operationName} falhou inesperadamente`);
  return {
    data: null,
    error: lastError || new Error('Falha desconhecida'),
    success: false,
    attempts
  };
}
