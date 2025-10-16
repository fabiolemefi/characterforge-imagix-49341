import { ImageUploader } from './ImageUploader';
import { useBrandGuide } from '@/hooks/useBrandGuide';
import { useState } from 'react';

interface SingleColumnBlockProps {
  blockId: string;
  content: {
    media_type: 'image' | 'video' | 'embed';
    media_url: string;
    media_alt?: string;
  };
  isAdmin: boolean;
}

export const SingleColumnBlock = ({ blockId, content, isAdmin }: SingleColumnBlockProps) => {
  const { updateBlock, uploadAsset } = useBrandGuide();
  const [localContent, setLocalContent] = useState(content);

  const handleImageUpload = async (url: string) => {
    const newContent = { ...localContent, media_url: url };
    setLocalContent(newContent);
    await updateBlock(blockId, newContent);
  };

  const handleVideoUpload = async (file: File) => {
    const url = await uploadAsset(file, 'videos');
    if (url) {
      const newContent = { ...localContent, media_url: url, media_type: 'video' as const };
      setLocalContent(newContent);
      await updateBlock(blockId, newContent);
    }
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
    <div className="w-full max-w-4xl mx-auto my-8">
      <ImageUploader
        imageUrl={localContent.media_url}
        onUpload={handleImageUpload}
        disabled={!isAdmin}
        className="w-full"
      />
    </div>
  );
};
