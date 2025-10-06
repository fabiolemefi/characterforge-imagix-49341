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

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (!session) {
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        await checkUserStatus(session.user.id, mounted);
      } catch (error) {
        console.error("Error initializing auth:", error);
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

        if (event === 'SIGNED_IN' && session) {
          setTimeout(() => {
            if (mounted) {
              checkUserStatus(session.user.id, mounted);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setAuthenticated(false);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUserStatus = async (userId: string, mounted: boolean) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;

      // If there's an error fetching profile, logout and redirect
      if (error) {
        console.error("Error fetching profile:", error);
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

      // If no profile exists, allow access (first time user)
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
      console.error("Unexpected error:", error);
      if (mounted) {
        await supabase.auth.signOut();
        setAuthenticated(false);
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
