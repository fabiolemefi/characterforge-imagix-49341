import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { CanvaObject } from '@/types/canvaEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadsPanelProps {
  onAddObject: (object: CanvaObject) => void;
}

export function UploadsPanel({ onAddObject }: UploadsPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('canva-blocks')
        .upload(`editor/${fileName}`, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('canva-blocks')
        .getPublicUrl(`editor/${fileName}`);

      const imageUrl = urlData.publicUrl;
      setUploadedImages((prev) => [imageUrl, ...prev]);
      
      // Add image to canvas
      handleAddImage(imageUrl);
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddImage = (src: string) => {
    // Create Image element to detect real dimensions
    const img = new Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const aspectRatio = naturalWidth / naturalHeight;
      
      // Define maximum initial size
      const maxSize = 300;
      let width: number;
      let height: number;
      
      if (aspectRatio > 1) {
        // Horizontal image
        width = maxSize;
        height = maxSize / aspectRatio;
      } else {
        // Vertical or square image
        height = maxSize;
        width = maxSize * aspectRatio;
      }
      
      const newImage: CanvaObject = {
        id: `image-${Date.now()}`,
        type: 'image',
        x: 50,
        y: 50,
        width,
        height,
        src,
        name: 'Imagem',
      };
      onAddObject(newImage);
    };
    img.src = src;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm text-muted-foreground px-1 mb-3">Upload de Imagens</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          className="w-full h-24 flex-col gap-2 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Enviando...</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="text-sm">Clique para enviar</span>
            </>
          )}
        </Button>
      </div>

      {uploadedImages.length > 0 && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground px-1 mb-3">Imagens Enviadas</h3>
          <div className="grid grid-cols-2 gap-2">
            {uploadedImages.map((src, index) => (
              <button
                key={index}
                className="aspect-square rounded-md border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                onClick={() => handleAddImage(src)}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {uploadedImages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma imagem enviada</p>
        </div>
      )}
    </div>
  );
}
