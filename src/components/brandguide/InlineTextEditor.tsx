import { useState, useRef, useEffect } from 'react';
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
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsSaving(true);
      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
        setIsSaving(false);
      }, 1000);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const formatBlock = (tag: string) => {
    document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
  };

  if (disabled) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: value }}
        className="prose prose-sm max-w-none"
      />
    );
  }

  return (
    <div className="relative">
      {showToolbar && (
        <div className="absolute -top-12 left-0 z-10 flex gap-1 rounded-lg border bg-background p-1 shadow-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('bold')}
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('italic')}
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatBlock('h1')}
            className="h-8 w-8 p-0"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatBlock('h2')}
            className="h-8 w-8 p-0"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('insertUnorderedList')}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('insertOrderedList')}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={() => setShowToolbar(true)}
        onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
        className="prose prose-sm max-w-none min-h-[40px] rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
      {isSaving && (
        <span className="text-xs text-muted-foreground mt-1">Salvando...</span>
      )}
    </div>
  );
};
