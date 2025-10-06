import { useState, useRef, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface VisualBlockEditorProps {
  html: string;
  onUpdate: (html: string) => void;
}

export const VisualBlockEditor = ({ html, onUpdate }: VisualBlockEditorProps) => {
  const { toast } = useToast();
  const [editableHtml, setEditableHtml] = useState(html);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageElement, setSelectedImageElement] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    setEditableHtml(html);
  }, [html]);

  const handleContentChange = () => {
    if (previewRef.current) {
      const newHtml = previewRef.current.innerHTML;
      setEditableHtml(newHtml);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedImageElement) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        selectedImageElement.src = base64;
        handleContentChange();
        
        toast({
          title: 'Imagem atualizada',
          description: 'A imagem foi substituída com sucesso',
        });
      };
      reader.readAsDataURL(file);
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
          dangerouslySetInnerHTML={{ __html: editableHtml }}
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
              value={editableHtml}
              onChange={(e) => {
                setEditableHtml(e.target.value);
                onUpdate(e.target.value);
              }}
              className="font-mono text-xs min-h-[200px]"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
