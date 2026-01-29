import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Settings, Info, Image, Code, RefreshCw, Monitor, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
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

interface ImageSource {
  src: string;
  media?: string;  // Ex: "(max-width: 360px)"
  tagType: 'source' | 'img';
  responsiveType?: 'desktop' | 'mobile' | 'universal';
}

interface PictureGroup {
  id: string;
  type: 'picture' | 'responsive-pair' | 'single';
  sources: ImageSource[];
  previewSrc: string;
  alt: string;
}

// Detect responsive type from CSS classes
const getResponsiveType = (classes: string): 'desktop' | 'mobile' | 'universal' => {
  // Desktop: hidden by default, visible on md+ (hidden md:block, hidden lg:block, etc.)
  if (/hidden\s+(sm|md|lg|xl|2xl):block/.test(classes) || 
      /(sm|md|lg|xl|2xl):block\s+hidden/.test(classes) ||
      /hidden\s+(sm|md|lg|xl|2xl):inline/.test(classes) ||
      /(sm|md|lg|xl|2xl):inline\s+hidden/.test(classes)) {
    return 'desktop';
  }
  
  // Mobile: visible by default, hidden on md+ (block md:hidden, etc.)
  if (/block\s+(sm|md|lg|xl|2xl):hidden/.test(classes) || 
      /(sm|md|lg|xl|2xl):hidden\s+block/.test(classes) ||
      /inline\s+(sm|md|lg|xl|2xl):hidden/.test(classes) ||
      /(sm|md|lg|xl|2xl):hidden\s+inline/.test(classes)) {
    return 'mobile';
  }
  
  return 'universal';
};

// Extract picture elements with multiple sources
const extractPictureGroups = (html: string): PictureGroup[] => {
  const groups: PictureGroup[] = [];
  
  // 1. Extract complete <picture> elements
  const pictureRegex = /<picture[^>]*>([\s\S]*?)<\/picture>/gi;
  let pictureMatch;
  let pictureIndex = 0;
  
  while ((pictureMatch = pictureRegex.exec(html)) !== null) {
    const pictureContent = pictureMatch[1];
    const sources: ImageSource[] = [];
    
    // Extract all <source srcset="..."> - handle srcset before or after media
    const sourceRegex = /<source[^>]*>/gi;
    let sourceMatch;
    while ((sourceMatch = sourceRegex.exec(pictureContent)) !== null) {
      const sourceTag = sourceMatch[0];
      
      // Extract srcset
      const srcsetMatch = sourceTag.match(/srcset=(["'])([^"']*)\1/i);
      // Extract media
      const mediaMatch = sourceTag.match(/media=(["'])([^"']*)\1/i);
      
      if (srcsetMatch) {
        sources.push({
          src: srcsetMatch[2],
          media: mediaMatch ? mediaMatch[2] : undefined,
          tagType: 'source'
        });
      }
    }
    
    // Extract the <img> fallback
    const imgMatch = pictureContent.match(/<img[^>]*src=(["'])([^"']*)\1[^>]*>/i);
    if (imgMatch) {
      sources.push({
        src: imgMatch[2],
        media: undefined,
        tagType: 'img'
      });
    }
    
    // Get alt from img
    const altMatch = pictureContent.match(/alt=(["'])([^"']*)\1/i);
    
    if (sources.length > 0) {
      groups.push({
        id: `picture-${pictureIndex}`,
        type: 'picture',
        sources,
        previewSrc: sources.find(s => s.tagType === 'img')?.src || sources[0].src,
        alt: altMatch ? altMatch[2] : ''
      });
    }
    pictureIndex++;
  }
  
  // 2. Extract orphan <img> tags (not inside <picture>)
  const htmlWithoutPictures = html.replace(/<picture[^>]*>[\s\S]*?<\/picture>/gi, '___PICTURE_PLACEHOLDER___');
  const imgRegex = /<img\s+[^>]*?src=(["'])([^"']*)\1[^>]*>/gi;
  const orphanImages: Array<{ src: string; classes: string; alt: string; type: 'desktop' | 'mobile' | 'universal' }> = [];
  
  let match;
  while ((match = imgRegex.exec(htmlWithoutPictures)) !== null) {
    const fullTag = match[0];
    const src = match[2];
    const classMatch = fullTag.match(/class=(["'])([^"']*)\1/i);
    const classes = classMatch ? classMatch[2] : '';
    const altMatch = fullTag.match(/alt=(["'])([^"']*)\1/i);
    const alt = altMatch ? altMatch[2] : '';
    
    const type = getResponsiveType(classes);
    orphanImages.push({ src, classes, alt, type });
  }
  
  // Group consecutive desktop+mobile pairs for orphan images
  const processed = new Set<number>();
  
  for (let i = 0; i < orphanImages.length; i++) {
    if (processed.has(i)) continue;
    
    const current = orphanImages[i];
    const next = orphanImages[i + 1];
    
    // Check if this is a responsive pair
    if (next && !processed.has(i + 1) &&
        ((current.type === 'desktop' && next.type === 'mobile') ||
         (current.type === 'mobile' && next.type === 'desktop'))) {
      const desktopImg = current.type === 'desktop' ? current : next;
      groups.push({
        id: `img-pair-${i}`,
        type: 'responsive-pair',
        sources: [
          { src: current.src, tagType: 'img', responsiveType: current.type },
          { src: next.src, tagType: 'img', responsiveType: next.type }
        ],
        previewSrc: desktopImg.src,
        alt: current.alt || next.alt
      });
      processed.add(i);
      processed.add(i + 1);
    } else {
      // Single image
      groups.push({
        id: `img-single-${i}`,
        type: 'single',
        sources: [{ src: current.src, tagType: 'img', responsiveType: current.type }],
        previewSrc: current.src,
        alt: current.alt
      });
      processed.add(i);
    }
  }
  
  return groups;
};

// Replace ALL occurrences of image URLs in a group
const replaceImageGroup = (html: string, group: PictureGroup, newSrc: string): string => {
  let result = html;
  
  for (const source of group.sources) {
    const escapedSrc = source.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    if (source.tagType === 'source') {
      // Replace srcset in <source>
      const regex = new RegExp(`(<source[^>]*srcset=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
      result = result.replace(regex, `$1${newSrc}$2`);
    } else {
      // Replace src in <img>
      const regex = new RegExp(`(<img[^>]*src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
      result = result.replace(regex, `$1${newSrc}$2`);
    }
  }
  
  return result;
};

// Replace a SINGLE source in a group
const replaceSingleSource = (html: string, source: ImageSource, newSrc: string): string => {
  const escapedSrc = source.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  if (source.tagType === 'source') {
    // Replace srcset in <source>
    const regex = new RegExp(`(<source[^>]*srcset=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
    return html.replace(regex, `$1${newSrc}$2`);
  } else {
    // Replace src in <img>
    const regex = new RegExp(`(<img[^>]*src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
    return html.replace(regex, `$1${newSrc}$2`);
  }
};

// Get label for a source based on its media query or type
const getSourceLabel = (source: ImageSource, idx: number): string => {
  if (source.media) {
    // Extract breakpoint from media query like "(max-width: 360px)"
    const match = source.media.match(/(\d+)px/);
    if (match) {
      return `≤${match[1]}px`;
    }
    return source.media;
  }
  
  if (source.tagType === 'img') {
    return 'Fallback (>1920px)';
  }
  
  if (source.responsiveType === 'desktop') {
    return 'Desktop';
  }
  
  if (source.responsiveType === 'mobile') {
    return 'Mobile';
  }
  
  return `Variação ${idx + 1}`;
};

export const SettingsPanel = () => {
  const { selectedBlockId, blocks, updateBlockHtml } = useEfiCodeEditorStore();
  
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PictureGroup | null>(null);
  const [editingSource, setEditingSource] = useState<ImageSource | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [htmlEditorOpen, setHtmlEditorOpen] = useState(false);
  const [tempHtml, setTempHtml] = useState('');
  
  // Get selected block info
  const selectedBlock = selectedBlockId 
    ? blocks.find(b => b.id === selectedBlockId) 
    : null;

  // Extract responsive image groups from selected block
  const imageGroups = useMemo(() => {
    if (!selectedBlock) return [];
    return extractPictureGroups(selectedBlock.html);
  }, [selectedBlock]);

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Handle image replacement - replaces ALL sources in the group OR a single source
  const handleImageSelect = (image: { url: string; name?: string }) => {
    console.log('[SettingsPanel] Selecionando imagem:', image.url);
    
    if (selectedBlock) {
      const originalHtml = selectedBlock.html;
      let newHtml = originalHtml;
      let message = 'Imagem atualizada!';
      
      if (editingSource && editingGroup) {
        // Individual replacement
        newHtml = replaceSingleSource(originalHtml, editingSource, image.url);
        const label = getSourceLabel(editingSource, 0);
        message = `Imagem ${label} atualizada!`;
      } else if (editingGroup) {
        // Replace all sources in the group
        newHtml = replaceImageGroup(originalHtml, editingGroup, image.url);
        const count = editingGroup.sources.length;
        if (editingGroup.type === 'picture' && count > 1) {
          message = `Imagem atualizada em ${count} breakpoints!`;
        } else if (editingGroup.type === 'responsive-pair') {
          message = 'Imagem atualizada (desktop + mobile)!';
        }
      }
      
      console.log('[SettingsPanel] HTML changed:', originalHtml !== newHtml);
      
      if (originalHtml !== newHtml) {
        updateBlockHtml(selectedBlock.id, newHtml);
        toast.success(message);
      } else {
        console.error('[SettingsPanel] ERRO: HTML não foi modificado!');
        toast.error('Erro ao atualizar imagem');
      }
    }
    
    setImagePickerOpen(false);
    setEditingGroup(null);
    setEditingSource(null);
  };

  // Open image picker for a group
  const openImagePicker = (group: PictureGroup) => {
    setEditingGroup(group);
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

  // Get badge for group type
  const getTypeBadge = (group: PictureGroup) => {
    // Picture with multiple sources (breakpoints)
    if (group.type === 'picture' && group.sources.length > 1) {
      return (
        <span className="absolute top-1 right-1 z-10 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
          {group.sources.length} tamanhos
        </span>
      );
    }
    
    // Responsive pair (desktop + mobile)
    if (group.type === 'responsive-pair') {
      return (
        <span className="absolute top-1 right-1 z-10 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
          <Smartphone className="h-3 w-3" />
          <Monitor className="h-3 w-3" />
        </span>
      );
    }
    
    // Single image with responsive type
    const respType = group.sources[0]?.responsiveType;
    if (respType === 'desktop') {
      return (
        <span className="absolute top-1 right-1 z-10 bg-accent text-accent-foreground text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
          <Monitor className="h-3 w-3" />
        </span>
      );
    }
    if (respType === 'mobile') {
      return (
        <span className="absolute top-1 right-1 z-10 bg-accent text-accent-foreground text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
          <Smartphone className="h-3 w-3" />
        </span>
      );
    }
    return null;
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
            {imageGroups.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Imagens ({imageGroups.length})
                  </span>
                </div>
                
                <div className="space-y-2">
                  {imageGroups.map((group) => {
                    const isExpanded = expandedGroups.has(group.id);
                    const hasMultipleSources = group.sources.length > 1;
                    
                    return (
                      <div 
                        key={group.id}
                        className="border rounded-md overflow-hidden bg-secondary/50"
                      >
                        {/* Header with preview */}
                        <div className="relative p-2">
                          {/* Badge showing responsive type */}
                          {getTypeBadge(group)}
                          
                          <div className="flex items-center gap-2">
                            <img 
                              src={group.previewSrc} 
                              alt={group.alt || 'Imagem do bloco'}
                              className="w-12 h-12 object-contain rounded border bg-background"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                              }}
                            />
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground truncate">
                                {hasMultipleSources ? `${group.sources.length} tamanhos` : 'Imagem única'}
                              </p>
                              {group.alt && (
                                <p className="text-xs text-muted-foreground/70 truncate">{group.alt}</p>
                              )}
                            </div>
                            
                            {hasMultipleSources && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => toggleGroupExpansion(group.id)}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                          
                          {/* Button to replace all */}
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full mt-2"
                            onClick={() => openImagePicker(group)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            {hasMultipleSources ? 'Trocar todas' : 'Trocar'}
                          </Button>
                        </div>
                        
                        {/* Expanded list of individual sources */}
                        {isExpanded && hasMultipleSources && (
                          <div className="border-t bg-background/50 p-2 space-y-1.5">
                            {group.sources.map((source, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-2 p-1.5 rounded bg-secondary/30"
                              >
                                <img 
                                  src={source.src}
                                  alt={`Breakpoint ${idx + 1}`}
                                  className="w-8 h-8 object-contain rounded border bg-background"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
                                  }}
                                />
                                
                                <span className="flex-1 text-xs font-medium truncate">
                                  {getSourceLabel(source, idx)}
                                </span>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setEditingSource(source);
                                    setEditingGroup(group);
                                    setImagePickerOpen(true);
                                  }}
                                >
                                  Trocar
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" /> Desktop
                  </span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-3 w-3" /> Mobile
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="flex items-center text-primary">
                      <Smartphone className="h-3 w-3" />
                      <Monitor className="h-3 w-3" />
                    </span> Par responsivo
                  </span>
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
                  Clique duas vezes no bloco para editar o texto. Imagens com ícones 📱💻 são pares responsivos e serão trocadas juntas.
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
