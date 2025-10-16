import { ImageUploader } from './ImageUploader';
import { InlineTextEditor } from './InlineTextEditor';
import { useState } from 'react';

interface SingleColumnBlockProps {
  blockId: string;
  content: {
    title: string;
    subtitle: string;
    media_type: 'image' | 'video' | 'embed';
    media_url: string;
    media_alt?: string;
  };
  isAdmin: boolean;
  onContentChange: (content: any) => void;
}

export const SingleColumnBlock = ({ blockId, content, isAdmin, onContentChange }: SingleColumnBlockProps) => {
  const [localContent, setLocalContent] = useState(content);

  const handleImageUpload = async (file: File) => {
    const newContent = { ...localContent, media_url: URL.createObjectURL(file), imageFile: file };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  const handleTitleChange = (title: string) => {
    const newContent = { ...localContent, title };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  const handleSubtitleChange = (subtitle: string) => {
    const newContent = { ...localContent, subtitle };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  if (localContent.media_type === 'video' && localContent.media_url) {
    return (
      <div className="w-full max-w-4xl mx-auto my-8">
        <video
          src={localContent.media_url}
          controls
          className="w-full rounded-lg"
        >
          Seu navegador não suporta o elemento de vídeo.
        </video>
      </div>
    );
  }

  if (localContent.media_type === 'embed' && localContent.media_url) {
    return (
      <div className="w-full max-w-4xl mx-auto my-8">
        <div className="aspect-video">
          <iframe
            src={localContent.media_url}
            className="w-full h-full rounded-lg"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-4">
      <InlineTextEditor
        value={localContent.title || ''}
        onChange={handleTitleChange}
        placeholder="Título"
        disabled={!isAdmin}
      />
      <InlineTextEditor
        value={localContent.subtitle || ''}
        onChange={handleSubtitleChange}
        placeholder="Subtítulo"
        disabled={!isAdmin}
      />
      <ImageUploader
        imageUrl={localContent.media_url}
        onUpload={handleImageUpload}
        disabled={!isAdmin}
        className="w-full"
      />
    </div>
  );
};
