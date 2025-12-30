import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type SessionLostCallback = () => void;
type SessionRefreshedCallback = (session: Session) => void;
type UserStatusCallback = (user: User | null, session: Session | null) => void;

interface UserProfile {
  id: string;
  is_active: boolean;
  cachedAt: number;
}

/**
 * AuthGateway - Singleton central para gerenciamento de autenticação
 * 
 * Responsabilidades:
 * - Monitorar continuamente a validade do token
 * - Renovar proativamente antes da expiração
 * - Serializar múltiplas tentativas de refresh (evitar race conditions)
 * - Notificar a aplicação quando a sessão é perdida
 * - Cache de status de usuário (is_active)
 */
class AuthGateway {
  private static instance: AuthGateway;
  
  // Configurações
  private readonly REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 min antes de expirar
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // Verificar a cada 1 min
  private readonly PROFILE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos cache do profile
  
  // Estado
  private refreshPromise: Promise<Session | null> | null = null;
  private tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private isInitialized = false;
  private cachedProfile: UserProfile | null = null;
  
  // Callbacks
  private onSessionLostCallback: SessionLostCallback | null = null;
  private onSessionRefreshedCallback: SessionRefreshedCallback | null = null;
  private onUserStatusChangeCallback: UserStatusCallback | null = null;

  private constructor() {
    console.log('🔐 [AuthGateway] Instância criada');
  }

  static getInstance(): AuthGateway {
    if (!AuthGateway.instance) {
      AuthGateway.instance = new AuthGateway();
    }
    return AuthGateway.instance;
  }

  /**
   * Inicializa o gateway - deve ser chamado uma vez no início da aplicação
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ [AuthGateway] Já inicializado');
      return;
    }

    console.log('🚀 [AuthGateway] Inicializando...');

    // Configurar listener de auth state PRIMEIRO
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [AuthGateway] Auth event:', event);
      
      this.currentSession = session;
      this.currentUser = session?.user ?? null;
      
      // Notificar mudança de status
      this.onUserStatusChangeCallback?.(this.currentUser, this.currentSession);
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          this.clearCache();
          this.stopProactiveRefresh();
          this.onSessionLostCallback?.();
        } else if (session) {
          this.onSessionRefreshedCallback?.(session);
        }
      }
    });

    // Buscar sessão inicial
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ [AuthGateway] Erro ao buscar sessão inicial:', error);
        this.isInitialized = true;
        return;
      }

      this.currentSession = session;
      this.currentUser = session?.user ?? null;

      if (session) {
        console.log('✅ [AuthGateway] Sessão encontrada:', {
          userId: session.user.id.substring(0, 8),
          expiresAt: new Date(session.expires_at! * 1000).toISOString()
        });
        
        // Iniciar refresh proativo
        this.startProactiveRefresh();
        
        // Verificar e cachear status do usuário
        await this.checkAndCacheUserStatus(session.user.id);
      } else {
        console.log('ℹ️ [AuthGateway] Nenhuma sessão encontrada');
      }

      this.isInitialized = true;
      this.onUserStatusChangeCallback?.(this.currentUser, this.currentSession);
      
    } catch (error) {
      console.error('❌ [AuthGateway] Erro na inicialização:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Inicia o timer de refresh proativo
   */
  private startProactiveRefresh(): void {
    if (this.tokenRefreshInterval) {
      return; // Já está rodando
    }

    console.log('⏰ [AuthGateway] Iniciando refresh proativo');

    this.tokenRefreshInterval = setInterval(async () => {
      await this.checkAndRefreshIfNeeded();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Para o timer de refresh proativo
   */
  private stopProactiveRefresh(): void {
    if (this.tokenRefreshInterval) {
      console.log('⏹️ [AuthGateway] Parando refresh proativo');
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  /**
   * Verifica se o token precisa ser renovado e renova se necessário
   */
  private async checkAndRefreshIfNeeded(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    const expiresAt = this.currentSession.expires_at! * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    console.log('🔍 [AuthGateway] Verificando token:', {
      expiresIn: Math.round(timeUntilExpiry / 1000 / 60) + ' minutos',
      needsRefresh: timeUntilExpiry < this.REFRESH_THRESHOLD_MS
    });

    if (timeUntilExpiry < this.REFRESH_THRESHOLD_MS) {
      console.log('🔄 [AuthGateway] Token expirando em breve, renovando...');
      await this.refreshSession();
    }
  }

  /**
   * Renova a sessão - serializa múltiplas chamadas para evitar race conditions
   */
  async refreshSession(): Promise<Session | null> {
    // Se já há um refresh em andamento, retornar a mesma promise
    if (this.refreshPromise) {
      console.log('⏳ [AuthGateway] Refresh já em andamento, aguardando...');
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshSession();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Executa o refresh da sessão
   */
  private async doRefreshSession(): Promise<Session | null> {
    console.log('🔑 [AuthGateway] Executando refresh de sessão...');

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('❌ [AuthGateway] Erro no refresh:', error);
        
        // Se for erro irrecuperável, notificar perda de sessão
        if (this.isIrrecoverableAuthError(error)) {
          console.error('💀 [AuthGateway] Erro irrecuperável, sessão perdida');
          this.handleSessionLost();
        }
        
        return null;
      }

      if (data.session) {
        console.log('✅ [AuthGateway] Sessão renovada:', {
          expiresAt: new Date(data.session.expires_at! * 1000).toISOString()
        });
        
        this.currentSession = data.session;
        this.currentUser = data.session.user;
        this.onSessionRefreshedCallback?.(data.session);
        
        return data.session;
      }

      return null;
    } catch (error) {
      console.error('❌ [AuthGateway] Erro inesperado no refresh:', error);
      return null;
    }
  }

  /**
   * Verifica se é um erro de auth irrecuperável
   */
  private isIrrecoverableAuthError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || error?.status;
    
    return (
      errorMessage.includes('invalid refresh token') ||
      errorMessage.includes('refresh token not found') ||
      errorMessage.includes('session not found') ||
      errorCode === 'session_not_found' ||
      errorCode === 401
    );
  }

  /**
   * Trata perda de sessão
   */
  private handleSessionLost(): void {
    console.log('🚪 [AuthGateway] Tratando perda de sessão...');
    
    this.clearCache();
    this.stopProactiveRefresh();
    this.currentUser = null;
    this.currentSession = null;
    
    // Fazer signOut para limpar storage
    supabase.auth.signOut().catch(console.error);
    
    this.onSessionLostCallback?.();
  }

  /**
   * Limpa o cache
   */
  private clearCache(): void {
    this.cachedProfile = null;
  }

  /**
   * Verifica e cacheia o status do usuário (is_active)
   */
  async checkAndCacheUserStatus(userId: string): Promise<boolean> {
    // Verificar cache válido
    if (this.cachedProfile && 
        this.cachedProfile.id === userId &&
        Date.now() - this.cachedProfile.cachedAt < this.PROFILE_CACHE_TTL_MS) {
      console.log('📦 [AuthGateway] Usando profile do cache');
      return this.cachedProfile.is_active;
    }

    console.log('🔍 [AuthGateway] Buscando status do usuário...');

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ [AuthGateway] Erro ao buscar profile:', error);
        // Em caso de erro, assumir ativo para não bloquear
        return true;
      }

      const isActive = profile?.is_active ?? true;

      // Cachear resultado
      this.cachedProfile = {
        id: userId,
        is_active: isActive,
        cachedAt: Date.now()
      };

      console.log('✅ [AuthGateway] Status do usuário:', { isActive });
      
      if (!isActive) {
        console.warn('🚫 [AuthGateway] Usuário desativado');
        this.handleSessionLost();
      }

      return isActive;
    } catch (error) {
      console.error('❌ [AuthGateway] Erro ao verificar status:', error);
      return true; // Assumir ativo em caso de erro
    }
  }

  /**
   * Força um refresh de sessão (usado após erros de auth em queries)
   */
  async forceRefresh(): Promise<boolean> {
    const session = await this.refreshSession();
    return session !== null;
  }

  /**
   * Executa uma operação garantindo sessão válida
   */
  async withValidSession<T>(operation: () => Promise<T>): Promise<T> {
    // Verificar se há sessão
    if (!this.currentSession) {
      throw new Error('Sessão não encontrada');
    }

    // Verificar se precisa renovar proativamente
    const expiresAt = this.currentSession.expires_at! * 1000;
    const now = Date.now();
    
    if (expiresAt - now < this.REFRESH_THRESHOLD_MS) {
      await this.refreshSession();
    }

    return operation();
  }

  // Getters
  getUser(): User | null {
    return this.currentUser;
  }

  getSession(): Session | null {
    return this.currentSession;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentSession !== null;
  }

  isUserActive(): boolean {
    return this.cachedProfile?.is_active ?? true;
  }

  // Setters de callbacks
  onSessionLost(callback: SessionLostCallback): void {
    this.onSessionLostCallback = callback;
  }

  onSessionRefreshed(callback: SessionRefreshedCallback): void {
    this.onSessionRefreshedCallback = callback;
  }

  onUserStatusChange(callback: UserStatusCallback): void {
    this.onUserStatusChangeCallback = callback;
  }

  /**
   * Limpa recursos - deve ser chamado no cleanup da aplicação
   */
  cleanup(): void {
    console.log('🧹 [AuthGateway] Limpando recursos...');
    this.stopProactiveRefresh();
    this.clearCache();
  }
}

// Helper para verificar se um erro é de autenticação
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code;
  const status = error?.status;
  
  return (
    message.includes('jwt') ||
    message.includes('expired') ||
    message.includes('unauthorized') ||
    message.includes('invalid token') ||
    message.includes('refresh token') ||
    message.includes('session') ||
    code === 'PGRST301' ||
    code === 'PGRST401' ||
    code === '401' ||
    code === 'session_not_found' ||
    status === 401
  );
}

export default AuthGateway;
