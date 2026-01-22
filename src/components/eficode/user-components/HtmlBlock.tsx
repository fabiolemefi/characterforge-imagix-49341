import React, { useMemo } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface HtmlBlockProps {
  html?: string;           // Legacy support
  htmlTemplate?: string;   // Template with [placeholders]
  className?: string;
  [key: string]: any;      // Dynamic props
}

export const HtmlBlock = ({ html, htmlTemplate, className = '', ...dynamicProps }: HtmlBlockProps) => {
  const { connectors: { connect, drag }, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

  // Use htmlTemplate if available, fallback to html for legacy support
  const template = htmlTemplate || html || '';

  // Replace placeholders at runtime
  const renderedHtml = useMemo(() => {
    let result = template;
    for (const [key, value] of Object.entries(dynamicProps)) {
      if (key !== 'className') {
        result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), String(value ?? ''));
      }
    }
    return result;
  }, [template, dynamicProps]);

  return (
    <div
      ref={(ref) => {
        if (ref) {
          connect(drag(ref));
        }
      }}
      className={`${className} ${selected && enabled ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

export const HtmlBlockSettings = () => {
  const { actions: { setProp }, ...nodeProps } = useNode((node) => ({
    ...node.data.props,
  }));

  const template = nodeProps.htmlTemplate || nodeProps.html || '';

  // Extract placeholders from template
  const placeholders = useMemo(() => {
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
              props.html = e.target.value; // Keep legacy field in sync
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
  displayName: 'Bloco HTML',
  props: {
    html: '',
    htmlTemplate: '<div class="p-4 bg-gray-100 rounded"><p>Bloco HTML personalizado</p></div>',
    className: '',
  },
  related: {
    settings: HtmlBlockSettings,
  },
};
