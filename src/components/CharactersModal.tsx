import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, X, Pencil } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Character {
  id: string;
  name: string;
  general_prompt: string;
  is_active: boolean;
  position: number;
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterPrompt, setNewCharacterPrompt] = useState("");
  const [characterIsActive, setCharacterIsActive] = useState(true);
  const [characterPosition, setCharacterPosition] = useState(0);
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
        .select("id, name, general_prompt, is_active, position")
        .eq("plugin_id", pluginId)
        .order("position", { ascending: true });

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
          general_prompt: newCharacterPrompt.trim(),
          is_active: characterIsActive,
          position: characterPosition,
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
      setNewCharacterPrompt("");
      setCharacterIsActive(true);
      setCharacterPosition(0);
      setSelectedFiles([]);
      setShowAddForm(false);
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

  const handleStartEdit = (character: Character) => {
    setEditingCharacter(character.id);
    setNewCharacterName(character.name);
    setNewCharacterPrompt(character.general_prompt);
    setCharacterIsActive(character.is_active);
    setCharacterPosition(character.position);
  };

  const handleSaveEdit = async () => {
    if (!editingCharacter) return;

    setUploading(true);
    try {
      const updateData: any = {
        name: newCharacterName.trim(),
        general_prompt: newCharacterPrompt.trim(),
        is_active: characterIsActive,
        position: characterPosition,
      };

      const { error } = await supabase
        .from("plugin_characters")
        .update(updateData)
        .eq("id", editingCharacter);

      if (error) throw error;

      // Add new images if selected
      if (selectedFiles.length > 0) {
        const imageUrls = await uploadImages(selectedFiles);
        const character = characters.find(c => c.id === editingCharacter);
        const maxPosition = character ? Math.max(...character.images.map(img => img.position), -1) : -1;
        
        const imageRecords = imageUrls.map((url, index) => ({
          character_id: editingCharacter,
          image_url: url,
          position: maxPosition + index + 1,
        }));

        const { error: imagesError } = await supabase
          .from("character_images")
          .insert(imageRecords);

        if (imagesError) throw imagesError;
      }

      toast({
        title: "Personagem atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      setEditingCharacter(null);
      setNewCharacterName("");
      setNewCharacterPrompt("");
      setCharacterIsActive(true);
      setCharacterPosition(0);
      setSelectedFiles([]);
      loadCharacters();
    } catch (error: any) {
      console.error("Erro ao atualizar personagem:", error);
      toast({
        title: "Erro ao atualizar personagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCharacter(null);
    setNewCharacterName("");
    setNewCharacterPrompt("");
    setCharacterIsActive(true);
    setCharacterPosition(0);
    setSelectedFiles([]);
  };

  const getCoverImage = (character: Character) => {
    const coverImg = character.images.find(img => img.is_cover);
    return coverImg?.image_url || character.images[0]?.image_url || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Personagens</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mb-6">
          {/* Add new character button and form */}
          {!showAddForm && !editingCharacter && (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Novo Personagem
            </Button>
          )}

          {(showAddForm || editingCharacter) && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">
                {editingCharacter ? "Editar Personagem" : "Adicionar Novo Personagem"}
              </h3>
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
                  <Label htmlFor="character-prompt">Prompt Geral</Label>
                  <Textarea
                    id="character-prompt"
                    value={newCharacterPrompt}
                    onChange={(e) => setNewCharacterPrompt(e.target.value)}
                    placeholder="Ex: Crie uma imagem profissional e de alta qualidade de"
                    rows={3}
                    disabled={uploading}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="character-active"
                      checked={characterIsActive}
                      onCheckedChange={setCharacterIsActive}
                      disabled={uploading}
                    />
                    <Label htmlFor="character-active">Ativo</Label>
                  </div>

                  <div className="flex-1">
                    <Label htmlFor="character-position">Posição/Ordem</Label>
                    <Input
                      id="character-position"
                      type="number"
                      value={characterPosition}
                      onChange={(e) => setCharacterPosition(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      disabled={uploading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="character-images">
                    {editingCharacter ? "Adicionar Imagens (até 10 imagens)" : "Imagens (até 10 imagens)"}
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

                <div className="flex gap-2">
                  {editingCharacter ? (
                    <>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={uploading}
                        className="flex-1"
                      >
                        {uploading ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        disabled={uploading}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleAddCharacter}
                        disabled={uploading}
                        className="flex-1"
                      >
                        {uploading ? "Criando..." : "Adicionar Personagem"}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewCharacterName("");
                          setNewCharacterPrompt("");
                          setCharacterIsActive(true);
                          setCharacterPosition(0);
                          setSelectedFiles([]);
                        }}
                        disabled={uploading}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {characters.map((character) => (
                  <Card key={character.id} className="p-3">
                    <div className="relative">
                      {getCoverImage(character) && (
                        <div className="w-full aspect-square rounded overflow-hidden bg-muted mb-2">
                          <img
                            src={getCoverImage(character)}
                            alt={character.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate flex-1">
                          {character.name}
                        </h4>
                        {!character.is_active && (
                          <Badge variant="secondary" className="text-xs ml-1">Inativo</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(character)}
                          className="flex-1"
                          disabled={editingCharacter !== null || showAddForm}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCharacter(character.id)}
                          disabled={editingCharacter !== null || showAddForm}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Edit character details section */}
          {editingCharacter && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Imagens do Personagem</h3>
              <div className="flex gap-2 flex-wrap">
                {characters
                  .find(c => c.id === editingCharacter)
                  ?.images.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.image_url}
                        alt="Personagem"
                        className="w-24 h-24 object-cover rounded"
                      />
                      <Button
                        size="sm"
                        variant={img.is_cover ? "default" : "secondary"}
                        className="absolute bottom-1 left-1 right-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleToggleCover(editingCharacter, img.id)}
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
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
