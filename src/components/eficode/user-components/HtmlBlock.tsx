import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Underline, Link, ImageIcon, Upload, Library, Loader2 } from 'lucide-react';
import { ImagePickerModal } from '@/components/eficode/ImagePickerModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Placeholder SVG for broken images
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E`;

// Helper functions for image management - filters duplicates
const extractImagesFromHtml = (html: string): { src: string; index: number }[] => {
  const images: { src: string; index: number }[] = [];
  const seenSrcs = new Set<string>();
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  let index = 0;
  
  while ((match = regex.exec(html)) !== null) {
    const src = match[1];
    if (!seenSrcs.has(src)) {
      seenSrcs.add(src);
      images.push({ src, index });
      index++;
    }
  }
  
  return images;
};

const replaceImageSrc = (html: string, oldSrc: string, newSrc: string): string => {
  const escapedOldSrc = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(src=["'])${escapedOldSrc}(["'])`, 'g');
  return html.replace(regex, `$1${newSrc}$2`);
};

const sanitizeFileName = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
};

// Image Item Component for Settings Panel
interface ImageItemProps {
  src: string;
  index: number;
  onReplace: (newUrl: string) => void;
}

const ImageItem = ({ src, index, onReplace }: ImageItemProps) => {
  const [hasError, setHasError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const sanitizedName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ''));
      const fileName = `htmlblock/${Date.now()}_${sanitizedName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('efi-code-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('efi-code-assets')
        .getPublicUrl(fileName);

      onReplace(publicUrl);
      setHasError(false);
      toast.success('Imagem atualizada!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLibrarySelect = (image: { url: string }) => {
    onReplace(image.url);
    setHasError(false);
    setShowLibrary(false);
    toast.success('Imagem atualizada!');
  };

  const displayName = src.split('/').pop()?.substring(0, 25) || `Imagem ${index + 1}`;

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border">
        <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0 border">
          {hasError ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          ) : (
            <img
              src={src}
              alt={`Imagem ${index + 1}`}
              className="w-full h-full object-cover"
              onError={() => setHasError(true)}
            />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate" title={src}>
            {displayName}
          </p>
          {hasError && (
            <p className="text-[10px] text-destructive">Imagem não encontrada</p>
          )}
          <div className="flex gap-1 mt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowLibrary(true)}
              disabled={uploading}
            >
              <Library className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      
      <ImagePickerModal
        open={showLibrary}
        onOpenChange={setShowLibrary}
        onSelectImage={handleLibrarySelect}
      />
    </>
  );
};

interface HtmlBlockProps {
  html?: string;
  htmlTemplate?: string;
  className?: string;
  [key: string]: any;
}

export const HtmlBlock = ({ html, htmlTemplate, className = '', ...dynamicProps }: HtmlBlockProps) => {
  const { connectors: { connect, drag }, selected, actions: { setProp } } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const template = htmlTemplate || html || '';
  const contentRef = useRef(template);

  // Keep contentRef in sync with props
  useEffect(() => {
    contentRef.current = template;
  }, [template]);

  // Handle broken images in the viewport - replace with placeholder
  useEffect(() => {
    if (!containerRef.current || !enabled) return;
    
    const handleImageError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (img.dataset.placeholderApplied) return;
      
      img.dataset.placeholderApplied = 'true';
      img.src = PLACEHOLDER_SVG;
      img.style.backgroundColor = '#f3f4f6';
      img.style.objectFit = 'contain';
      img.style.padding = '20px';
      img.style.minWidth = '60px';
      img.style.minHeight = '60px';
    };
    
    const checkAndSetupImages = () => {
      const images = containerRef.current?.querySelectorAll('img');
      images?.forEach(img => {
        // Check if already broken or not loaded
        if (img.complete && img.naturalHeight === 0 && !img.dataset.placeholderApplied) {
          handleImageError({ target: img } as unknown as Event);
        }
        img.addEventListener('error', handleImageError);
      });
    };
    
    // Initial check
    checkAndSetupImages();
    
    // Re-check when template changes
    const observer = new MutationObserver(checkAndSetupImages);
    observer.observe(containerRef.current, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
      const imgs = containerRef.current?.querySelectorAll('img');
      imgs?.forEach(img => {
        img.removeEventListener('error', handleImageError);
      });
    };
  }, [template, enabled]);

  // Execute formatting command
  const executeCommand = useCallback((e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    e.stopPropagation();
    document.execCommand(command, false, value);
  }, []);

  // Format block (h1, h2, p, etc.)
  const formatBlock = useCallback((e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    document.execCommand('formatBlock', false, tag);
  }, []);

  // Sync changes back to Craft.js state
  const handleChange = useCallback((evt: any) => {
    contentRef.current = evt.target.value;
    setProp((props: any) => {
      props.htmlTemplate = evt.target.value;
      props.html = evt.target.value;
    });
  }, [setProp]);

  const handleFocus = useCallback(() => {
    setShowToolbar(true);
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay hiding toolbar to allow button clicks
    setTimeout(() => {
      setShowToolbar(false);
      setIsEditing(false);
    }, 200);
  }, []);

  // Read-only mode (editor disabled)
  if (!enabled) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: template }}
      />
    );
  }

  return (
    <div
      ref={(ref) => {
        containerRef.current = ref;
        if (ref) {
          connect(drag(ref));
        }
      }}
      className={`relative ${className} ${selected && !isEditing ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      {/* Floating Toolbar */}
      {showToolbar && (
        <div 
          className="absolute -top-12 left-0 z-50 flex gap-0.5 rounded-lg border bg-background p-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'bold')}
            title="Negrito"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'italic')}
            title="Itálico"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'underline')}
            title="Sublinhado"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => formatBlock(e, 'h1')}
            title="Título 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => formatBlock(e, 'h2')}
            title="Título 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'insertUnorderedList')}
            title="Lista com marcadores"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'insertOrderedList')}
            title="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const url = prompt('Digite a URL do link:');
              if (url) {
                document.execCommand('createLink', false, url);
              }
            }}
            title="Inserir link"
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <ContentEditable
        html={contentRef.current}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="outline-none min-h-[20px]"
        data-no-dnd="true"
      />
    </div>
  );
};

export const HtmlBlockSettings = () => {
  const { actions: { setProp }, ...nodeProps } = useNode((node) => ({
    ...node.data.props,
  }));

  const template = nodeProps.htmlTemplate || nodeProps.html || '';

  // Extract images from template
  const images = React.useMemo(() => extractImagesFromHtml(template), [template]);

  // Extract placeholders from template
  const placeholders = React.useMemo(() => {
    const matches = template.match(/\[([^\]]+)\]/g) || [];
    return [...new Set(matches.map((m: string) => m.slice(1, -1)))];
  }, [template]);

  // Handler to replace image URL in HTML
  const handleReplaceImage = (oldSrc: string, newSrc: string) => {
    const newTemplate = replaceImageSrc(template, oldSrc, newSrc);
    setProp((props: any) => {
      props.htmlTemplate = newTemplate;
      props.html = newTemplate;
    });
  };

  return (
    <div className="space-y-4">
      {/* Images Section */}
      {images.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Imagens do Bloco ({images.length})
          </Label>
          <div className="space-y-2">
            {images.map((img, idx) => (
              <ImageItem
                key={`${img.src}-${idx}`}
                src={img.src}
                index={idx}
                onReplace={(newUrl) => handleReplaceImage(img.src, newUrl)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Template editor */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Código HTML</Label>
        <Textarea
          value={template}
          onChange={(e) => {
            setProp((props: any) => {
              props.htmlTemplate = e.target.value;
              props.html = e.target.value;
            });
          }}
          placeholder="<div>Seu HTML aqui</div>"
          rows={12}
          className="font-mono text-xs bg-secondary/50 border-border"
        />
      </div>

      {/* Dynamic fields for each placeholder */}
      {placeholders.length > 0 && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
          <Label className="text-xs text-muted-foreground font-medium">Variáveis do Template</Label>
          {placeholders.map((key: string) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs font-medium">[{key}]</Label>
              <Input
                value={nodeProps[key] || ''}
                onChange={(e) => setProp((props: any) => props[key] = e.target.value)}
                placeholder={`Valor para ${key}`}
                className="text-xs"
              />
            </div>
          ))}
        </div>
      )}

      {/* CSS classes field */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Classes CSS adicionais</Label>
        <Input
          value={nodeProps.className || ''}
          onChange={(e) => setProp((props: any) => props.className = e.target.value)}
          placeholder="my-class another-class"
          className="text-xs"
        />
      </div>
    </div>
  );
};

HtmlBlock.craft = {
  displayName: 'HtmlBlock',
  props: {
    html: '',
    htmlTemplate: '<div class="p-4 bg-gray-100 rounded"><p>Bloco HTML personalizado</p></div>',
    className: '',
  },
  related: {
    settings: HtmlBlockSettings,
  },
};
