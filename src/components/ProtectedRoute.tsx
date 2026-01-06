import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Lottie from "lottie-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Verifica sessão on-demand ao montar
 * 
 * Cada vez que o usuário navega para uma rota protegida,
 * a sessão é verificada naquele momento.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isUserActive, ensureSession } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [animationData, setAnimationData] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    fetch('/loading-outline-default.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading animation:', error));
  }, []);

  // Feedback visual progressivo quando demora
  useEffect(() => {
    if (!checking) return;
    
    const timer1 = setTimeout(() => {
      setLoadingMessage('Reconectando sessão...');
    }, 2000);
    
    const timer2 = setTimeout(() => {
      setLoadingMessage('Isso está demorando mais que o esperado...');
    }, 5000);
    
    const timer3 = setTimeout(() => {
      setLoadingMessage('Tentando recuperar conexão...');
    }, 8000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [checking]);

  // Log quando componente monta/desmonta
  useEffect(() => {
    console.log('🛡️ [ProtectedRoute] === COMPONENT MOUNTED ===');
    console.log('🛡️ [ProtectedRoute] Path:', window.location.pathname);
    console.log('🛡️ [ProtectedRoute] Timestamp:', new Date().toISOString());
    return () => {
      console.log('🛡️ [ProtectedRoute] === COMPONENT UNMOUNTED ===');
      console.log('🛡️ [ProtectedRoute] Path:', window.location.pathname);
    };
  }, []);

  useEffect(() => {
    // Verificar sessão ao montar o componente (on-demand)
    const checkSession = async () => {
      console.log('🛡️ [ProtectedRoute] === CHECK SESSION START ===');
      console.log('🛡️ [ProtectedRoute] Estado atual antes de ensureSession:', {
        hasUser: !!user,
        isUserActive,
        checking
      });
      
      await ensureSession();
      
      console.log('🛡️ [ProtectedRoute] === CHECK SESSION END ===');
      console.log('🛡️ [ProtectedRoute] Definindo checking=false');
      setChecking(false);
    };
    
    checkSession();
  }, [ensureSession]);

  // Log de mudanças de estado
  useEffect(() => {
    console.log('🛡️ [ProtectedRoute] Estado atualizado:', {
      checking,
      hasUser: !!user,
      isUserActive,
      userId: user?.id
    });
  }, [checking, user, isUserActive]);

  // Enquanto verifica, mostrar loading
  if (checking) {
    console.log('🛡️ [ProtectedRoute] Renderizando loading (checking=true)');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: 100, height: 100 }}
        />
        {loadingMessage && (
          <p className="text-muted-foreground text-sm animate-pulse">
            {loadingMessage}
          </p>
        )}
      </div>
    );
  }

  // Se não tem usuário ou usuário não está ativo, redirecionar
  if (!user || !isUserActive) {
    console.log('🚪 [ProtectedRoute] Redirecionando para login:', {
      hasUser: !!user,
      isUserActive,
      reason: !user ? 'Sem usuário' : 'Usuário inativo'
    });
    return <Navigate to="/login" replace />;
  }

  // Usuário autenticado e ativo - renderizar conteúdo
  console.log('✅ [ProtectedRoute] Renderizando conteúdo protegido');
  return <>{children}</>;
}
