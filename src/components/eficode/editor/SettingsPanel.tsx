import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Settings, Info, Image, Code, RefreshCw } from 'lucide-react';
import { useEfiCodeEditorStore } from '@/stores/efiCodeEditorStore';
import { ImagePickerModal } from '@/components/eficode/ImagePickerModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface UniqueBlockImage {
  src: string;
  alt: string;
  count: number;
}

// Extract unique images from HTML (agrupadas por URL)
const extractUniqueImages = (html: string): UniqueBlockImage[] => {
  const imageMap = new Map<string, UniqueBlockImage>();
  const imgRegex = /<img\s+[^>]*?src=(["'])([^"']*)\1[^>]*>/gi;
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const src = match[2];
    const altMatch = fullMatch.match(/alt=(["'])([^"']*)\1/i);
    const alt = altMatch ? altMatch[2] : '';
    
    if (imageMap.has(src)) {
      imageMap.get(src)!.count++;
    } else {
      imageMap.set(src, { src, alt, count: 1 });
    }
  }
  
  return Array.from(imageMap.values());
};

// Replace ALL occurrences of an image URL in HTML
const replaceAllImageOccurrences = (html: string, oldSrc: string, newSrc: string): string => {
  // Escape special regex characters in URL
  const escapedSrc = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Replace all occurrences of the old src with the new one
  const regex = new RegExp(`(<img\\s+[^>]*?src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
  return html.replace(regex, `$1${newSrc}$2`);
};

export const SettingsPanel = () => {
  const { selectedBlockId, blocks, updateBlockHtml } = useEfiCodeEditorStore();
  
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [editingSrc, setEditingSrc] = useState<string | null>(null);
  const [htmlEditorOpen, setHtmlEditorOpen] = useState(false);
  const [tempHtml, setTempHtml] = useState('');
  
  // Get selected block info
  const selectedBlock = selectedBlockId 
    ? blocks.find(b => b.id === selectedBlockId) 
    : null;

  // Extract unique images from selected block
  const blockImages = useMemo(() => {
    if (!selectedBlock) return [];
    return extractUniqueImages(selectedBlock.html);
  }, [selectedBlock]);

  // Handle image replacement - replaces ALL occurrences of the same URL
  const handleImageSelect = (image: { url: string; name?: string }) => {
    console.log('[SettingsPanel] Selecionando imagem:', image.url);
    
    if (selectedBlock && editingSrc !== null) {
      const originalHtml = selectedBlock.html;
      const newHtml = replaceAllImageOccurrences(originalHtml, editingSrc, image.url);
      
      console.log('[SettingsPanel] Old src:', editingSrc);
      console.log('[SettingsPanel] New src:', image.url);
      console.log('[SettingsPanel] HTML changed:', originalHtml !== newHtml);
      
      if (originalHtml !== newHtml) {
        updateBlockHtml(selectedBlock.id, newHtml);
        toast.success('Imagem atualizada em todas as ocorrências!');
      } else {
        console.error('[SettingsPanel] ERRO: HTML não foi modificado!');
        toast.error('Erro ao atualizar imagem');
      }
    }
    
    setImagePickerOpen(false);
    setEditingSrc(null);
  };

  // Open image picker for specific image URL
  const openImagePicker = (src: string) => {
    setEditingSrc(src);
    setImagePickerOpen(true);
  };

  // Open HTML editor
  const openHtmlEditor = () => {
    if (selectedBlock) {
      setTempHtml(selectedBlock.html);
      setHtmlEditorOpen(true);
    }
  };

  // Save HTML from editor
  const saveHtml = () => {
    if (selectedBlock) {
      updateBlockHtml(selectedBlock.id, tempHtml);
      setHtmlEditorOpen(false);
      toast.success('HTML atualizado!');
    }
  };

  // Extract preview text from HTML
  const getPreviewText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.trim().substring(0, 100) || 'Bloco HTML';
  };

  // Se um bloco está selecionado, mostrar suas informações e propriedades
  if (selectedBlock) {
    return (
      <div className="border-t bg-muted/30">
        <ScrollArea className="h-full max-h-[400px]">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Propriedades
              </h3>
            </div>
            
            {/* Block Info */}
            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Posição</span>
                <p className="text-sm font-medium">Bloco {selectedBlock.order + 1} de {blocks.length}</p>
              </div>
              
              <div>
                <span className="text-xs text-muted-foreground">Conteúdo</span>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {getPreviewText(selectedBlock.html)}
                </p>
              </div>
            </div>

            {/* Images Section */}
            {blockImages.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Imagens ({blockImages.length})
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {blockImages.map((img) => (
                    <div 
                      key={img.src}
                      className="relative group border rounded-md overflow-hidden bg-secondary/50"
                    >
                      {/* Badge showing count if image appears multiple times */}
                      {img.count > 1 && (
                        <span className="absolute top-1 right-1 z-10 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
                          {img.count}x
                        </span>
                      )}
                      
                      <div className="aspect-square flex items-center justify-center p-1">
                        <img 
                          src={img.src} 
                          alt={img.alt || 'Imagem do bloco'}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                          }}
                        />
                      </div>
                      
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-background/80 h-full rounded-none"
                        onClick={() => openImagePicker(img.src)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Trocar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={openHtmlEditor}
              >
                <Code className="h-4 w-4 mr-2" />
                Editar HTML
              </Button>
            </div>
            
            {/* Help */}
            <div className="pt-2 border-t">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p>
                  Clique duas vezes no bloco para editar o texto diretamente. Use o painel para trocar imagens.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Image Picker Modal */}
        <ImagePickerModal
          open={imagePickerOpen}
          onOpenChange={setImagePickerOpen}
          onSelectImage={handleImageSelect}
        />

        {/* HTML Editor Modal */}
        <Dialog open={htmlEditorOpen} onOpenChange={setHtmlEditorOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Editar HTML do Bloco</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden">
              <Textarea
                value={tempHtml}
                onChange={(e) => setTempHtml(e.target.value)}
                className="font-mono text-sm h-[400px] resize-none"
                placeholder="Cole ou edite o HTML aqui..."
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setHtmlEditorOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveHtml}>
                Salvar HTML
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Se nenhum bloco está selecionado, mostrar mensagem
  return (
    <div className="border-t bg-muted/30">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Propriedades
          </h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Selecione um bloco na lista ou no preview para ver suas propriedades e editar imagens.
        </p>
      </div>
    </div>
  );
};
