import { supabase } from "@/integrations/supabase/client";

export interface HealthCheckResult {
  isHealthy: boolean;
  error?: string;
  details: {
    hasUrl: boolean;
    hasAnonKey: boolean;
    hasSession: boolean;
    sessionExpiry?: string;
    userId?: string;
  };
}

/**
 * Verifica a saúde da conexão com Supabase
 * Inclui verificação de configuração, sessão e conectividade
 */
export async function checkSupabaseHealth(timeout: number = 10000): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    console.log('🏥 [HealthCheck] Iniciando verificação de saúde...');
    
    // Verificar configuração básica
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const hasUrl = !!supabaseUrl;
    const hasAnonKey = !!supabaseAnonKey;
    
    console.log('🏥 [HealthCheck] Config:', { hasUrl, hasAnonKey });
    
    if (!hasUrl || !hasAnonKey) {
      return {
        isHealthy: false,
        error: 'Configuração do Supabase inválida',
        details: { hasUrl, hasAnonKey, hasSession: false }
      };
    }

    // Verificar sessão com timeout
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout ao verificar sessão')), timeout)
    );
    
    const { data: { session }, error: sessionError } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]) as any;

    if (sessionError) {
      console.error('🏥 [HealthCheck] Erro ao verificar sessão:', sessionError);
      return {
        isHealthy: false,
        error: `Erro de sessão: ${sessionError.message}`,
        details: { hasUrl, hasAnonKey, hasSession: false }
      };
    }

    const hasSession = !!session;
    const userId = session?.user?.id;
    const sessionExpiry = session?.expires_at 
      ? new Date(session.expires_at * 1000).toISOString() 
      : undefined;

    console.log('🏥 [HealthCheck] Sessão:', { 
      hasSession, 
      userId: userId?.substring(0, 8) + '...', 
      expiresAt: sessionExpiry 
    });

    if (!hasSession) {
      return {
        isHealthy: false,
        error: 'Sessão não encontrada',
        details: { hasUrl, hasAnonKey, hasSession: false }
      };
    }

    // Verificar conectividade com uma query simples
    console.log('🏥 [HealthCheck] Testando conectividade com o banco...');
    const queryPromise = supabase.from('profiles').select('id').limit(1);
    const queryTimeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout ao testar query')), timeout)
    );

    const { error: queryError } = await Promise.race([
      queryPromise,
      queryTimeoutPromise
    ]) as any;

    if (queryError) {
      console.error('🏥 [HealthCheck] Erro ao testar conectividade:', queryError);
      return {
        isHealthy: false,
        error: `Erro de conectividade: ${queryError.message}`,
        details: { hasUrl, hasAnonKey, hasSession, userId, sessionExpiry }
      };
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [HealthCheck] Verificação concluída com sucesso em ${duration}ms`);

    return {
      isHealthy: true,
      details: { hasUrl, hasAnonKey, hasSession, userId, sessionExpiry }
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [HealthCheck] Falhou após ${duration}ms:`, error);
    
    return {
      isHealthy: false,
      error: error.message || 'Erro desconhecido na verificação de saúde',
      details: {
        hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        hasSession: false
      }
    };
  }
}
