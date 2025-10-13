import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const checkUserStatus = async (userId: string) => {
      if (!mounted) return;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", userId)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          await supabase.auth.signOut();
          toast({
            title: "Erro de autenticação",
            description: "Faça login novamente",
            variant: "destructive",
          });
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        if (!profile) {
          setAuthenticated(true);
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
          setAuthenticated(false);
          setLoading(false);
        } else {
          setAuthenticated(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("[ProtectedRoute] Error:", error);
        if (mounted) {
          await supabase.auth.signOut();
          setAuthenticated(false);
          setLoading(false);
        }
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (!session) {
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        await checkUserStatus(session.user.id);
      } catch (error) {
        console.error("[ProtectedRoute] Init error:", error);
        if (mounted) {
          setAuthenticated(false);
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setAuthenticated(false);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
