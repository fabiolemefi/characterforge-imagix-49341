import { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoBlockProps {
  blockId: string;
  content: {
    video_url: string;
  };
  isAdmin: boolean;
  onContentChange: (content: any) => void;
}

export const VideoBlock = ({ blockId, content, isAdmin, onContentChange }: VideoBlockProps) => {
  const [localContent, setLocalContent] = useState(content);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Por favor, selecione um arquivo de vídeo válido');
      return;
    }

    const videoUrl = URL.createObjectURL(file);
    const newContent = {
      video_url: videoUrl,
      videoFile: file,
    };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {localContent.video_url ? (
        <div className="relative group">
          <video 
            src={localContent.video_url} 
            controls 
            className="w-full rounded-lg"
          >
            Seu navegador não suporta o elemento de vídeo.
          </video>
          {isAdmin && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Alterar Vídeo
            </Button>
          )}
        </div>
      ) : (
        isAdmin && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Clique para fazer upload de um vídeo MP4</p>
          </div>
        )
      )}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          onChange={handleVideoUpload}
          className="hidden"
        />
      )}
    </div>
  );
};
