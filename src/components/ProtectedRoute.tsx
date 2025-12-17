import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Lottie from "lottie-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [animationData, setAnimationData] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch Lottie animation data
    fetch('/loading-outline-default.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading animation:', error));
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkUserStatus = async () => {
      console.log("🔐 [ProtectedRoute] Verificando status do usuário...", {
        hasUser: !!user,
        userId: user?.id,
        authLoading,
        timestamp: new Date().toISOString()
      });
      
      if (!user) {
        console.log("⚠️ [ProtectedRoute] Sem usuário autenticado");
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error("❌ [ProtectedRoute] Erro ao buscar profile:", {
            error,
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString()
          });
          await supabase.auth.signOut();
          toast({
            title: "Erro de autenticação",
            description: "Faça login novamente",
            variant: "destructive",
          });
          setIsActive(false);
          setLoading(false);
          return;
        }

        if (!profile) {
          console.log("⚠️ [ProtectedRoute] Profile não encontrado, permitindo acesso");
          setIsActive(true);
          setLoading(false);
          return;
        }

        if (!profile.is_active) {
          console.warn("🚫 [ProtectedRoute] Usuário desativado:", { userId: user.id });
          await supabase.auth.signOut();
          toast({
            title: "Acesso bloqueado",
            description: "Seu acesso foi desativado por um administrador",
            variant: "destructive",
          });
          setIsActive(false);
          setLoading(false);
        } else {
          console.log("✅ [ProtectedRoute] Usuário autenticado e ativo:", {
            userId: user.id,
            timestamp: new Date().toISOString()
          });
          setIsActive(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ [ProtectedRoute] Erro inesperado:", {
          error,
          timestamp: new Date().toISOString()
        });
        if (mounted) {
          await supabase.auth.signOut();
          setIsActive(false);
          setLoading(false);
        }
      }
    };

    if (!authLoading) {
      checkUserStatus();
    }

    return () => {
      mounted = false;
    };
  }, [user, authLoading, toast]);

  if (authLoading || loading) {
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

  if (!user || isActive === false) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
