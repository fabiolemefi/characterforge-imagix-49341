import { InlineTextEditor } from './InlineTextEditor';
import { useState, useEffect } from 'react';

interface TextOnlyBlockProps {
  blockId: string;
  content: {
    text: string;
  };
  isAdmin: boolean;
  onContentChange: (content: any) => void;
}

export const TextOnlyBlock = ({ blockId, content, isAdmin, onContentChange }: TextOnlyBlockProps) => {
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleTextChange = (text: string) => {
    const newContent = { ...localContent, text };
    setLocalContent(newContent);
    onContentChange(newContent);
  };

  return (
    <div className="w-full max-w-4xl my-8">
      <InlineTextEditor
        key={blockId}
        value={localContent.text || ''}
        onChange={handleTextChange}
        placeholder="Texto"
        disabled={!isAdmin}
      />
    </div>
  );
};
