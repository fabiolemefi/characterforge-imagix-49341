import { useState, useEffect } from "react";
import { PromoBar } from "@/components/PromoBar";
import { Sidebar } from "@/components/Sidebar";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { Skeleton } from "@/components/ui/skeleton";

interface CharacterImage {
  id: string;
  image_url: string;
  position: number;
  is_cover: boolean;
}

interface Character {
  id: string;
  name: string;
  images: CharacterImage[];
  coverImage?: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  character: string;
  prompt: string;
}

export default function Efimagem() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [generalPrompt, setGeneralPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCharacters();
    loadGeneratedImages();
    loadGeneralPrompt();
  }, []);

  const loadGeneralPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from("plugins")
        .select("general_prompt")
        .eq("name", "Efimagem")
        .single();

      if (error) throw error;
      if (data) setGeneralPrompt(data.general_prompt || "");
    } catch (error: any) {
      console.error("Erro ao carregar prompt geral:", error);
    }
  };



  const loadGeneratedImages = async () => {
    try {
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setGeneratedImages(
          data.map((img) => ({
            id: img.id,
            url: img.image_url,
            character: img.character_name,
            prompt: img.prompt,
          }))
        );
      }
    } catch (error: any) {
      console.error("Erro ao carregar imagens geradas:", error);
    }
  };

  const loadCharacters = async () => {
    setLoadingCharacters(true);
    try {
      // Get Efimagem plugin ID
      const { data: pluginData, error: pluginError } = await supabase
        .from("plugins")
        .select("id")
        .eq("name", "Efimagem")
        .single();

      if (pluginError) throw pluginError;

      // Get characters for this plugin
      const { data: charactersData, error: charsError } = await supabase
        .from("plugin_characters")
        .select("id, name")
        .eq("plugin_id", pluginData.id);

      if (charsError) throw charsError;

      if (charactersData && charactersData.length > 0) {
        const characterIds = charactersData.map((c) => c.id);
        const { data: imagesData, error: imgsError } = await supabase
          .from("character_images")
          .select("id, character_id, image_url, position, is_cover")
          .in("character_id", characterIds)
          .order("position", { ascending: true });

        if (imgsError) throw imgsError;

        const charactersWithImages = charactersData.map((char) => ({
          ...char,
          images: imagesData?.filter((img) => img.character_id === char.id) || [],
          coverImage: imagesData?.find((img) => img.character_id === char.id && img.is_cover)?.image_url ||
                      imagesData?.find((img) => img.character_id === char.id)?.image_url
        }));

        setCharacters(charactersWithImages);
      }
    } catch (error: any) {
      console.error("Erro ao carregar personagens:", error);
      toast({
        title: "Erro ao carregar personagens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingCharacters(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCharacter) {
      toast({
        title: "Selecione um personagem",
        description: "Você precisa selecionar um personagem antes de gerar a imagem.",
        variant: "destructive",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Digite um prompt",
        description: "Você precisa digitar uma descrição da pose desejada.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const character = characters.find(c => c.id === selectedCharacter);
      if (!character) return;

      const fullPrompt = `${generalPrompt ? generalPrompt + ' ' : ''}Esse é o personagem que quero criar outra pose, quero o personagem na seguinte pose: ${prompt}`;

      const imageUrls = character.images.map(img => img.image_url);

      const { data, error } = await supabase.functions.invoke('generate-character-image', {
        body: {
          imageUrls: imageUrls,
          prompt: fullPrompt,
          generalPrompt: generalPrompt
        }
      });

      if (error) throw error;

      if (data?.output) {
        const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
        
        // Save to database
        const { data: savedImage, error: saveError } = await supabase
          .from("generated_images")
          .insert({
            character_id: character.id,
            character_name: character.name,
            prompt: prompt,
            image_url: imageUrl,
          })
          .select()
          .single();

        if (saveError) throw saveError;

        if (savedImage) {
          setGeneratedImages(prev => [{
            id: savedImage.id,
            url: savedImage.image_url,
            character: savedImage.character_name,
            prompt: savedImage.prompt
          }, ...prev]);
        }

        toast({
          title: "Imagem gerada!",
          description: "Sua imagem foi gerada com sucesso.",
        });

        setPrompt("");
      }
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      toast({
        title: "Erro ao gerar imagem",
        description: error.message || "Ocorreu um erro ao gerar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta imagem?")) return;

    try {
      const { error } = await supabase
        .from("generated_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;

      setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
      
      toast({
        title: "Imagem excluída",
        description: "A imagem foi excluída com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao excluir imagem:", error);
      toast({
        title: "Erro ao excluir imagem",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PromoBar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto">
            <main className="py-8 px-12">
              <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8">Efimagem</h1>



                <Card className="p-6 mb-8">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Selecione um personagem
                  </h2>

                  {loadingCharacters ? (
                    <p className="text-center text-muted-foreground mb-6">Carregando personagens...</p>
                  ) : characters.length === 0 ? (
                    <p className="text-center text-muted-foreground mb-6">
                      Nenhum personagem cadastrado ainda. Entre em contato com o administrador.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {characters.map((character) => (
                      <label
                        key={character.id}
                        className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                          selectedCharacter === character.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="character"
                          value={character.id}
                          checked={selectedCharacter === character.id}
                          onChange={(e) => setSelectedCharacter(e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          {character.coverImage && (
                            <div className="w-full aspect-square rounded overflow-hidden bg-muted mb-2">
                              <img
                                src={character.coverImage}
                                alt={character.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="text-lg font-medium text-white">
                            {character.name}
                          </div>
                        </div>
                      </label>
                      ))}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Descreva a pose desejada
                      </label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: sentado em uma cadeira de escritório, olhando para o computador"
                        rows={4}
                        disabled={loading}
                      />
                    </div>

                    <Button
                      onClick={handleGenerate}
                      disabled={loading || !selectedCharacter || !prompt.trim()}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando imagem...
                        </>
                      ) : (
                        "Gerar Imagem"
                      )}
                    </Button>
                  </div>
                </Card>

                {(generatedImages.length > 0 || loading) && (
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-4">
                      Imagens Geradas
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {loading && (
                        <Card className="overflow-hidden animate-pulse opacity-80">
                          <div className="aspect-square bg-muted flex items-center justify-center">
                            <Skeleton className="w-full h-full" />
                          </div>
                          <div className="p-4">
                            <Skeleton className="h-4 w-16 mb-2" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </Card>
                      )}
                      {generatedImages.map((img) => (
                        <Card key={img.id} className="overflow-hidden">
                          <div className="relative group">
                            <div 
                              className="aspect-square bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedImage(img.url)}
                            >
                              <img
                                src={img.url}
                                alt={`Gerado - ${img.character}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(img.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="p-4">
                            <Badge className="mb-2">{img.character}</Badge>
                            <p className="text-sm text-muted-foreground">
                              {img.prompt}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <ImageViewerModal
                  open={!!selectedImage}
                  onOpenChange={(open) => !open && setSelectedImage(null)}
                  imageUrl={selectedImage || ""}
                />
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
