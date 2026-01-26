import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Underline, Link } from 'lucide-react';

interface HtmlBlockProps {
  html?: string;
  htmlTemplate?: string;
  className?: string;
  [key: string]: any;
}

export const HtmlBlock = ({ html, htmlTemplate, className = '', ...dynamicProps }: HtmlBlockProps) => {
  const { connectors: { connect, drag }, selected, actions: { setProp } } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const template = htmlTemplate || html || '';
  const contentRef = useRef(template);

  // Keep contentRef in sync with props
  useEffect(() => {
    contentRef.current = template;
  }, [template]);

  // Execute formatting command
  const executeCommand = useCallback((e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    e.stopPropagation();
    document.execCommand(command, false, value);
  }, []);

  // Format block (h1, h2, p, etc.)
  const formatBlock = useCallback((e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    document.execCommand('formatBlock', false, tag);
  }, []);

  // Sync changes back to Craft.js state
  const handleChange = useCallback((evt: any) => {
    contentRef.current = evt.target.value;
    setProp((props: any) => {
      props.htmlTemplate = evt.target.value;
      props.html = evt.target.value;
    });
  }, [setProp]);

  const handleFocus = useCallback(() => {
    setShowToolbar(true);
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay hiding toolbar to allow button clicks
    setTimeout(() => {
      setShowToolbar(false);
      setIsEditing(false);
    }, 200);
  }, []);

  // Read-only mode (editor disabled)
  if (!enabled) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: template }}
      />
    );
  }

  return (
    <div
      ref={(ref) => {
        if (ref) {
          connect(drag(ref));
        }
      }}
      className={`relative ${className} ${selected && !isEditing ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      {/* Floating Toolbar */}
      {showToolbar && (
        <div 
          className="absolute -top-12 left-0 z-50 flex gap-0.5 rounded-lg border bg-background p-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'bold')}
            title="Negrito"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'italic')}
            title="Itálico"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'underline')}
            title="Sublinhado"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => formatBlock(e, 'h1')}
            title="Título 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => formatBlock(e, 'h2')}
            title="Título 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'insertUnorderedList')}
            title="Lista com marcadores"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => executeCommand(e, 'insertOrderedList')}
            title="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const url = prompt('Digite a URL do link:');
              if (url) {
                document.execCommand('createLink', false, url);
              }
            }}
            title="Inserir link"
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <ContentEditable
        html={contentRef.current}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="outline-none min-h-[20px]"
        data-no-dnd="true"
      />
    </div>
  );
};

export const HtmlBlockSettings = () => {
  const { actions: { setProp }, ...nodeProps } = useNode((node) => ({
    ...node.data.props,
  }));

  const template = nodeProps.htmlTemplate || nodeProps.html || '';

  // Extract placeholders from template
  const placeholders = React.useMemo(() => {
    const matches = template.match(/\[([^\]]+)\]/g) || [];
    return [...new Set(matches.map((m: string) => m.slice(1, -1)))];
  }, [template]);

  return (
    <div className="space-y-4">
      {/* Template editor */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Código HTML</Label>
        <Textarea
          value={template}
          onChange={(e) => {
            setProp((props: any) => {
              props.htmlTemplate = e.target.value;
              props.html = e.target.value;
            });
          }}
          placeholder="<div>Seu HTML aqui</div>"
          rows={12}
          className="font-mono text-xs bg-[#1e1e1e] text-[#d4d4d4] border-gray-700"
        />
      </div>

      {/* Dynamic fields for each placeholder */}
      {placeholders.length > 0 && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
          <Label className="text-xs text-muted-foreground font-medium">Variáveis do Template</Label>
          {placeholders.map((key: string) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs font-medium">[{key}]</Label>
              <Input
                value={nodeProps[key] || ''}
                onChange={(e) => setProp((props: any) => props[key] = e.target.value)}
                placeholder={`Valor para ${key}`}
                className="text-xs"
              />
            </div>
          ))}
        </div>
      )}

      {/* CSS classes field */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Classes CSS adicionais</Label>
        <Input
          value={nodeProps.className || ''}
          onChange={(e) => setProp((props: any) => props.className = e.target.value)}
          placeholder="my-class another-class"
          className="text-xs"
        />
      </div>
    </div>
  );
};

HtmlBlock.craft = {
  displayName: 'HtmlBlock',
  props: {
    html: '',
    htmlTemplate: '<div class="p-4 bg-gray-100 rounded"><p>Bloco HTML personalizado</p></div>',
    className: '',
  },
  related: {
    settings: HtmlBlockSettings,
  },
};
