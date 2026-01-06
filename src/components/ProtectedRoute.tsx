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

  useEffect(() => {
    fetch('/loading-outline-default.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading animation:', error));
  }, []);

  useEffect(() => {
    // Verificar sessão ao montar o componente (on-demand)
    const checkSession = async () => {
      console.log('🔐 [ProtectedRoute] Verificando sessão...');
      await ensureSession();
      setChecking(false);
    };
    
    checkSession();
  }, [ensureSession]);

  // Enquanto verifica, mostrar loading
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: 100, height: 100 }}
        />
      </div>
    );
  }

  // Se não tem usuário ou usuário não está ativo, redirecionar
  if (!user || !isUserActive) {
    console.log('🚪 [ProtectedRoute] Redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  // Usuário autenticado e ativo - renderizar conteúdo
  return <>{children}</>;
}
