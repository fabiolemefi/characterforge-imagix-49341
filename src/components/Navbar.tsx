import { useState, useEffect } from "react";
import { HelpCircle, MessageSquare, BookOpen, GraduationCap, LogOut, Shield, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [firstName, setFirstName] = useState<string>("Usuário");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { open } = useSidebar();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch user profile for avatar
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setAvatarUrl(profile.avatar_url || "");
        }

        // Compute firstName from email
        if (session.user.email) {
          const email = session.user.email;
          const namePart = email.split('@')[0];
          const firstName = namePart.split('.')[0];
          const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
          setFirstName(capitalizedName);
        }

        const { data } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        });
        setIsAdmin(data || false);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch user profile for avatar
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setAvatarUrl(profile.avatar_url || "");
        }

        // Compute firstName from email
        if (session.user.email) {
          const email = session.user.email;
          const namePart = email.split('@')[0];
          const firstName = namePart.split('.')[0];
          const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
          setFirstName(capitalizedName);
        }

        const { data } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        });
        setIsAdmin(data || false);
      } else {
        setIsAdmin(false);
        setFirstName("Usuário");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/login");
  };

  return (
    <div className="h-16 flex items-center justify-between px-6 border-b bg-[hsl(var(--header-background))]">
      <div className="flex items-center gap-2">
        {open && (
          <div className="flex items-center gap-2">
            <img src="/efi-bank-monochrome-orange.svg" alt="Logo" className="h-8" style={{ marginTop: '-11px' }} />
            <span className="font-semibold text-foreground">Martech</span>
          </div>
        )}
        {!open && <img src="/lovable-uploads/407e5ec8-9b67-42ee-acf0-b238e194aa64.png" alt="Logo" className="w-6 h-6" />}
      </div>
      <div className="flex items-center gap-4 relative">
        {/* Help icon with dropdown */}
        <div className="relative">
          {helpMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card border rounded-md shadow-lg py-1 z-50">
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent">
                <MessageSquare size={16} />
                <span>Feedback</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent">
                <HelpCircle size={16} />
                <span>Help Center</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent">
                <BookOpen size={16} />
                <span>Tutorials</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent">
                <GraduationCap size={16} />
                <span>Wiki</span>
              </a>
            </div>
          )}
        </div>

        {/* User info and Settings menu */}
        {user && (
          <>
            <span className="text-sm text-muted-foreground">Olá, {firstName}.</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                  <AvatarImage src={avatarUrl} alt={firstName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {firstName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="cursor-pointer"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun size={16} className="mr-2" />
                      Modo claro
                    </>
                  ) : (
                    <>
                      <Moon size={16} className="mr-2" />
                      Modo escuro
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                      <Shield size={16} className="mr-2" />
                      Acessar Admin
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut size={16} className="mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;
