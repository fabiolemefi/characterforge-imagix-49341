import { useState, useRef, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bold, Italic, Underline } from 'lucide-react';

interface VisualBlockEditorProps {
  html: string;
  onUpdate: (html: string) => void;
}

export const VisualBlockEditor = ({ html, onUpdate }: VisualBlockEditorProps) => {
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [selectedImageElement, setSelectedImageElement] = useState<HTMLImageElement | null>(null);
  const [codeViewHtml, setCodeViewHtml] = useState(html);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });

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

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = previewRef.current?.getBoundingClientRect();
      
      if (editorRect) {
        setToolbarPosition({
          top: rect.top - editorRect.top - 45,
          left: rect.left - editorRect.left + rect.width / 2 - 75,
        });
        setShowToolbar(true);
      }
    } else {
      setShowToolbar(false);
    }
  };

  const executeCommand = (command: string) => {
    document.execCommand(command, false);
    handleContentChange();
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
        <div className="relative">
          <div 
            ref={previewRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleContentChange}
            onClick={handleImageClick}
            onMouseUp={handleSelection}
            onKeyUp={handleSelection}
            className="border rounded-lg p-4 bg-white min-h-[300px] focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ 
              cursor: 'text',
            }}
          />
          {showToolbar && (
            <div
              ref={toolbarRef}
              className="absolute z-50 flex gap-1 p-1 bg-popover border rounded-md shadow-md"
              style={{
                top: `${toolbarPosition.top}px`,
                left: `${toolbarPosition.left}px`,
              }}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => executeCommand('bold')}
                className="h-7 w-7 p-0"
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => executeCommand('italic')}
                className="h-7 w-7 p-0"
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => executeCommand('underline')}
                className="h-7 w-7 p-0"
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Clique nos textos para editar, selecione para formatar e clique nas imagens para fazer upload
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
