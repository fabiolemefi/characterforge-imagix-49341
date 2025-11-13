import { InlineTextEditor } from './InlineTextEditor';
import { useState, useEffect } from 'react';

interface TitleOnlyBlockProps {
  blockId: string;
  content: {
    title: string;
  };
  isAdmin: boolean;
  onContentChange: (content: any) => void;
}

export const TitleOnlyBlock = ({ blockId, content, isAdmin, onContentChange }: TitleOnlyBlockProps) => {
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleTitleChange = (title: string) => {
    const newContent = { ...localContent, title };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  return (
    <div className="w-full max-w-4xl my-8">
      <InlineTextEditor
        value={localContent.title || ''}
        onChange={handleTitleChange}
        placeholder="Título"
        disabled={!isAdmin}
      />
    </div>
  );
};
