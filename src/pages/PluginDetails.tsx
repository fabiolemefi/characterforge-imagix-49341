import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PromoBar } from "@/components/PromoBar";
import { Sidebar } from "@/components/Sidebar";
import Header from "@/components/Header";

interface Plugin {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_new: boolean;
  in_development: boolean;
}

export default function PluginDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlugin();
  }, [id]);

  const loadPlugin = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("plugins")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        title: "Erro ao carregar plugin",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Redirecionar para página específica do Efimail
    if (data.name === "Efimail") {
      navigate("/efimail");
      return;
    }

    // Redirecionar para página específica do Email Builder
    if (data.name === "Email Builder") {
      navigate("/email-templates");
      return;
    }

    setPlugin(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PromoBar />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center">
              <p className="text-white">Carregando...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!plugin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PromoBar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto">
            <main className="py-8 px-12">
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-end mb-6">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Voltar
                  </Button>
                </div>

                {plugin.image_url && (
                  <div className="mb-6">
                    <img
                      src={plugin.image_url}
                      alt={plugin.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

                <h1 className="text-4xl font-bold text-white mb-4">
                  {plugin.name}
                </h1>

                {plugin.description && (
                  <p className="text-gray-400 text-lg leading-relaxed">
                    {plugin.description}
                  </p>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
