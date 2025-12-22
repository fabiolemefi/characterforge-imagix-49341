import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function PluginDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlugin = async () => {
      if (!id) {
        console.log('[PluginDetails] No ID provided');
        navigate('/');
        return;
      }

      console.log('[PluginDetails] Loading plugin with ID:', id);

      try {
        const { data, error } = await supabase
          .from("plugins")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error('[PluginDetails] Error loading plugin:', error);
          toast({
            title: "Erro ao carregar plugin",
            description: error.message,
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        console.log('[PluginDetails] Plugin loaded:', data?.name);

        // Mapa de redirecionamentos
        const redirectMap: Record<string, string> = {
          "Efimail": "/efimail",
          "Efimagem": "/efimagem",
          "Email Builder": "/email-templates",
          "Efi Slides": "/efi-slides",
          "Email mágico": "/email-magico",
        };

        const redirectPath = redirectMap[data.name];
        if (redirectPath) {
          console.log('[PluginDetails] Redirecting to:', redirectPath);
          navigate(redirectPath, { replace: true });
          return;
        }

        setPlugin(data);
        setLoading(false);
      } catch (err) {
        console.error('[PluginDetails] Unexpected error:', err);
        navigate('/');
      }
    };

    loadPlugin();
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!plugin) {
    return null;
  }

  return (
    <div className="py-8 px-12">
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
      </div>
  );
}
