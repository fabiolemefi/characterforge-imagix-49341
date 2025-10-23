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
import { Loader2, Trash2, Upload, Clipboard } from "lucide-react";
import { retryWithAuthRefresh } from "@/lib/utils";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { ImageMaskEditor } from "@/components/ImageMaskEditor";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [progress, setProgress] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [readyImage, setReadyImage] = useState<GeneratedImage | null>(null);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [characterFilter, setCharacterFilter] = useState<string>("all");

  // Estados para modo combinação
  const [uploadedImage, setUploadedImage] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [maskImage, setMaskImage] = useState<string>("");
  const [processedCanvasUrl, setProcessedCanvasUrl] = useState<string>("");
  const [maskEditorOpen, setMaskEditorOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadActivated, setImageUploadActivated] = useState(false);



  const { toast } = useToast();

  useEffect(() => {
    loadCharacters();
    loadGeneratedImages();
    loadGeneralPrompt();

    // Setup realtime subscription for new generated images
    const channel = supabase
      .channel('generated_images_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'generated_images'
        },
        (payload) => {
          const newImage = payload.new;
          setGeneratedImages((prev) => [{
            id: newImage.id,
            url: newImage.image_url,
            character: newImage.character_name,
            prompt: newImage.prompt,
          }, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'generated_images'
        },
        (payload) => {
          const deletedImage = payload.old;
          setGeneratedImages((prev) => prev.filter(img => img.id !== deletedImage.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setImageReady(false);
      setReadyImage(null);
      const minWait = Math.random() * 2000 + 15000; // 8000 to 10000 ms
      const minTimer = setTimeout(() => setMinTimePassed(true), minWait);

      const interval = setInterval(
        () => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval);
              return 100;
            }
            if (imageReady) {
              return Math.min(prev + 5, 100); // Fast increment to 100 when ready
            } else {
              const increment = Math.random() * 1 + 0.5; // 0.5 to 1.5
              return Math.min(prev + increment, 90); // Cap at 90 until ready
            }
          });
        },
        Math.random() * 200 + 100,
      );

      return () => {
        clearInterval(interval);
        clearTimeout(minTimer);
        setMinTimePassed(false);
      };
    }
  }, [loading]);

  useEffect(() => {
    if (imageReady && minTimePassed) {
      setLoading(false);
      toast({
        title: "Imagem gerada!",
        description: "Sua imagem foi gerada com sucesso.",
      });
      setPrompt("");
    }
  }, [imageReady, minTimePassed, toast]);

  const loadGeneralPrompt = async () => {
    try {
      const { data, error } = await supabase.from("plugins").select("general_prompt").eq("name", "Efimagem").single();

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
          })),
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

      // Get characters for this plugin (only active ones)
      const { data: charactersData, error: charsError } = await supabase
        .from("plugin_characters")
        .select("id, name, general_prompt")
        .eq("plugin_id", pluginData.id)
        .eq("is_active", true)
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

    const character = characters.find((c) => c.id === selectedCharacter);
    if (!character) return;

    // Modo especial: "Simulação de Brindes"
    if (character.name === "Simulação de Brindes") {
      return handleGenerateCombination(maskImage || undefined, character);
    }

    // Modo normal
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
      const fullPrompt = `${character.general_prompt ? character.general_prompt + " " : ""} ${prompt}`;
      const imageUrls = character.images.map((img) => img.image_url);

      const { data, error } = await retryWithAuthRefresh(() =>
        supabase.functions.invoke("generate-character-image", {
          body: {
            imageUrls: imageUrls,
            prompt: fullPrompt,
            generalPrompt: character.general_prompt,
          },
        })
      );

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
          setReadyImage({
            id: savedImage.id,
            url: savedImage.image_url,
            character: savedImage.character_name,
            prompt: savedImage.prompt,
          });
          setImageReady(true);
        }
      }
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      setLoading(false);
      toast({
        title: "Erro ao gerar imagem",
        description: error.message || "Ocorreu um erro ao gerar a imagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateCombination = async (maskDataUrl?: string, character?: Character, processedCanvasUrl?: string) => {
    // Para combinação (Simulação de Brindes): sempre temos processedCanvasUrl e maskDataUrl
    const finalProcessedUrl = processedCanvasUrl || "";
    const finalMaskDataUrl = maskDataUrl || "";

    console.log('Imagens para geração:', {
      processedCanvasUrl: finalProcessedUrl?.substring(0, 50) + '...',
      maskImage: finalMaskDataUrl?.substring(0, 50) + '...',
      hasProcessedCanvas: !!finalProcessedUrl,
      hasMaskImage: !!finalMaskDataUrl,
      maskSource: maskDataUrl ? 'parameter' : 'state'
    });

    if (!finalProcessedUrl) {
      toast({
        title: "Imagem necessária",
        description: "Você precisa fazer upload de uma imagem primeiro.",
        variant: "destructive",
      });
      return;
    }

    if (!finalMaskDataUrl) {
      toast({
        title: "Máscara necessária",
        description: "Você precisa criar uma máscara antes de gerar a imagem.",
        variant: "destructive",
      });
      return;
    }

    if (!character?.general_prompt.trim()) {
      toast({
        title: "Prompt geral necessário",
        description: "Este personagem precisa ter um prompt geral configurado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Usar apenas o prompt geral do character (sem prompt customizado)
      const fullPrompt = character.general_prompt;

      // Combinar: imagens do personagem + canvas modificado (com desenhos) + canvas processado (1:1 branco)
      const imageUrls = [
        ...character.images.map((img) => img.image_url),
        finalMaskDataUrl,
        processedCanvasUrl
      ];

      console.log('🎭 URLs que serão enviadas para geração:', imageUrls);
      console.log('📊 Detalhes:', {
        characterImagesCount: character.images.length,
        hasUploadedImage: !!uploadedImage,
        hasMask: !!finalMaskDataUrl,
        totalImages: imageUrls.length
      });

      const { data, error } = await retryWithAuthRefresh(() =>
        supabase.functions.invoke("generate-character-image", {
          body: {
            imageUrls: imageUrls,
            prompt: fullPrompt,
            generalPrompt: character.general_prompt,
          },
        })
      );

      if (error) throw error;

      if (data?.output) {
        const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;

        // Save to database
        const { data: savedImage, error: saveError } = await supabase
          .from("generated_images")
          .insert({
            character_id: character.id,
            character_name: character.name,
            prompt: "Combinação: " + character.general_prompt, // Indicando que foi combinação
            image_url: imageUrl,
          })
          .select()
          .single();

        if (saveError) throw saveError;

        if (savedImage) {
          setReadyImage({
            id: savedImage.id,
            url: savedImage.image_url,
            character: savedImage.character_name,
            prompt: savedImage.prompt,
          });
          setImageReady(true);

          // Limpar estados do modo combinação
          setUploadedImage("");
          setUploadedFile(null);
          setMaskImage("");
          setProcessedCanvasUrl("");
        }
      }
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      setLoading(false);
      toast({
        title: "Erro ao gerar imagem",
        description: error.message || "Ocorreu um erro ao gerar a imagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();

      for (const item of items) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg') || item.types.includes('image/jpg') || item.types.includes('image/gif') || item.types.includes('image/bmp')) {
          const blob = await item.getType(item.types.find(type => type.startsWith('image/'))!);
          const file = new File([blob], 'clipboard-image.png', { type: blob.type });
          await processImageFile(file);
          return;
        }
      }

      toast({
        title: "Nenhuma imagem encontrada",
        description: "Não foi encontrada uma imagem na área de transferência.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Erro ao colar da área de transferência:', error);
      toast({
        title: "Erro ao colar imagem",
        description: "Não foi possível acessar a área de transferência ou ela não contém uma imagem.",
        variant: "destructive",
      });
    }
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingImage(true);

      // Criar canvas branco 1:1 (1024x1024)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1024;
      canvas.height = 1024;

      // Preencher com branco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1024, 1024);

      // Carregar imagem original
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = URL.createObjectURL(file);

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Calcular dimensões para centralizar imagem mantendo proporção (sem crop)
      const imgAspect = img.naturalWidth / img.naturalHeight;

      let drawWidth, drawHeight, drawX, drawY;

      if (imgAspect > 1) {
        // Imagem mais larga - ajustar largura e centralizar verticalmente
        drawWidth = 1024;
        drawHeight = 1024 / imgAspect;
        drawX = 0;
        drawY = (1024 - drawHeight) / 2;
      } else {
        // Imagem mais alta ou quadrada - ajustar altura e centralizar horizontalmente
        drawHeight = 1024;
        drawWidth = 1024 * imgAspect;
        drawX = (1024 - drawWidth) / 2;
        drawY = 0;
      }

      // Desenhar imagem centralizada no canvas branco
      ctx.drawImage(
        img,
        drawX, drawY, drawWidth, drawHeight
      );

      // Converter canvas para Blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      // Upload para Storage
      const fileName = `temp-upload-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("plugin-images")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("plugin-images")
        .getPublicUrl(fileName);

      setProcessedCanvasUrl(publicUrl);
      setUploadingImage(false);

      // Abrir editor automaticamente com a imagem processada
      setMaskEditorOpen(true);

    } catch (error: any) {
      console.error('Processamento falhou:', error);
      setUploadingImage(false);
      toast({
        title: "Erro no processamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveMask = async (maskDataUrl: string) => {
    try {
      // Converter data URL para Blob
      const response = await fetch(maskDataUrl);
      const blob = await response.blob();

      // Upload para Storage
      const fileName = `mask-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("plugin-images")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("plugin-images")
        .getPublicUrl(fileName);

      setMaskImage(publicUrl);
    } catch (error) {
      console.error('Erro ao salvar máscara:', error);
      toast({
        title: "Erro ao salvar máscara",
        description: "Não foi possível salvar a máscara. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateWithMask = async (processedCanvasUrl: string, modifiedCanvasUrl: string) => {
    try {
      console.log('🖼️ Convertendo canvases para URLs públicas...');

      // Converter modified canvas (com máscara) para URL pública
      const maskResponse = await fetch(modifiedCanvasUrl);
      const maskBlob = await maskResponse.blob();
      
      const maskFileName = `mask-${Date.now()}.png`;
      const { data: maskUploadData, error: maskUploadError } = await supabase.storage
        .from("plugin-images")
        .upload(maskFileName, maskBlob, {
          contentType: "image/png",
          upsert: false,
        });

      if (maskUploadError) throw maskUploadError;

      const { data: { publicUrl: maskPublicUrl } } = supabase.storage
        .from("plugin-images")
        .getPublicUrl(maskFileName);

      console.log('✅ URLs públicas criadas');
      
      // Salvar as URLs (processedCanvasUrl já é URL pública do upload anterior)
      setProcessedCanvasUrl(processedCanvasUrl);
      setMaskImage(maskPublicUrl);

      // Fechar o modal
      setMaskEditorOpen(false);

      // Obter o personagem selecionado
      const character = characters.find((c) => c.id === selectedCharacter);
      if (!character) return;

      // Chamar a geração com o personagem e URLs públicas
      await handleGenerateCombination(maskPublicUrl, character, processedCanvasUrl);
    } catch (error) {
      console.error('Erro ao processar máscaras:', error);
      toast({
        title: "Erro ao processar imagens",
        description: "Não foi possível preparar as imagens. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const openMaskEditor = () => {
    if (!uploadedImage) {
      toast({
        title: "Upload pendente",
        description: "Faça upload de uma imagem primeiro.",
        variant: "destructive",
      });
      return;
    }
    setMaskEditorOpen(true);
  };

  const handleModalClose = () => {
    // Limpar estados quando o modal for fechado (cancelar ou salvar)
    setUploadedImage("");
    setUploadedFile(null);
    setMaskImage("");
    setProcessedCanvasUrl("");
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta imagem?")) return;

    try {
      const { error } = await supabase.from("generated_images").delete().eq("id", imageId);

      if (error) throw error;

      setGeneratedImages((prev) => prev.filter((img) => img.id !== imageId));

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
                  <h2 className="text-xl font-semibold text-white mb-4">Selecione um personagem</h2>

                  {loadingCharacters ? (
                    <p className="text-center text-muted-foreground mb-6">Carregando personagens...</p>
                  ) : characters.length === 0 ? (
                    <p className="text-center text-muted-foreground mb-6">
                      Nenhum personagem cadastrado ainda. Entre em contato com o administrador.
                    </p>
                  ) : (
                    <Carousel
                      opts={{
                        align: "start",
                        loop: false,
                      }}
                      className="w-full mb-6"
                    >
                      <CarouselContent className="-ml-2 md:-ml-4">
                        {characters.map((character) => (
                          <CarouselItem key={character.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/4">
                            <label
                              className={`cursor-pointer p-4 border-2 rounded-lg transition-all block h-full ${
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
                                onChange={(e) => {
                                  const newCharacterId = e.target.value;
                                  setSelectedCharacter(newCharacterId);

                                  // Resetar estados quando trocar de personagem
                                  setPrompt("");
                                  setUploadedImage("");
                                  setUploadedFile(null);
                                  setMaskImage("");
                                  setProcessedCanvasUrl("");
                                  setMaskEditorOpen(false);

                                  // Ativar upload apenas se for "Simulação de Brindes"
                                  if (characters.find(c => c.id === newCharacterId)?.name === "Simulação de Brindes") {
                                    setImageUploadActivated(true);
                                  } else {
                                    setImageUploadActivated(false);
                                  }
                                }}
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
                                <div className="text-lg font-medium text-white">{character.name}</div>
                              </div>
                            </label>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  )}

                  {selectedCharacter && (
                    <div className="space-y-4 animate-fade-in">
                      {characters.find(c => c.id === selectedCharacter)?.name === "Simulação de Brindes" ? (
                        <>
                          {/* Modo combinação especial */}
                          {imageUploadActivated && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                  Selecione uma imagem para editar
                                </label>
                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                                  <div className="space-y-4">
                                    <p className="text-lg text-muted-foreground">
                                      {uploadingImage ? "Carregando imagem..." : "Selecione ou cole da área de transferência"}
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                      <div className="flex flex-col items-center gap-2">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={handleImageUpload}
                                          className="hidden"
                                          id="image-upload"
                                          disabled={uploadingImage}
                                        />
                                        <Button
                                          variant="outline"
                                          disabled={uploadingImage}
                                          onClick={() => document.getElementById('image-upload')?.click()}
                                        >
                                          <Upload className="h-4 w-4 mr-2" />
                                          Selecionar imagem
                                        </Button>
                                      </div>
                                      <Button
                                        variant="outline"
                                        onClick={handlePasteFromClipboard}
                                        disabled={uploadingImage}
                                      >
                                        <Clipboard className="h-4 w-4 mr-2" />
                                        Colar imagem
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Modo normal */}
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">Descreva a pose desejada</label>
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
                            disabled={loading || !prompt.trim()}
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
                        </>
                      )}
                    </div>
                  )}
                </Card>

                {(generatedImages.length > 0 || loading) && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold text-white">Imagens Geradas</h2>
                      <Select value={characterFilter} onValueChange={setCharacterFilter}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filtrar por todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Filtrar por todos</SelectItem>
                          {characters.map((char) => (
                            <SelectItem key={char.id} value={char.name}>
                              Filtrar por {char.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {loading && (
                        <Card
                          className="overflow-hidden"
                          style={{
                            transform: `scale(${1 - (progress / 100) * 0.2})`,
                            transition: "transform 0.3s ease",
                          }}
                        >
                          <div className="aspect-square bg-muted flex items-center justify-center">
                            <div className="relative w-16 h-16">
                              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" stroke="#e5e7eb" stroke-width="4" fill="none"></circle>
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  stroke="#3b82f6"
                                  stroke-width="4"
                                  fill="none"
                                  stroke-dasharray={`${(progress / 100) * 251} 251`}
                                  stroke-linecap="round"
                                  style={{ transition: "stroke-dasharray 0.1s ease" }}
                                ></circle>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">{Math.floor(progress)}%</span>
                              </div>
                            </div>
                          </div>
                          </Card>
                        )}
                      {generatedImages
                        .filter((img) => characterFilter === "all" || img.character === characterFilter)
                        .map((img) => (
                        <Card key={img.id} className="overflow-hidden">
                          <div className="relative group">
                            <div
                              className="aspect-square bg-muted cursor-pointer hover:opacity-80 transition-opacity relative"
                              onClick={() => setSelectedImage(img.url)}
                            >
                              <img
                                src={img.url}
                                alt={`Gerado - ${img.character}`}
                                className="w-full h-full object-cover"
                              />
                              <Badge className="absolute top-1 left-1 z-10">{img.character}</Badge>
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
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <ImageViewerModal
                  open={!!selectedImage}
                  onOpenChange={(open) => !open && setSelectedImage(null)}
                  imageUrl={generatedImages.find(img => img.url === selectedImage)?.url || ""}
                  imageId={generatedImages.find(img => img.url === selectedImage)?.id || ""}
                  onImageUpdate={(newUrl) => {
                    setGeneratedImages(prev =>
                      prev.map(img =>
                        img.url === selectedImage ? { ...img, url: newUrl } : img
                      )
                    );
                    setSelectedImage(newUrl);
                  }}
                />

                <ImageMaskEditor
                  open={maskEditorOpen}
                  onOpenChange={(open) => {
                    // Limpar estados sempre que o modal fechar (qualquer motivo)
                    if (!open) {
                      setUploadedImage("");
                      setUploadedFile(null);
                      setMaskImage("");
                      setProcessedCanvasUrl("");
                    }
                    setMaskEditorOpen(open);
                  }}
                  imageUrl={processedCanvasUrl}
                  onGenerateCombination={handleGenerateWithMask}
                  onModalClose={(isGenerating) => {
                    handleModalClose();
                    // Se fechou modal sem completar geração (cancelado ou errou), resetar loading
                    if (!isGenerating) {
                      setLoading(false);
                    }
                  }}
                />


              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
