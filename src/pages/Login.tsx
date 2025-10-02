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
  const {
    toast
  } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate('/');
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
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
      if (isSignUp) {
        // Sign up new user
        const {
          data: signUpData,
          error: signUpError
        } = await supabase.auth.signUp({
          email,
          password
        });
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            toast({
              title: "Usuário já cadastrado",
              description: "Use o formulário de login para acessar",
              variant: "destructive"
            });
            setIsSignUp(false);
          } else {
            throw signUpError;
          }
        } else if (signUpData.user) {
          // Auto login after successful signup
          const {
            error: signInError
          } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (signInError) {
            toast({
              title: "Cadastro realizado!",
              description: "Faça login para acessar"
            });
            setIsSignUp(false);
          } else {
            toast({
              title: "Cadastro realizado!",
              description: "Redirecionando..."
            });
          }
        }
      } else {
        // Sign in existing user
        const {
          error: signInError
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            toast({
              title: "Credenciais inválidas",
              description: "Email ou senha incorretos. Se é seu primeiro acesso, faça o cadastro.",
              variant: "destructive"
            });
          } else {
            throw signInError;
          }
        } else {
          toast({
            title: "Login realizado!",
            description: "Bem-vindo de volta"
          });
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-center py-[24px]">
          {isSignUp ? "Criar Conta" : "Bem-vindo"}
        </h1>
        
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input type="email" placeholder="seu.email@sejaefi.com.br" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="w-full" />
          </div>

          <div>
            <Input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="w-full" minLength={6} />
          </div>
          
          <Button type="submit" disabled={loading} className="w-full text-cyan-50 bg-sky-700 hover:bg-sky-600">
            {loading ? "Processando..." : isSignUp ? "Criar conta" : "Entrar"}
          </Button>

          <div className="text-center">
            <Button type="button" variant="link" onClick={() => setIsSignUp(!isSignUp)} disabled={loading} className="text-sm text-cyan-600">
              {isSignUp ? "Já tem conta? Faça login" : "Primeiro acesso? Crie sua conta"}
            </Button>
          </div>
        </form>

      </div>
    </div>;
}