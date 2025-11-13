import { useState, useRef } from 'react';
import ContentEditable from 'react-contenteditable';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered } from 'lucide-react';

interface InlineTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const InlineTextEditor = ({ value, onChange, placeholder, disabled }: InlineTextEditorProps) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const contentRef = useRef(value);

  const handleChange = (evt: any) => {
    contentRef.current = evt.target.value;
    onChange(evt.target.value);
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const formatBlock = (tag: string) => {
    document.execCommand('formatBlock', false, tag);
  };

  if (disabled) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: value }}
        className="prose prose-lg max-w-none [&_h1]:text-6xl [&_h1]:font-bold [&_h1]:mb-8 [&_h2]:text-2xl [&_h2]:font-normal [&_h2]:mb-4 [&_h2]:pr-32 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2 [&_li]:my-1"
      />
    );
  }

  return (
    <div className="relative" data-no-dnd="true">
      {showToolbar && (
        <div className="absolute -top-12 left-0 z-50 flex gap-1 rounded-lg border bg-background p-1 shadow-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('bold')}
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('italic')}
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => formatBlock('h1')}
            className="h-8 w-8 p-0"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => formatBlock('h2')}
            className="h-8 w-8 p-0"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('insertUnorderedList')}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('insertOrderedList')}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <ContentEditable
        html={contentRef.current}
        disabled={disabled}
        onChange={handleChange}
        onFocus={() => setShowToolbar(true)}
        onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
        className="prose prose-lg max-w-none min-h-[40px] rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_h1]:text-6xl [&_h1]:font-bold [&_h1]:mb-8 [&_h2]:text-2xl [&_h2]:font-normal [&_h2]:mb-4 [&_h2]:pr-32 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2 [&_li]:my-1"
        tagName="div"
      />
    </div>
  );
};
