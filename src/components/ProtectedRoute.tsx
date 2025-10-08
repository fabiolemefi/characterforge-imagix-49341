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
        console.log('[ProtectedRoute] Iniciando verificação de autenticação...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[ProtectedRoute] Sessão:', session ? 'Encontrada' : 'Não encontrada');
        
        if (!mounted) return;

        if (!session) {
          console.log('[ProtectedRoute] Sem sessão, redirecionando para login...');
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        console.log('[ProtectedRoute] Verificando status do usuário...');
        await checkUserStatus(session.user.id, mounted);
      } catch (error) {
        console.error("[ProtectedRoute] Error initializing auth:", error);
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
      console.log('[ProtectedRoute] Buscando perfil do usuário...');
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", userId)
        .maybeSingle();

      console.log('[ProtectedRoute] Perfil:', profile);
      console.log('[ProtectedRoute] Erro:', error);

      if (!mounted) return;

      // If there's an error fetching profile, logout and redirect
      if (error) {
        console.error("[ProtectedRoute] Error fetching profile:", error);
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
        console.log('[ProtectedRoute] Sem perfil, permitindo acesso...');
        setAuthenticated(true);
        setLoading(false);
        return;
      }

      if (!profile.is_active) {
        console.log('[ProtectedRoute] Usuário inativo');
        await supabase.auth.signOut();
        toast({
          title: "Acesso bloqueado",
          description: "Seu acesso foi desativado por um administrador",
          variant: "destructive",
        });
        setAuthenticated(false);
        setLoading(false);
      } else {
        console.log('[ProtectedRoute] Usuário autenticado e ativo');
        setAuthenticated(true);
        setLoading(false);
      }
    } catch (error) {
      console.error("[ProtectedRoute] Unexpected error:", error);
      if (mounted) {
        await supabase.auth.signOut();
        setAuthenticated(false);
        setLoading(false);
      }
    }
  };

  if (loading) {
    console.log('[ProtectedRoute] Estado: Loading');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authenticated) {
    console.log('[ProtectedRoute] Estado: Não autenticado, redirecionando para /login');
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] Estado: Autenticado, renderizando children');
  return <>{children}</>;
}
