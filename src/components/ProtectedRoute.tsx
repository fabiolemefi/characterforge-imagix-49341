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
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await checkUserStatus(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setAuthenticated(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkUserStatus = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", userId)
        .single();

      // If there's an error fetching profile, allow access by default
      if (error) {
        console.error("Error fetching profile:", error);
        setAuthenticated(true);
        setLoading(false);
        return;
      }

      if (!profile?.is_active) {
        await supabase.auth.signOut();
        toast({
          title: "Acesso bloqueado",
          description: "Seu acesso foi desativado por um administrador",
          variant: "destructive",
        });
        setAuthenticated(false);
      } else {
        setAuthenticated(true);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }

    await checkUserStatus(session.user.id);
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
