import { ImageUploader } from './ImageUploader';
import { InlineTextEditor } from './InlineTextEditor';
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
  onContentChange: (content: any) => void;
}

export const TwoColumnBlock = ({ blockId, content, isAdmin, onContentChange }: TwoColumnBlockProps) => {
  const [localContent, setLocalContent] = useState(content);

  const handleImageUpload = async (columnIndex: number, file: File) => {
    const newColumns = [...localContent.columns];
    newColumns[columnIndex] = { ...newColumns[columnIndex], image_url: URL.createObjectURL(file), imageFile: file } as any;
    const newContent = { columns: newColumns };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  const handleTitleChange = (columnIndex: number, title: string) => {
    const newColumns = [...localContent.columns];
    newColumns[columnIndex] = { ...newColumns[columnIndex], title };
    const newContent = { columns: newColumns };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  const handleDescriptionChange = (columnIndex: number, description: string) => {
    const newColumns = [...localContent.columns];
    newColumns[columnIndex] = { ...newColumns[columnIndex], description };
    const newContent = { columns: newColumns };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  return (
    <div className="w-full max-w-4xl my-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {localContent.columns.map((column, index) => (
          <div key={index} className="space-y-4 flex flex-col">
            <ImageUploader
              imageUrl={column.image_url}
              onUpload={(file) => handleImageUpload(index, file)}
              disabled={!isAdmin}
              className="w-full"
              aspectRatio="aspect-auto"
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
    </div>
  );
};
