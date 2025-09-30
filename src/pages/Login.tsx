import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
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

      if (isSignUp) {
        // Sign up new user
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: verifyData.userData.full_name,
              avatar_url: verifyData.userData.avatar_url,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            toast({
              title: "Usuário já cadastrado",
              description: "Use o formulário de login para acessar",
              variant: "destructive",
            });
            setIsSignUp(false);
          } else {
            throw signUpError;
          }
        } else {
          toast({
            title: "Cadastro realizado!",
            description: "Você já pode fazer login",
          });
          setIsSignUp(false);
          setPassword("");
        }
      } else {
        // Sign in existing user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            toast({
              title: "Credenciais inválidas",
              description: "Email ou senha incorretos. Se é seu primeiro acesso, faça o cadastro.",
              variant: "destructive",
            });
          } else {
            throw signInError;
          }
        } else {
          toast({
            title: "Login realizado!",
            description: "Bem-vindo de volta",
          });
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-center">
          {isSignUp ? "Criar Conta" : "Bem-vindo"}
        </h1>
        <p className="text-muted-foreground mb-6 text-center">
          {isSignUp 
            ? "Crie sua conta com seu email do Jira" 
            : "Faça login para acessar a aplicação"}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full"
              minLength={6}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processando..." : isSignUp ? "Criar conta" : "Entrar"}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
              className="text-sm"
            >
              {isSignUp 
                ? "Já tem conta? Faça login" 
                : "Primeiro acesso? Crie sua conta"}
            </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Apenas usuários cadastrados no Jira podem acessar
        </p>
      </div>
    </div>
  );
}
