import { useState, useEffect } from "react";
import { HelpCircle, MessageSquare, BookOpen, GraduationCap, Settings, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
const Header = () => {
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });
        setIsAdmin(data || false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });
        setIsAdmin(data || false);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!"
    });
    navigate('/login');
  };
  return <div className="h-16 flex items-center justify-end px-6 border-b border-gray-800">
      <div className="flex items-center gap-4 relative">
        {/* YouTube icon */}
        
        
        {/* Discord icon */}
        
        
        {/* Help icon with dropdown */}
        <div className="relative">
          
          
          {helpMenuOpen && <div className="absolute right-0 mt-2 w-48 bg-[#1e1e1e] border border-gray-800 rounded-md shadow-lg py-1 z-50">
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                <MessageSquare size={16} />
                <span>Feedback</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                <HelpCircle size={16} />
                <span>Help Center</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                <BookOpen size={16} />
                <span>Tutorials</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                <GraduationCap size={16} />
                <span>Wiki</span>
              </a>
            </div>}
        </div>
        
        {/* Upgrade button */}
        <button className="px-4 py-1.5 border border-gray-700 hover:bg-gray-800 transition-colors text-xs font-bold text-lime-600 rounded-lg">20 Créditos</button>
        
        {/* Create button */}
        
        
        {/* User info and Settings menu */}
        {user && <>
            <span className="text-sm text-gray-400">{user.email}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 py-1.5 text-gray-300 text-sm border border-gray-700 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2">
                  <Settings size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
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
          </>}
      </div>
    </div>;
};
export default Header;