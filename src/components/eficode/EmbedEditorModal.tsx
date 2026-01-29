import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video } from 'lucide-react';

interface EmbedEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSrc: string;
  onSave: (newSrc: string) => void;
}

export const EmbedEditorModal: React.FC<EmbedEditorModalProps> = ({
  open,
  onOpenChange,
  currentSrc,
  onSave,
}) => {
  const [embedUrl, setEmbedUrl] = useState(currentSrc);

  useEffect(() => {
    setEmbedUrl(currentSrc);
  }, [currentSrc, open]);

  const handleSave = () => {
    if (embedUrl.trim()) {
      onSave(embedUrl.trim());
      onOpenChange(false);
    }
  };

  // Extract video ID and convert to embed URL if needed
  const normalizeEmbedUrl = (url: string): string => {
    // YouTube watch URL to embed
    const youtubeWatchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeWatchMatch) {
      return `https://www.youtube.com/embed/${youtubeWatchMatch[1]}`;
    }
    
    // Vimeo URL to embed
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && !url.includes('/video/')) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    return url;
  };

  const handleNormalizeUrl = () => {
    setEmbedUrl(normalizeEmbedUrl(embedUrl));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Editar Vídeo Embed
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="embed-url">URL do Embed</Label>
            <div className="flex gap-2">
              <Input
                id="embed-url"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleNormalizeUrl}
                title="Converter URL para formato embed"
              >
                Converter
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole a URL do YouTube, Vimeo ou outro serviço de embed. Clique em "Converter" para transformar URLs normais em URLs de embed.
            </p>
          </div>

          {/* Preview */}
          {embedUrl && (
            <div className="space-y-2">
              <Label>Prévia</Label>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Embed preview"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!embedUrl.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
