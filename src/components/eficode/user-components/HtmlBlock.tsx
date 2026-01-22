import React, { useRef, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface HtmlBlockProps {
  html: string;
  className?: string;
}

export const HtmlBlock = ({ html, className = '' }: HtmlBlockProps) => {
  const { connectors: { connect, drag }, selected, actions: { setProp } } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Re-render HTML when it changes
      containerRef.current.innerHTML = html;
    }
  }, [html]);

  return (
    <div
      ref={(ref) => {
        if (ref) {
          connect(drag(ref));
          containerRef.current = ref;
        }
      }}
      className={`${className} ${selected && enabled ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const HtmlBlockSettings = () => {
  const { actions: { setProp }, html, className } = useNode((node) => ({
    html: node.data.props.html,
    className: node.data.props.className,
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Código HTML</Label>
        <Textarea
          value={html}
          onChange={(e) => setProp((props: HtmlBlockProps) => props.html = e.target.value)}
          placeholder="<div>Seu HTML aqui</div>"
          rows={12}
          className="font-mono text-xs bg-[#1e1e1e] text-[#d4d4d4] border-gray-700"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Classes CSS</Label>
        <Input
          value={className}
          onChange={(e) => setProp((props: HtmlBlockProps) => props.className = e.target.value)}
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
    html: '<div class="p-4 bg-gray-100 rounded"><p>Bloco HTML personalizado</p></div>',
    className: '',
  },
  related: {
    settings: HtmlBlockSettings,
  },
};
