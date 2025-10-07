import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface Character {
  id: string;
  name: string;
  images: { id: string; image_url: string; position: number }[];
}

interface CharactersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pluginId: string;
}

export function CharactersModal({ open, onOpenChange, pluginId }: CharactersModalProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCharacters();
    }
  }, [open, pluginId]);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const { data: charactersData, error: charsError } = await supabase
        .from("plugin_characters")
        .select("id, name")
        .eq("plugin_id", pluginId);

      if (charsError) throw charsError;

      if (charactersData && charactersData.length > 0) {
        const characterIds = charactersData.map((c) => c.id);
        const { data: imagesData, error: imgsError } = await supabase
          .from("character_images")
          .select("id, character_id, image_url, position")
          .in("character_id", characterIds)
          .order("position", { ascending: true });

        if (imgsError) throw imgsError;

        const charactersWithImages = charactersData.map((char) => ({
          ...char,
          images: imagesData?.filter((img) => img.character_id === char.id) || [],
        }));

        setCharacters(charactersWithImages);
      } else {
        setCharacters([]);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar personagens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('plugin-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('plugin-images')
        .getPublicUrl(fileName);

      urls.push(data.publicUrl);
    }

    return urls;
  };

  const handleAddCharacter = async () => {
    if (!newCharacterName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o personagem",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "Imagens obrigatórias",
        description: "Selecione ao menos uma imagem",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length > 10) {
      toast({
        title: "Limite de imagens",
        description: "Você pode enviar no máximo 10 imagens",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Create character
      const { data: characterData, error: charError } = await supabase
        .from("plugin_characters")
        .insert({
          plugin_id: pluginId,
          name: newCharacterName.trim(),
        })
        .select()
        .single();

      if (charError) throw charError;

      // Upload images
      const imageUrls = await uploadImages(selectedFiles);

      // Save image URLs
      const imageRecords = imageUrls.map((url, index) => ({
        character_id: characterData.id,
        image_url: url,
        position: index,
      }));

      const { error: imagesError } = await supabase
        .from("character_images")
        .insert(imageRecords);

      if (imagesError) throw imagesError;

      toast({
        title: "Personagem criado",
        description: "O personagem foi criado com sucesso",
      });

      setNewCharacterName("");
      setSelectedFiles([]);
      loadCharacters();
    } catch (error: any) {
      toast({
        title: "Erro ao criar personagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm("Tem certeza que deseja excluir este personagem?")) return;

    try {
      const { error } = await supabase
        .from("plugin_characters")
        .delete()
        .eq("id", characterId);

      if (error) throw error;

      toast({
        title: "Personagem excluído",
        description: "O personagem foi excluído com sucesso",
      });

      loadCharacters();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir personagem",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 10) {
      toast({
        title: "Limite de imagens",
        description: "Você pode selecionar no máximo 10 imagens",
        variant: "destructive",
      });
      return;
    }
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Personagens</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new character form */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Adicionar Novo Personagem</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="character-name">Nome do Personagem</Label>
                <Input
                  id="character-name"
                  value={newCharacterName}
                  onChange={(e) => setNewCharacterName(e.target.value)}
                  placeholder="Ex: Fubá, Rubens, Rubí..."
                  disabled={uploading}
                />
              </div>

              <div>
                <Label htmlFor="character-images">
                  Imagens (até 10 imagens)
                </Label>
                <Input
                  id="character-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                          disabled={uploading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleAddCharacter}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? "Criando..." : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Personagem
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Existing characters list */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Personagens Cadastrados</h3>
            {loading ? (
              <p className="text-center text-muted-foreground">Carregando...</p>
            ) : characters.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Nenhum personagem cadastrado ainda
              </p>
            ) : (
              <div className="space-y-4">
                {characters.map((character) => (
                  <Card key={character.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg mb-2">
                          {character.name}
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          {character.images.map((img) => (
                            <img
                              key={img.id}
                              src={img.image_url}
                              alt={character.name}
                              className="w-20 h-20 object-cover rounded"
                            />
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCharacter(character.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
