import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VisualBlockEditorProps {
  html: string;
  onUpdate: (html: string) => void;
}

export const VisualBlockEditor = ({ html, onUpdate }: VisualBlockEditorProps) => {
  const { toast } = useToast();
  const [editableHtml, setEditableHtml] = useState(html);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract text content from HTML for visual editing
  const extractTexts = (htmlString: string): string[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const textNodes: string[] = [];
    
    const walker = doc.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text) {
        textNodes.push(text);
      }
    }
    
    return textNodes;
  };

  // Extract image sources from HTML
  const extractImages = (htmlString: string): string[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const images = doc.querySelectorAll('img');
    return Array.from(images).map(img => img.src);
  };

  const texts = extractTexts(editableHtml);
  const images = extractImages(editableHtml);

  const handleTextChange = (index: number, newValue: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(editableHtml, 'text/html');
    const textNodes: Node[] = [];
    
    const walker = doc.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent?.trim()) {
        textNodes.push(node);
      }
    }
    
    if (textNodes[index]) {
      textNodes[index].textContent = newValue;
    }
    
    const newHtml = doc.body.innerHTML;
    setEditableHtml(newHtml);
    onUpdate(newHtml);
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      // Convert to base64 for demo purposes
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(editableHtml, 'text/html');
        const imgElements = doc.querySelectorAll('img');
        
        if (imgElements[index]) {
          imgElements[index].src = base64;
        }
        
        const newHtml = doc.body.innerHTML;
        setEditableHtml(newHtml);
        onUpdate(newHtml);
        
        toast({
          title: 'Imagem atualizada',
          description: 'A imagem foi substituída com sucesso',
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar imagem',
        description: 'Não foi possível processar a imagem',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Edição Visual</h3>
        
        {texts.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Textos</Label>
            {texts.map((text, index) => (
              <div key={index} className="space-y-1">
                <Label className="text-xs text-muted-foreground">Texto {index + 1}</Label>
                {text.length > 50 ? (
                  <Textarea
                    value={text}
                    onChange={(e) => handleTextChange(index, e.target.value)}
                    className="min-h-[80px]"
                  />
                ) : (
                  <Input
                    value={text}
                    onChange={(e) => handleTextChange(index, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Imagens</Label>
            {images.map((src, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-xs text-muted-foreground">Imagem {index + 1}</Label>
                <div className="flex items-center gap-3">
                  <img
                    src={src}
                    alt={`Preview ${index + 1}`}
                    className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80"
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Alterar Imagem
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(index, file);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="code">
          <AccordionTrigger className="text-sm">Mostrar código</AccordionTrigger>
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
