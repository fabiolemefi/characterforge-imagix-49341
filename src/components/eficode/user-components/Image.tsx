import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, ImageIcon } from 'lucide-react';
import { ImagePickerModal } from '@/components/eficode/ImagePickerModal';
import { EfiLibraryImage } from '@/hooks/useEfiImageLibrary';

interface ImageProps {
  src?: string;
  alt?: string;
  width?: string;
  height?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  borderRadius?: number;
}

export const Image = ({
  src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Imagem',
  alt = 'Imagem',
  width = '100%',
  height = 'auto',
  objectFit = 'cover',
  borderRadius = 0,
}: ImageProps) => {
  const { connectors: { connect, drag }, isActive } = useNode((node) => ({
    isActive: node.events.selected,
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        border: isActive ? '2px dashed #3b82f6' : '2px dashed transparent',
        padding: '2px',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width,
          height,
          objectFit,
          borderRadius,
          display: 'block',
        }}
      />
    </div>
  );
};

export const ImageSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));
  const [uploading, setUploading] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('efi-code-assets')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('efi-code-assets')
        .getPublicUrl(fileName);

      setProp((props: ImageProps) => props.src = urlData.publicUrl);
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFromLibrary = (image: EfiLibraryImage) => {
    setProp((props: ImageProps) => {
      props.src = image.url;
      if (image.alt_text) {
        props.alt = image.alt_text;
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground text-center">
            {uploading ? 'Enviando...' : 'Upload'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        
        <button
          onClick={() => setIsPickerOpen(true)}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground text-center">Biblioteca</span>
        </button>
      </div>

      <ImagePickerModal
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onSelectImage={handleSelectFromLibrary}
      />
      <div>
        <label className="text-sm font-medium">URL da Imagem</label>
        <input
          type="text"
          value={props.src || ''}
          onChange={(e) => setProp((props: ImageProps) => props.src = e.target.value)}
          className="w-full border rounded p-2"
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="text-sm font-medium">Texto Alternativo (alt)</label>
        <input
          type="text"
          value={props.alt || 'Imagem'}
          onChange={(e) => setProp((props: ImageProps) => props.alt = e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Largura</label>
        <input
          type="text"
          value={props.width || '100%'}
          onChange={(e) => setProp((props: ImageProps) => props.width = e.target.value)}
          className="w-full border rounded p-2"
          placeholder="100%, 300px, auto"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Altura</label>
        <input
          type="text"
          value={props.height || 'auto'}
          onChange={(e) => setProp((props: ImageProps) => props.height = e.target.value)}
          className="w-full border rounded p-2"
          placeholder="auto, 200px"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Object Fit</label>
        <select
          value={props.objectFit || 'cover'}
          onChange={(e) => setProp((props: ImageProps) => props.objectFit = e.target.value as ImageProps['objectFit'])}
          className="w-full border rounded p-2"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
          <option value="none">None</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Border Radius (px)</label>
        <input
          type="range"
          min="0"
          max="50"
          value={props.borderRadius || 0}
          onChange={(e) => setProp((props: ImageProps) => props.borderRadius = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.borderRadius}px</span>
      </div>
    </div>
  );
};

Image.craft = {
  displayName: 'Imagem',
  props: {
    src: 'https://placehold.co/600x400/e2e8f0/64748b?text=Imagem',
    alt: 'Imagem',
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
    borderRadius: 0,
  },
  related: {
    settings: ImageSettings,
  },
};
