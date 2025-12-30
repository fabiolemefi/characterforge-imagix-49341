import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ImageIcon, Clipboard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TestImage } from "@/types/test";

interface TestImagesSectionProps {
  images: TestImage[];
  onChange: (images: TestImage[]) => void;
  disabled?: boolean;
}

export function TestImagesSection({
  images,
  onChange,
  disabled,
}: TestImagesSectionProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo: 20MB");
      return null;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return null;
    }

    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("test-attachments")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("test-attachments")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const url = await uploadImage(file);
      if (url) {
        const newImage: TestImage = {
          url,
          caption: "",
          uploaded_at: new Date().toISOString(),
        };
        onChange([...images, newImage]);
        toast.success("Imagem adicionada!");
      }
    } catch (error: any) {
      toast.error("Erro ao enviar imagem: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        setUploading(true);
        try {
          const url = await uploadImage(file);
          if (url) {
            const newImage: TestImage = {
              url,
              caption: "",
              uploaded_at: new Date().toISOString(),
            };
            onChange([...images, newImage]);
            toast.success("Imagem colada!");
          }
        } catch (error: any) {
          toast.error("Erro ao colar imagem: " + error.message);
        } finally {
          setUploading(false);
        }
        break;
      }
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `clipboard-${Date.now()}.png`, { type: imageType });
          
          setUploading(true);
          try {
            const url = await uploadImage(file);
            if (url) {
              const newImage: TestImage = {
                url,
                caption: "",
                uploaded_at: new Date().toISOString(),
              };
              onChange([...images, newImage]);
              toast.success("Imagem colada!");
            }
          } finally {
            setUploading(false);
          }
          return;
        }
      }
      toast.error("Nenhuma imagem encontrada na área de transferência");
    } catch (error: any) {
      if (error.name === "NotAllowedError") {
        toast.error("Permissão negada para acessar a área de transferência");
      } else {
        toast.error("Erro ao colar imagem: " + error.message);
      }
    }
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const updated = images.map((img, i) =>
      i === index ? { ...img, caption } : img
    );
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Criativos / Imagens</label>
        <span className="text-xs text-muted-foreground">
          {images.length} {images.length === 1 ? "imagem" : "imagens"}
        </span>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative border rounded-lg overflow-hidden bg-muted/50"
            >
              <div className="aspect-video relative">
                <img
                  src={image.url}
                  alt={image.caption || `Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="p-3">
                <Input
                  value={image.caption}
                  onChange={(e) => handleCaptionChange(index, e.target.value)}
                  placeholder="Digite a legenda (ex: Criativo A)"
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {!disabled && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Plus className="h-4 w-4" />
              <ImageIcon className="h-4 w-4" />
              Upload
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={handlePasteFromClipboard}
              disabled={uploading}
            >
              <Clipboard className="h-4 w-4" />
              Colar
            </Button>
          </div>
          
          <div
            ref={pasteAreaRef}
            onPaste={handlePaste}
            className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors focus-within:border-primary"
            tabIndex={0}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm">Enviando imagem...</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ou arraste uma imagem aqui / <strong>Ctrl+V</strong> para colar
              </p>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
