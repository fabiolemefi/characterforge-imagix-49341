import { useEffect, useState } from "react";
import { PromoBar } from "../components/PromoBar";
import { Sidebar } from "../components/Sidebar";
import Header from "../components/Header";
import { CreationCard } from "../components/CreationCard";
import { QuickStartItem } from "../components/QuickStartItem";
import { FeaturedAppCard } from "../components/FeaturedAppCard";
import { ModelCard } from "../components/ModelCard";
import { Video, Paintbrush, Grid, FileText, ArrowUpRight, ArrowRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
interface Plugin {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_new: boolean;
  in_development: boolean;
}
const Index = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string>("Usuário");
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadPlugins();
    loadUserName();
  }, []);

  const loadUserName = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      const email = session.user.email;
      const namePart = email.split('@')[0];
      const firstName = namePart.split('.')[0];
      const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
      setFirstName(capitalizedName);
    }
  };
  const loadPlugins = async () => {
    const {
      data,
      error
    } = await supabase.from("plugins").select("*").order("is_active", {
      ascending: false
    }).order("created_at", {
      ascending: false
    });
    if (error) {
      toast({
        title: "Erro ao carregar plugins",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setPlugins(data || []);
    }
    setLoading(false);
  };
  return <div className="min-h-screen flex flex-col">
      <PromoBar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto">
            <main className="py-8 px-12">
              
              
              
              
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6">Olá, {firstName}.</h2>
                
              </section>
              
              <section className="mb-12">
                
                {loading ? <p className="text-gray-400">Carregando plugins...</p> : plugins.length === 0 ? <p className="text-gray-400">Nenhum plugin disponível no momento.</p> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plugins.map(plugin => <FeaturedAppCard key={plugin.id} id={plugin.id} title={plugin.name} subtitle={plugin.description || ""} imageSrc={plugin.image_url || "/placeholder.svg"} isNew={plugin.is_new} inDevelopment={plugin.in_development} />)}
                  </div>}
              </section>
              
              
            </main>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;