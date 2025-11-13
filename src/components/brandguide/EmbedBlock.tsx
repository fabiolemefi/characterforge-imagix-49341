import { useState, useEffect } from 'react';
import { InlineTextEditor } from './InlineTextEditor';

interface EmbedBlockProps {
  blockId: string;
  content: {
    embed_url: string;
  };
  isAdmin: boolean;
  onContentChange: (content: any) => void;
}

export const EmbedBlock = ({ blockId, content, isAdmin, onContentChange }: EmbedBlockProps) => {
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleUrlChange = (url: string) => {
    const newContent = { embed_url: url };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // Convert YouTube watch URL to embed URL
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
    const match = url.match(youtubeRegex);
    
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    
    return url;
  };

  return (
    <div className="w-full max-w-4xl">
      {isAdmin ? (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground border border-border rounded p-2">
            <InlineTextEditor
              value={localContent.embed_url || ''}
              onChange={handleUrlChange}
              placeholder="Cole a URL do YouTube aqui..."
              disabled={!isAdmin}
            />
          </div>
          {localContent.embed_url && (
            <div className="aspect-video">
              <iframe
                src={getEmbedUrl(localContent.embed_url)}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      ) : (
        localContent.embed_url && (
          <div className="aspect-video">
            <iframe
              src={getEmbedUrl(localContent.embed_url)}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )
      )}
    </div>
  );
};
