import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CharacterImage {
  id: string;
  image_url: string;
  position: number;
  is_cover: boolean;
}

interface Character {
  id: string;
  name: string;
  general_prompt: string;
  images: CharacterImage[];
  coverImage?: string;
}

interface SelectCharacterModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (character: Character, editedPrompt: string, withBorders: boolean) => void;
  heroPrompt: string;
  loading?: boolean;
}

export const SelectCharacterModal = ({
  open,
  onClose,
  onSelect,
  heroPrompt,
  loading = false,
}: SelectCharacterModalProps) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editedPrompt, setEditedPrompt] = useState<string>(heroPrompt);
  const [withBorders, setWithBorders] = useState<boolean>(false);

  // Sincronizar editedPrompt quando heroPrompt mudar
  useEffect(() => {
    setEditedPrompt(heroPrompt);
  }, [heroPrompt]);

  useEffect(() => {
    if (open) {
      loadCharacters();
    }
  }, [open]);

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

      // Get characters for this plugin (only active ones, excluding Brindes)
      const { data: charactersData, error: charsError } = await supabase
        .from("plugin_characters")
        .select("id, name, general_prompt")
        .eq("plugin_id", pluginData.id)
        .eq("is_active", true)
        .neq("name", "Brindes")
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
          coverImage:
            imagesData?.find((img) => img.character_id === char.id && img.is_cover)?.image_url ||
            imagesData?.find((img) => img.character_id === char.id)?.image_url,
        }));

        setCharacters(charactersWithImages);
        
        // Auto-select first character
        if (charactersWithImages.length > 0 && !selectedId) {
          setSelectedId(charactersWithImages[0].id);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar personagens:", error);
    } finally {
      setLoadingCharacters(false);
    }
  };

  const handleSelect = () => {
    const character = characters.find((c) => c.id === selectedId);
    if (character) {
      onSelect(character, editedPrompt, withBorders);
    }
  };

  const selectedCharacter = characters.find((c) => c.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Escolha uma Persona
          </DialogTitle>
          <DialogDescription>
            Selecione qual personagem do Efimagem será usado para gerar a imagem do banner
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loadingCharacters ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma persona encontrada no Efimagem
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 justify-center">
                {characters.map((character) => (
                  <button
                    key={character.id}
                    onClick={() => setSelectedId(character.id)}
                    disabled={loading}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      "hover:border-primary/50 hover:bg-muted/50",
                      selectedId === character.id
                        ? "border-primary bg-primary/5"
                        : "border-border",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Avatar className="h-16 w-16">
                      {character.coverImage ? (
                        <AvatarImage 
                          src={character.coverImage} 
                          alt={character.name}
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback>
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{character.name}</span>
                  </button>
                ))}
              </div>

              {heroPrompt && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="prompt-textarea" className="text-xs font-medium text-muted-foreground">
                      Cena a ser gerada:
                    </Label>
                    <Textarea
                      id="prompt-textarea"
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      placeholder="Descreva a cena..."
                      className="min-h-[100px] text-sm"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="borders-toggle" className="text-sm font-medium cursor-pointer">
                        Imagem com bordas
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Adiciona ícones 3D decorativos saindo das bordas
                      </p>
                    </div>
                    <Switch
                      id="borders-toggle"
                      checked={withBorders}
                      onCheckedChange={setWithBorders}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Pular
          </Button>
          <Button 
            onClick={handleSelect} 
            disabled={!selectedId || loading || loadingCharacters}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar com {selectedCharacter?.name || "Persona"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
