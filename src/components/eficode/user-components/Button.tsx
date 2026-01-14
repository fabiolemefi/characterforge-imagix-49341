import React from 'react';
import { useNode } from '@craftjs/core';

interface ButtonProps {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  fontSize?: number;
  fontWeight?: string;
  href?: string;
  fullWidth?: boolean;
}

export const Button = ({
  text = 'Clique Aqui',
  backgroundColor = '#00809d',
  textColor = '#ffffff',
  borderRadius = 8,
  paddingX = 24,
  paddingY = 12,
  fontSize = 16,
  fontWeight = '600',
  href = '#',
  fullWidth = false,
}: ButtonProps) => {
  const { connectors: { connect, drag }, isActive } = useNode((node) => ({
    isActive: node.events.selected,
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        display: fullWidth ? 'block' : 'inline-block',
        border: isActive ? '1px dashed #3b82f6' : '1px dashed transparent',
        padding: '4px',
      }}
    >
      <a
        href={href}
        style={{
          display: 'inline-block',
          backgroundColor,
          color: textColor,
          borderRadius,
          padding: `${paddingY}px ${paddingX}px`,
          fontSize,
          fontWeight,
          textDecoration: 'none',
          textAlign: 'center',
          cursor: 'pointer',
          width: fullWidth ? '100%' : 'auto',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.preventDefault()}
      >
        {text}
      </a>
    </div>
  );
};

export const ButtonSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Texto do Botão</label>
        <input
          type="text"
          value={props.text || 'Clique Aqui'}
          onChange={(e) => setProp((props: ButtonProps) => props.text = e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Link (href)</label>
        <input
          type="text"
          value={props.href || '#'}
          onChange={(e) => setProp((props: ButtonProps) => props.href = e.target.value)}
          className="w-full border rounded p-2"
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="text-sm font-medium">Cor de Fundo</label>
        <input
          type="color"
          value={props.backgroundColor || '#00809d'}
          onChange={(e) => setProp((props: ButtonProps) => props.backgroundColor = e.target.value)}
          className="w-full h-10 rounded border cursor-pointer"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Cor do Texto</label>
        <input
          type="color"
          value={props.textColor || '#ffffff'}
          onChange={(e) => setProp((props: ButtonProps) => props.textColor = e.target.value)}
          className="w-full h-10 rounded border cursor-pointer"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Border Radius (px)</label>
        <input
          type="range"
          min="0"
          max="32"
          value={props.borderRadius || 8}
          onChange={(e) => setProp((props: ButtonProps) => props.borderRadius = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.borderRadius}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Padding Horizontal (px)</label>
        <input
          type="range"
          min="8"
          max="64"
          value={props.paddingX || 24}
          onChange={(e) => setProp((props: ButtonProps) => props.paddingX = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.paddingX}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Padding Vertical (px)</label>
        <input
          type="range"
          min="4"
          max="32"
          value={props.paddingY || 12}
          onChange={(e) => setProp((props: ButtonProps) => props.paddingY = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.paddingY}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Tamanho da Fonte (px)</label>
        <input
          type="range"
          min="12"
          max="24"
          value={props.fontSize || 16}
          onChange={(e) => setProp((props: ButtonProps) => props.fontSize = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.fontSize}px</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="fullWidth"
          checked={props.fullWidth || false}
          onChange={(e) => setProp((props: ButtonProps) => props.fullWidth = e.target.checked)}
        />
        <label htmlFor="fullWidth" className="text-sm font-medium">Largura Total</label>
      </div>
    </div>
  );
};

Button.craft = {
  displayName: 'Botão',
  props: {
    text: 'Clique Aqui',
    backgroundColor: '#00809d',
    textColor: '#ffffff',
    borderRadius: 8,
    paddingX: 24,
    paddingY: 12,
    fontSize: 16,
    fontWeight: '600',
    href: '#',
    fullWidth: false,
  },
  related: {
    settings: ButtonSettings,
  },
};
