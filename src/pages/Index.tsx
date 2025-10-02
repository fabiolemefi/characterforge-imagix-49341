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
  const { toast } = useToast();

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    const { data, error } = await supabase
      .from("plugins")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar plugins",
        description: error.message,
        variant: "destructive",
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
              
              
              <div className="grid grid-cols-2 gap-6 mb-12">
                <CreationCard type="image" />
                <CreationCard type="storytelling" />
              </div>
              
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Quick starts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-[#1A1A1A] rounded-lg p-4 flex items-start">
                    <div className="p-3 rounded-lg bg-[#3A3600] mr-4 flex items-center justify-center">
                      <Video size={24} className="text-[#FFD426]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">Image to Video</h3>
                        <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                          New
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">Bring your image to life</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-4 flex items-start">
                    <div className="p-3 rounded-lg bg-[#00361F] mr-4 flex items-center justify-center">
                      <Paintbrush size={24} className="text-[#00A67E]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Choose a Style</h3>
                      <p className="text-sm text-gray-400 mt-1">Start with a style you like</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-4 flex items-start">
                    <div className="p-3 rounded-lg bg-[#360036] mr-4 flex items-center justify-center">
                      <Grid size={24} className="text-[#FF3EA5]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Explore Models</h3>
                      <p className="text-sm text-gray-400 mt-1">See 100+ Fine-tuned models</p>
                    </div>
                  </div>
                  
                  
                  
                  
                  
                  
                </div>
              </section>
              
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">Plugins</h2>
                {loading ? (
                  <p className="text-gray-400">Carregando plugins...</p>
                ) : plugins.length === 0 ? (
                  <p className="text-gray-400">Nenhum plugin disponível no momento.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plugins.map((plugin) => (
                      <FeaturedAppCard
                        key={plugin.id}
                        id={plugin.id}
                        title={plugin.name}
                        subtitle="By OpenArt"
                        imageSrc={plugin.image_url || "/placeholder.svg"}
                        isNew={plugin.is_new}
                        inDevelopment={plugin.in_development}
                      />
                    ))}
                  </div>
                )}
              </section>
              
              
            </main>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;