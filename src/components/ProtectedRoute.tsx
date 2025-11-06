import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorFallback } from "./ErrorFallback";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading, healthError } = useAuth();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const checkUserStatus = async () => {
      if (!user) {
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
          setIsActive(true);
          setLoading(false);
          return;
        }

        if (!profile.is_active) {
          await supabase.auth.signOut();
          toast({
            title: "Acesso bloqueado",
            description: "Seu acesso foi desativado por um administrador",
            variant: "destructive",
          });
          setIsActive(false);
          setLoading(false);
        } else {
          setIsActive(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("[ProtectedRoute] Error:", error);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (healthError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full">
          <ErrorFallback
            title="Erro de Conexão"
            message={healthError}
            onRetry={() => window.location.reload()}
            onLogout={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
          />
        </div>
      </div>
    );
  }

  if (!user || isActive === false) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
