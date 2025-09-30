import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for auth errors in URL and existing session
  useEffect(() => {
    // Check for errors in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    if (error) {
      let message = errorDescription || 'Erro ao fazer login';
      
      if (error === 'otp_expired' || errorDescription?.includes('expired')) {
        message = 'O link expirou. Por favor, solicite um novo link.';
      } else if (error === 'access_denied') {
        message = 'Acesso negado. Solicite um novo link de acesso.';
      }

      toast({
        title: "Erro de autenticação",
        description: message,
        variant: "destructive",
      });

      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify if email exists in Jira
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'verify-jira-user',
        { body: { email } }
      );

      if (verifyError || !verifyData?.success) {
        toast({
          title: "Acesso negado",
          description: "Este email não está autorizado no Jira",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Send magic link
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: verifyData.userData.full_name,
            avatar_url: verifyData.userData.avatar_url,
          },
        },
      });

      if (signInError) throw signInError;

      setLinkSent(true);
      toast({
        title: "Link mágico enviado!",
        description: "Verifique seu email para acessar a aplicação",
      });
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Erro ao enviar link",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
        <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Link enviado!</h1>
          <p className="text-muted-foreground mb-6">
            Enviamos um link mágico para <strong>{email}</strong>. 
            Clique no link para acessar a aplicação.
          </p>
          <Button variant="outline" onClick={() => setLinkSent(false)}>
            Enviar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-center">Bem-vindo</h1>
        <p className="text-muted-foreground mb-6 text-center">
          Digite seu email do Jira para receber um link de acesso
        </p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="seu.email@sejaefi.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verificando..." : "Enviar link mágico"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Apenas usuários cadastrados no Jira podem acessar
        </p>
      </div>
    </div>
  );
}
