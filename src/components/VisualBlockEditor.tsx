import { useState, useRef, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VisualBlockEditorProps {
  html: string;
  onUpdate: (html: string) => void;
}

export const VisualBlockEditor = ({ html, onUpdate }: VisualBlockEditorProps) => {
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageElement, setSelectedImageElement] = useState<HTMLImageElement | null>(null);
  const [codeViewHtml, setCodeViewHtml] = useState(html);

  useEffect(() => {
    if (previewRef.current && !previewRef.current.innerHTML) {
      previewRef.current.innerHTML = html;
    }
    setCodeViewHtml(html);
  }, [html]);

  const handleContentChange = () => {
    if (previewRef.current) {
      const newHtml = previewRef.current.innerHTML;
      setCodeViewHtml(newHtml);
      onUpdate(newHtml);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      setSelectedImageElement(target as HTMLImageElement);
      fileInputRef.current?.click();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedImageElement) {
      try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('email-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('email-images')
          .getPublicUrl(data.path);

        // Update image src
        selectedImageElement.src = publicUrl;
        handleContentChange();
        
        toast({
          title: 'Imagem atualizada',
          description: 'A imagem foi enviada e substituída com sucesso',
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao fazer upload',
          description: error.message,
        });
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Edição Visual</h3>
        <div 
          ref={previewRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          onClick={handleImageClick}
          className="border rounded-lg p-4 bg-white min-h-[300px] focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ 
            cursor: 'text',
          }}
        />
        <p className="text-xs text-muted-foreground">
          Clique nos textos para editar e nas imagens para fazer upload
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <Accordion type="single" collapsible>
        <AccordionItem value="code" className="border-none">
          <AccordionTrigger className="text-sm">Código HTML</AccordionTrigger>
          <AccordionContent>
            <Textarea
              value={codeViewHtml}
              onChange={(e) => {
                setCodeViewHtml(e.target.value);
                if (previewRef.current) {
                  previewRef.current.innerHTML = e.target.value;
                  onUpdate(e.target.value);
                }
              }}
              className="font-mono text-xs min-h-[200px]"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
