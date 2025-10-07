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
import { Textarea } from "@/components/ui/textarea";

interface Character {
  id: string;
  name: string;
  general_prompt: string;
  images: { id: string; image_url: string; position: number; is_cover: boolean }[];
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
  const [newCharacterPrompt, setNewCharacterPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingCharacterPrompt, setEditingCharacterPrompt] = useState<string | null>(null);
  const [characterPromptValue, setCharacterPromptValue] = useState("");
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
        .select("id, name, general_prompt")
        .eq("plugin_id", pluginId);

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

  const handleToggleCover = async (characterId: string, imageId: string) => {
    try {
      const character = characters.find(c => c.id === characterId);
      if (!character) return;

      // Remove is_cover from all images of this character
      for (const img of character.images) {
        await supabase
          .from("character_images")
          .update({ is_cover: false })
          .eq("id", img.id);
      }

      // Set the selected image as cover
      const { error } = await supabase
        .from("character_images")
        .update({ is_cover: true })
        .eq("id", imageId);

      if (error) throw error;

      toast({
        title: "Imagem de capa atualizada",
        description: "A imagem de capa foi definida com sucesso",
      });

      loadCharacters();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar imagem de capa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta imagem?")) return;

    try {
      const { error } = await supabase
        .from("character_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;

      toast({
        title: "Imagem excluída",
        description: "A imagem foi excluída com sucesso",
      });

      loadCharacters();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir imagem",
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

  const handleEditCharacterPrompt = (characterId: string, currentPrompt: string) => {
    setEditingCharacterPrompt(characterId);
    setCharacterPromptValue(currentPrompt);
  };

  const handleSaveCharacterPrompt = async () => {
    if (!editingCharacterPrompt) return;

    try {
      const { error } = await supabase
        .from("plugin_characters")
        .update({ general_prompt: characterPromptValue })
        .eq("id", editingCharacterPrompt);

      if (error) throw error;

      toast({
        title: "Prompt atualizado",
        description: "O prompt geral do personagem foi atualizado com sucesso.",
      });

      setEditingCharacterPrompt(null);
      setCharacterPromptValue("");
      loadCharacters();
    } catch (error: any) {
      console.error("Erro ao salvar prompt:", error);
      toast({
        title: "Erro ao salvar prompt",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelEditPrompt = () => {
    setEditingCharacterPrompt(null);
    setCharacterPromptValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Personagens</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mb-6">{/* Empty gap at top */}

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

                        {/* Character prompt section */}
                        <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">Prompt Geral</Label>
                            {editingCharacterPrompt === character.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" onClick={handleSaveCharacterPrompt} variant="default">
                                  Salvar
                                </Button>
                                <Button size="sm" onClick={handleCancelEditPrompt} variant="outline">
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditCharacterPrompt(character.id, character.general_prompt)}
                              >
                                Editar
                              </Button>
                            )}
                          </div>
                          {editingCharacterPrompt === character.id ? (
                            <Textarea
                              value={characterPromptValue}
                              onChange={(e) => setCharacterPromptValue(e.target.value)}
                              placeholder="Ex: Crie uma imagem profissional e de alta qualidade de"
                              rows={2}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {character.general_prompt || "Nenhum prompt definido"}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {character.images.map((img) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={img.image_url}
                                alt={character.name}
                                className="w-20 h-20 object-cover rounded"
                              />
                              <Button
                                size="sm"
                                variant={img.is_cover ? "default" : "secondary"}
                                className="absolute bottom-1 left-1 right-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleToggleCover(character.id, img.id)}
                              >
                                {img.is_cover ? "Capa" : "Definir"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute -top-1 -right-1 p-0.5 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteImage(img.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
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
