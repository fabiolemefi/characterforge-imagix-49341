import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Copy, Edit, Loader2, ChevronDown, Eraser, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageId: string;
  onImageUpdate?: (newUrl: string) => void;
}

export const ImageViewerModal = ({ open, onOpenChange, imageUrl, imageId, onImageUpdate }: ImageViewerModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [imageHistory, setImageHistory] = useState<string[]>([imageUrl]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setCurrentImageUrl(imageUrl);
      setImageHistory([imageUrl]);
      setSelectedHistoryIndex(0);
      setIsEditing(false);
      setEditPrompt("");
      setIsGenerating(false);
      setProgress(0);
    }
  }, [imageUrl, open]);

  useEffect(() => {
    if (isGenerating) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + Math.random() * 2 + 1;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imagem-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Download iniciado!");
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download da imagem");
    }
  };

  const handleCopyImage = async () => {
    try {
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      toast.success("Imagem copiada para a área de transferência!");
    } catch (error) {
      console.error("Erro ao copiar imagem:", error);
      toast.error("Erro ao copiar imagem");
    }
  };

  const handleGenerateEdit = async () => {
    if (!editPrompt.trim()) {
      toast.error("Digite um prompt para edição");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("edit-character-image", {
        body: {
          imageUrl: currentImageUrl,
          prompt: editPrompt,
          imageId: imageId,
        },
      });

      if (error) throw error;

      if (data?.predictionId) {
        toast.success("Editando sua imagem! Será atualizada automaticamente.");
        
        // Configurar listener para esta predição específica
        const channel = supabase
          .channel(`edit-image-${data.predictionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'generated_images',
              filter: `id=eq.${imageId}`
            },
            (payload) => {
              const updated = payload.new;
              if (updated.status === 'completed' && updated.image_url && updated.image_url !== currentImageUrl) {
                setProgress(100);
                setTimeout(() => {
                  // Adicionar nova imagem ao histórico e atualizar índice corretamente
                  setImageHistory((prev) => {
                    const newHistory = [...prev, updated.image_url];
                    setSelectedHistoryIndex(newHistory.length - 1);
                    return newHistory;
                  });
                  setCurrentImageUrl(updated.image_url);
                  setEditPrompt("");
                  setIsGenerating(false);
                  setProgress(0);
                  toast.success("Imagem editada com sucesso!");
                  supabase.removeChannel(channel);
                }, 500);
              } else if (updated.status === 'failed') {
                setIsGenerating(false);
                setProgress(0);
                toast.error("Erro ao editar imagem: " + (updated.error_message || "Falha no processamento"));
                supabase.removeChannel(channel);
              }
            }
          )
          .subscribe();
      }
    } catch (error: any) {
      console.error("Erro ao editar imagem:", error);
      toast.error("Erro ao editar imagem: " + error.message);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleSaveEdited = async () => {
    if (currentImageUrl === imageUrl) {
      onOpenChange(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("generated_images")
        .update({ image_url: currentImageUrl })
        .eq("id", imageId);

      if (error) throw error;

      onImageUpdate?.(currentImageUrl);
      toast.success("Imagem salva com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar imagem:", error);
      toast.error("Erro ao salvar imagem");
    }
  };

  const handleSelectHistoryImage = (index: number) => {
    setSelectedHistoryIndex(index);
    setCurrentImageUrl(imageHistory[index]);
  };

  const handleRemoveBackground = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("remove-background", {
        body: {
          imageUrl: currentImageUrl,
          imageId: imageId,
        },
      });

      if (error) throw error;

      if (data?.predictionId) {
        toast.success("Remoção de background iniciada! A imagem será atualizada automaticamente.");
        
        // Configurar listener para esta predição específica
        const channel = supabase
          .channel(`bg-removal-${data.predictionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'generated_images',
              filter: `id=eq.${imageId}`
            },
            (payload) => {
              const updated = payload.new;
              if (updated.status === 'completed' && updated.image_url && updated.image_url !== currentImageUrl) {
                setProgress(100);
                setTimeout(() => {
                  // Adicionar nova imagem ao histórico e atualizar índice corretamente
                  setImageHistory((prev) => {
                    const newHistory = [...prev, updated.image_url];
                    setSelectedHistoryIndex(newHistory.length - 1);
                    return newHistory;
                  });
                  setCurrentImageUrl(updated.image_url);
                  setIsGenerating(false);
                  setProgress(0);
                  toast.success("Background removido com sucesso!");
                  supabase.removeChannel(channel);
                }, 500);
              } else if (updated.status === 'failed') {
                setIsGenerating(false);
                setProgress(0);
                toast.error("Erro ao remover background: " + (updated.error_message || "Falha no processamento"));
                supabase.removeChannel(channel);
              }
            }
          )
          .subscribe();
      }
    } catch (error: any) {
      console.error("Erro ao remover background:", error);
      toast.error("Erro ao remover background: " + error.message);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 flex flex-col max-h-[90vh]">
        <VisuallyHidden>
          <DialogTitle>Visualizar e Editar Imagem</DialogTitle>
        </VisuallyHidden>
        
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* History sidebar */}
          {imageHistory.length > 1 && (
            <ScrollArea className="w-24 bg-muted/50 border-r">
              <div className="p-2 space-y-2">
                <p className="text-xs text-muted-foreground text-center mb-2">Histórico</p>
                {imageHistory.map((url, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectHistoryImage(index)}
                    className={`cursor-pointer rounded border-2 transition-all ${
                      selectedHistoryIndex === index
                        ? "border-primary"
                        : "border-transparent hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Versão ${index + 1}`}
                      className="w-full aspect-square object-cover rounded"
                    />
                    <p className="text-xs text-center mt-1">v{index + 1}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Main content with scroll */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {/* Checkered background pattern */}
              <div className="relative w-full min-h-[400px]">
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%),
                    linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%),
                    linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
              />
              
                {/* Image */}
                <div className="relative p-8 flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <img 
                      src={currentImageUrl} 
                      alt="Imagem gerada" 
                      className="max-w-full w-auto h-auto max-h-[60vh] object-contain"
                      style={{
                        opacity: isGenerating ? 0.5 : 1,
                        animation: isGenerating ? 'pulse 0.5s ease-in-out infinite alternate' : 'none'
                      }}
                    />
                    {isGenerating && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-20 h-20">
                          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="hsl(var(--muted))" strokeWidth="4" fill="none"></circle>
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              stroke="hsl(var(--primary))"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={`${(progress / 100) * 251} 251`}
                              strokeLinecap="round"
                              style={{ transition: "stroke-dasharray 0.1s ease" }}
                            ></circle>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-medium">{Math.floor(progress)}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="absolute top-4 left-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shadow-lg"
                        disabled={isGenerating}
                      >
                        Ações
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="z-50">
                      <DropdownMenuItem onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyImage}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                        <Edit className="w-4 h-4 mr-2" />
                        {isEditing ? "Cancelar edição" : "Editar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setIsEditing(true);
                          setEditPrompt("Rotacione este objeto **120 graus horizontalmente ao redor do eixo Y**, usando como ponto de referência o centro inferior do objeto. Não altere rotação vertical ou inclinação. Não duplique o objeto. Se ele tiver mais que uma parte e não for um objeto único, randomize a posição dos outros objetos mas de uma maneira que estejam fazendo parte ainda da mesma cena. Adicione um cenário com volumetria 3d minimalista ao fundo, todo em tons brancos e conceitual que destaque o objeto mas ainda faça menção a para que serve o uso do objeto para dar um contexto à imagem. Nenhum elemento deve estar interagindo diretamente com o objeto e nem o sobrepondo.");
                        }}
                        disabled={isGenerating}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Finalizar Brinde
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleRemoveBackground} disabled={isGenerating}>
                        <Eraser className="w-4 h-4 mr-2" />
                        Remover background
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Edit section */}
              {isEditing && (
                <div className="p-4 border-t bg-background/95 backdrop-blur">
                  <Textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Descreva as alterações que deseja fazer na imagem..."
                    rows={3}
                    disabled={isGenerating}
                    className="mb-3"
                  />
                  <Button
                    onClick={handleGenerateEdit}
                    disabled={isGenerating || !editPrompt.trim()}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      "Gerar edição"
                    )}
                  </Button>
                </div>
              )}
              
              {/* Save button - shown when image has changed */}
              {currentImageUrl !== imageUrl && (
                <div className="p-4 border-t bg-background/95 backdrop-blur">
                  <Button
                    onClick={handleSaveEdited}
                    variant="default"
                    disabled={isGenerating}
                    className="w-full"
                  >
                    Salvar e fechar
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
