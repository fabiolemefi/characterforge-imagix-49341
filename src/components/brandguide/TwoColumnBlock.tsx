import { ImageUploader } from './ImageUploader';
import { InlineTextEditor } from './InlineTextEditor';
import { useBrandGuide } from '@/hooks/useBrandGuide';
import { useState } from 'react';

interface TwoColumnBlockProps {
  blockId: string;
  content: {
    columns: Array<{
      image_url: string;
      title: string;
      description: string;
    }>;
  };
  isAdmin: boolean;
}

export const TwoColumnBlock = ({ blockId, content, isAdmin }: TwoColumnBlockProps) => {
  const { updateBlock } = useBrandGuide();
  const [localContent, setLocalContent] = useState(content);

  const handleImageUpload = async (columnIndex: number, url: string) => {
    const newColumns = [...localContent.columns];
    newColumns[columnIndex] = { ...newColumns[columnIndex], image_url: url };
    const newContent = { columns: newColumns };
    setLocalContent(newContent);
    await updateBlock(blockId, newContent);
  };

  const handleTitleChange = async (columnIndex: number, title: string) => {
    const newColumns = [...localContent.columns];
    newColumns[columnIndex] = { ...newColumns[columnIndex], title };
    const newContent = { columns: newColumns };
    setLocalContent(newContent);
    await updateBlock(blockId, newContent);
  };

  const handleDescriptionChange = async (columnIndex: number, description: string) => {
    const newColumns = [...localContent.columns];
    newColumns[columnIndex] = { ...newColumns[columnIndex], description };
    const newContent = { columns: newColumns };
    setLocalContent(newContent);
    await updateBlock(blockId, newContent);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
      {localContent.columns.map((column, index) => (
        <div key={index} className="space-y-4">
          <ImageUploader
            imageUrl={column.image_url}
            onUpload={(url) => handleImageUpload(index, url)}
            disabled={!isAdmin}
          />
          <InlineTextEditor
            value={column.title}
            onChange={(value) => handleTitleChange(index, value)}
            placeholder="Título"
            disabled={!isAdmin}
          />
          <InlineTextEditor
            value={column.description}
            onChange={(value) => handleDescriptionChange(index, value)}
            placeholder="Descrição"
            disabled={!isAdmin}
          />
        </div>
      ))}
    </div>
  );
};
