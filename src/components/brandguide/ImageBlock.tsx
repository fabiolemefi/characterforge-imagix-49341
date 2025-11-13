import { useState, useEffect } from 'react';
import { ImageUploader } from './ImageUploader';

interface ImageBlockProps {
  blockId: string;
  content: {
    image_url: string;
    image_alt?: string;
  };
  isAdmin: boolean;
  onContentChange: (content: any) => void;
}

export const ImageBlock = ({ blockId, content, isAdmin, onContentChange }: ImageBlockProps) => {
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const newContent = {
      ...localContent,
      image_url: url,
      imageFile: file,
    };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  return (
    <div className="w-full">
      <ImageUploader
        imageUrl={localContent.image_url}
        onUpload={handleImageUpload}
        disabled={!isAdmin}
        className="w-full max-w-4xl mx-auto"
      />
    </div>
  );
};
