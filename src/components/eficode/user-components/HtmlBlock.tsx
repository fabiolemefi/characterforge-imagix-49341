import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, Library, Loader2, Cloud } from 'lucide-react';
import { ImagePickerModal } from '@/components/eficode/ImagePickerModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendToExtension, checkExtensionInstalled } from '@/lib/extensionProxy';
import { IframePreview } from './IframePreview';

// Helper to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:xxx;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

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
  const [uploadingToMC, setUploadingToMC] = useState(false);
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

  const handleSendToContentBuilder = async () => {
    setUploadingToMC(true);
    try {
      // Check if extension is connected
      const isConnected = await checkExtensionInstalled();
      if (!isConnected) {
        toast.error('Extensão SFMC não conectada');
        return;
      }

      // Fetch image with better error handling
      let blob: Blob;
      try {
        const response = await fetch(src, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        blob = await response.blob();
      } catch (fetchError) {
        console.error('Fetch failed for image:', src, fetchError);
        toast.error('Não foi possível acessar a imagem. Verifique se a URL é válida e acessível.');
        return;
      }
      
      const base64 = await blobToBase64(blob);
      
      // Detect extension from URL or blob type - includes .jpe support
      const urlExtension = src.split('.').pop()?.toLowerCase().split('?')[0] || '';
      const blobType = blob.type.split('/')[1] || 'png';
      const validExtensions = ['jpg', 'jpeg', 'jpe', 'png', 'gif'];
      let extension = validExtensions.includes(urlExtension) ? urlExtension : blobType;
      
      // Normalize jpe to jpeg for SFMC compatibility
      if (extension === 'jpe') extension = 'jpeg';
      
      let assetTypeId = 28; // png default
      if (extension === 'jpg' || extension === 'jpeg') assetTypeId = 22;
      else if (extension === 'gif') assetTypeId = 23;
      
      // Generate unique name with normalized extension
      const timestamp = Date.now();
      const normalizedExt = extension === 'jpeg' ? 'jpg' : extension;
      const fileName = `eficode_${timestamp}.${normalizedExt}`;
      const customerKey = `img_${timestamp.toString(36)}`;
      
      const imagePayload = {
        assetType: { name: normalizedExt, id: assetTypeId },
        name: fileName,
        file: base64,
        category: { id: 93941 }, // Default image category
        customerKey,
        fileProperties: { fileName, extension: normalizedExt }
      };
      
      // Send to SFMC
      const result = await sendToExtension('UPLOAD_ASSET', imagePayload);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar para Content Builder');
      }
      
      // Get SFMC URL
      const sfmcUrl = result.assetUrl || result.data?.fileProperties?.publishedURL;
      
      if (sfmcUrl) {
        onReplace(sfmcUrl);
        toast.success('Imagem enviada para o Content Builder!');
      } else {
        toast.warning('Upload realizado, mas URL não retornada');
      }
    } catch (error: any) {
      console.error('Erro ao enviar para Content Builder:', error);
      toast.error(error.message || 'Erro ao enviar para Content Builder');
    } finally {
      setUploadingToMC(false);
    }
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
              disabled={uploading || uploadingToMC}
              title="Upload de arquivo"
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
              disabled={uploading || uploadingToMC}
              title="Biblioteca de imagens"
            >
              <Library className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleSendToContentBuilder}
              disabled={uploading || uploadingToMC || hasError}
              title={hasError 
                ? "Imagem não carregou - verifique a URL" 
                : "Enviar para Content Builder"
              }
            >
              {uploadingToMC ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Cloud className="h-3 w-3" />
              )}
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

// Função para normalizar HTML - remove formatação extra do contentEditable
const normalizeHtml = (html: string): string => {
  return html
    .replace(/\n\s*\n+/g, '\n')           // Remover linhas em branco consecutivas
    .replace(/^\s+|\s+$/g, '')             // Trim início e fim
    .replace(/>\s{2,}</g, '> <')           // Normalizar espaços entre tags (manter 1)
    .replace(/\s+$/gm, '');                // Remover espaços no final de cada linha
};

export const HtmlBlock = ({ className = '' }: HtmlBlockProps) => {
  // Observar props como objeto completo para garantir reatividade em todas as mudanças
  const { 
    connectors: { connect, drag }, 
    selected, 
    actions: { setProp }, 
    id,
    props: nodeProps
  } = useNode((state) => ({
    selected: state.events.selected,
    props: state.data.props,
  }));
  const { enabled, actions: editorActions } = useEditor((state) => ({ 
    enabled: state.options.enabled 
  }));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const wasEditingRef = useRef(false); // Rastrear estado de edição independente do ciclo React
  const processingEditEnd = useRef(false);
  
  // Manter ref sincronizada com estado
  useEffect(() => {
    wasEditingRef.current = isEditing;
  }, [isEditing]);
  
  // Extrair valores de nodeProps para reatividade correta
  const html = nodeProps?.html;
  const htmlTemplate = nodeProps?.htmlTemplate;
  const template = htmlTemplate || html || '';
  
  // Ref para guardar o template antes de começar a editar
  const originalTemplateRef = useRef<string>(template);

  // Handler para iniciar edição - defensivo para aceitar evento opcional (postMessage não passa evento)
  const handleContainerClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation(); // Impedir propagação que pode causar re-renders no editor
    
    // Capturar scroll antes de qualquer ação para evitar scroll jump
    const scrollContainer = document.querySelector('main.overflow-auto');
    const scrollTop = scrollContainer?.scrollTop || 0;
    
    // Primeiro, selecionar o nó no Craft.js para abrir o painel de propriedades
    if (enabled && !selected) {
      editorActions.selectNode(id);
    }
    
    // Depois, se já estava selecionado, ativar modo de edição inline
    if (enabled && selected && !isEditing) {
      originalTemplateRef.current = template;
      wasEditingRef.current = true; // Marcar antes do state para garantir captura
      setIsEditing(true);
      
      // Ativar edição IMEDIATAMENTE via postMessage (não esperar useEffect)
      requestAnimationFrame(() => {
        const iframe = containerRef.current?.querySelector('iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            { type: 'eficode-set-editable', editable: true },
            '*'
          );
        }
      });
    }
    
    // Restaurar scroll após micro-tarefa (após React processar)
    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
    });
  }, [enabled, selected, isEditing, template, editorActions, id]);

  // Handler para finalizar edição - mais defensivo
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Evitar blur se o foco foi para dentro do mesmo container
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    
    if (isEditing && containerRef.current) {
      const rawHtml = containerRef.current.innerHTML;
      
      // Verificar se não está vazio ou é apenas whitespace
      if (!rawHtml || rawHtml.trim() === '') {
        setIsEditing(false);
        return;
      }
      
      const newHtml = normalizeHtml(rawHtml);
      const currentNormalized = normalizeHtml(originalTemplateRef.current);
      
      // Só atualiza se realmente mudou
      if (newHtml && newHtml !== currentNormalized) {
        setProp((props: any) => {
          props.htmlTemplate = newHtml;
          props.html = newHtml;
        });
      }
    }
    setIsEditing(false);
  }, [isEditing, setProp]);

  // Desativar edição quando desseleciona
  useEffect(() => {
    if (!selected) {
      setIsEditing(false);
    }
  }, [selected]);

  // Handler para mudanças de HTML vindas do IframePreview em modo editável
  const handleIframeHtmlChange = useCallback((newHtml: string) => {
    // Atualização em tempo real durante edição (opcional)
  }, []);

  // Handler para quando a edição no iframe termina - com proteção contra duplicatas
  const handleIframeEditEnd = useCallback((newHtml: string) => {
    // Ignorar se já estamos processando
    if (processingEditEnd.current) return;
    
    // Usar wasEditingRef para verificar (não depender do state que pode estar desatualizado)
    if (!wasEditingRef.current && !isEditing) return;
    
    processingEditEnd.current = true;
    wasEditingRef.current = false; // Reset
    
    if (newHtml) {
      const normalized = normalizeHtml(newHtml);
      const currentNormalized = normalizeHtml(template);
      
      if (normalized !== currentNormalized) {
        setProp((props: any) => {
          props.htmlTemplate = normalized;
          props.html = normalized;
        });
      }
    }
    setIsEditing(false);
    
    // Reset flag após um tempo seguro
    setTimeout(() => {
      processingEditEnd.current = false;
    }, 200);
  }, [template, setProp, isEditing]);

  return (
    <div
      ref={(ref) => {
        containerRef.current = ref;
        if (ref && enabled) {
          connect(drag(ref));
        }
      }}
      className={`relative w-full ${className}`}
    >
      <IframePreview
        html={template}
        editable={isEditing}
        onClick={handleContainerClick}
        onHtmlChange={handleIframeHtmlChange}
        onEditEnd={handleIframeEditEnd}
        minHeight={0}
      />
    </div>
  );
};


export const HtmlBlockSettings = () => {
  const { actions: { setProp }, ...nodeProps } = useNode((node) => ({
    ...node.data.props,
  }));

  const propsTemplate = nodeProps.htmlTemplate || nodeProps.html || '';

  // Local state for controlled textarea - fixes async Craft.js state race condition
  const [localTemplate, setLocalTemplate] = useState(propsTemplate);
  const isInternalUpdate = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync from Craft.js props to local state (only for external changes like image replacement)
  useEffect(() => {
    if (!isInternalUpdate.current) {
      setLocalTemplate(propsTemplate);
    }
    isInternalUpdate.current = false;
  }, [propsTemplate]);

  // Handle textarea change with debounced Craft.js sync
  const handleTemplateChange = useCallback((value: string) => {
    setLocalTemplate(value);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce the Craft.js update
    debounceRef.current = setTimeout(() => {
      isInternalUpdate.current = true;
      setProp((props: any) => {
        props.htmlTemplate = value;
        props.html = value;
      });
    }, 300);
  }, [setProp]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Extract images from template (use local for immediate UI feedback)
  const images = React.useMemo(() => extractImagesFromHtml(localTemplate), [localTemplate]);

  // Extract placeholders from template
  const placeholders = React.useMemo(() => {
    const matches = localTemplate.match(/\[([^\]]+)\]/g) || [];
    return [...new Set(matches.map((m: string) => m.slice(1, -1)))];
  }, [localTemplate]);

  // Handler to replace image URL in HTML - updates local state directly
  const handleReplaceImage = useCallback((oldSrc: string, newSrc: string) => {
    const newTemplate = replaceImageSrc(localTemplate, oldSrc, newSrc);
    setLocalTemplate(newTemplate);
    
    // Immediately update Craft.js for image replacements
    isInternalUpdate.current = true;
    setProp((props: any) => {
      props.htmlTemplate = newTemplate;
      props.html = newTemplate;
    });
  }, [localTemplate, setProp]);

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

      {/* Template editor - uses local state for immediate feedback */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Código HTML</Label>
        <Textarea
          value={localTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
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
