import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthGateway } from "@/hooks/useAuthGateway";
import Lottie from "lottie-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Componente simplificado que usa o AuthGateway
 * 
 * Responsabilidades:
 * - Verificar se o gateway está pronto
 * - Verificar se há usuário autenticado
 * - Verificar se usuário está ativo
 * - Redirecionar para login se necessário
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isReady, isUserActive } = useAuthGateway();
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch('/loading-outline-default.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading animation:', error));
  }, []);

  // Enquanto não está pronto, mostrar loading
  if (!isReady) {
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
    console.log('🚪 [ProtectedRoute] Redirecionando para login:', { 
      hasUser: !!user, 
      isUserActive 
    });
    return <Navigate to="/login" replace />;
  }

  // Usuário autenticado e ativo - renderizar conteúdo
  return <>{children}</>;
}
