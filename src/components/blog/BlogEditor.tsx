import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Heading1, Heading2, Image, Video, List, ListOrdered, Link } from 'lucide-react';

interface BlogEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const BlogEditor = ({ value, onChange, placeholder }: BlogEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
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

  const insertImage = () => {
    const url = prompt('Digite a URL da imagem:');
    if (url) {
      executeCommand('insertImage', url);
    }
  };

  const insertYouTubeEmbed = () => {
    const url = prompt('Digite a URL do vídeo do YouTube:');
    if (url) {
      let videoId = '';
      
      // Extract video ID from different YouTube URL formats
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0] || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0] || '';
      }

      if (videoId) {
        const iframe = `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; margin: 1rem 0;"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        document.execCommand('insertHTML', false, iframe);
      } else {
        alert('URL do YouTube inválida');
      }
    }
  };

  const insertLink = () => {
    const url = prompt('Digite a URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-2 border-b flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('bold')}
          className="h-8 w-8 p-0"
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('italic')}
          className="h-8 w-8 p-0"
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatBlock('h1')}
          className="h-8 w-8 p-0"
          title="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatBlock('h2')}
          className="h-8 w-8 p-0"
          title="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertUnorderedList')}
          className="h-8 w-8 p-0"
          title="Lista"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertOrderedList')}
          className="h-8 w-8 p-0"
          title="Lista Numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          className="h-8 w-8 p-0"
          title="Inserir Link"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertImage}
          className="h-8 w-8 p-0"
          title="Inserir Imagem"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertYouTubeEmbed}
          className="h-8 w-8 p-0"
          title="Inserir Vídeo do YouTube"
        >
          <Video className="h-4 w-4" />
        </Button>
      </div>
      
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="prose prose-sm max-w-none min-h-[400px] p-4 focus:outline-none bg-background [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2 [&_li]:my-1 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4 [&_a]:text-primary [&_a]:underline"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
};
