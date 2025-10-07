import { useState } from "react";
import { PromoBar } from "@/components/PromoBar";
import { Sidebar } from "@/components/Sidebar";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Character {
  id: string;
  name: string;
  images: string[];
}

const characters: Character[] = [
  {
    id: "fuba",
    name: "Fubá",
    images: [
      "https://sejaefi.com.br/1.jpg",
      "https://sejaefi.com.br/2.jpg",
      "https://sejaefi.com.br/3.jpg"
    ]
  },
  {
    id: "rubens",
    name: "Rubens",
    images: [
      "https://sejaefi.com.br/4.jpg",
      "https://sejaefi.com.br/5.jpg",
      "https://sejaefi.com.br/6.jpg"
    ]
  },
  {
    id: "rubi",
    name: "Rubí",
    images: [
      "https://sejaefi.com.br/7.jpg",
      "https://sejaefi.com.br/8.jpg",
      "https://sejaefi.com.br/9.jpg"
    ]
  }
];

interface GeneratedImage {
  url: string;
  character: string;
  prompt: string;
}

export default function Efimagem() {
  const [selectedCharacter, setSelectedCharacter] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const { toast } = useToast();

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

      const fullPrompt = `Esse é o personagem que quero criar outra pose, quero o personagem na seguinte pose: ${prompt}`;

      const { data, error } = await supabase.functions.invoke('generate-character-image', {
        body: {
          imageUrls: character.images,
          prompt: fullPrompt
        }
      });

      if (error) throw error;

      if (data?.output) {
        const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
        
        setGeneratedImages(prev => [{
          url: imageUrl,
          character: character.name,
          prompt: prompt
        }, ...prev]);

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
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
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
                          <div className="text-lg font-medium text-white mb-2">
                            {character.name}
                          </div>
                          <div className="flex gap-2 justify-center">
                            {character.images.map((img, idx) => (
                              <div
                                key={idx}
                                className="w-16 h-16 rounded overflow-hidden bg-muted"
                              >
                                <img
                                  src={img}
                                  alt={`${character.name} ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

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

                {generatedImages.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-4">
                      Imagens Geradas
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {generatedImages.map((img, idx) => (
                        <Card key={idx} className="overflow-hidden">
                          <div className="aspect-square bg-muted">
                            <img
                              src={img.url}
                              alt={`Gerado - ${img.character}`}
                              className="w-full h-full object-cover"
                            />
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
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
