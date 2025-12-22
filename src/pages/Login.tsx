import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Call jira-login edge function
      const { data, error } = await supabase.functions.invoke('jira-login', {
        body: { email: email.trim().toLowerCase() }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível verificar seu acesso. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      if (!data.success) {
        toast({
          title: "Acesso negado",
          description: data.error || "Email não encontrado no Jira da empresa",
          variant: "destructive"
        });
        return;
      }

      // 2. Login with derived password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: data.derivedPassword
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        toast({
          title: "Erro no login",
          description: "Não foi possível autenticar. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: `Bem-vindo, ${data.userData.full_name}!`,
        description: "Redirecionando..."
      });

    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar seu acesso. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center" 
      style={{ 
        backgroundImage: 'url(/hero-laptop.webp)', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}
    >
      <div className="max-w-sm w-full p-8 bg-card rounded-lg shadow-lg">
        <div className="flex justify-center mb-4">
          <img 
            src="/efi-bank-monochrome-orange.svg" 
            alt="EFI Bank Logo" 
            className="h-12 w-auto" 
          />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-center">
          Acesso Interno
        </h1>
        
        <p className="text-sm text-muted-foreground text-center mb-6">
          Apenas colaboradores com conta no Jira
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input 
              type="email" 
              placeholder="seu.email@sejaefi.com.br" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              disabled={loading} 
              className="w-full" 
            />
          </div>
          
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Verificando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Seu acesso é validado automaticamente pelo Jira
        </p>
      </div>
    </div>
  );
}
