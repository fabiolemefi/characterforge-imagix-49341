import React from 'react';
import { useNode } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';

interface TextProps {
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
}

export const Text = ({
  text = 'Digite seu texto aqui',
  fontSize = 16,
  fontWeight = 'normal',
  color = '#000000',
  textAlign = 'left',
  lineHeight = 1.5,
}: TextProps) => {
  const { connectors: { connect, drag }, actions: { setProp }, isActive } = useNode((node) => ({
    isActive: node.events.selected,
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        cursor: 'move',
        boxShadow: isActive ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none',
      }}
    >
      <ContentEditable
        html={text}
        onChange={(e) => setProp((props: TextProps) => props.text = e.target.value)}
        style={{
          fontSize,
          fontWeight,
          color,
          textAlign,
          lineHeight,
          outline: 'none',
        }}
      />
    </div>
  );
};

export const TextSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Tamanho da Fonte (px)</label>
        <input
          type="range"
          min="12"
          max="72"
          value={props.fontSize || 16}
          onChange={(e) => setProp((props: TextProps) => props.fontSize = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.fontSize}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Peso da Fonte</label>
        <select
          value={props.fontWeight || 'normal'}
          onChange={(e) => setProp((props: TextProps) => props.fontWeight = e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="normal">Normal</option>
          <option value="500">Medium</option>
          <option value="600">Semibold</option>
          <option value="bold">Bold</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Cor do Texto</label>
        <input
          type="color"
          value={props.color || '#000000'}
          onChange={(e) => setProp((props: TextProps) => props.color = e.target.value)}
          className="w-full h-10 rounded border cursor-pointer"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Alinhamento</label>
        <select
          value={props.textAlign || 'left'}
          onChange={(e) => setProp((props: TextProps) => props.textAlign = e.target.value as TextProps['textAlign'])}
          className="w-full border rounded p-2"
        >
          <option value="left">Esquerda</option>
          <option value="center">Centro</option>
          <option value="right">Direita</option>
          <option value="justify">Justificado</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Espaçamento de Linha</label>
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={props.lineHeight || 1.5}
          onChange={(e) => setProp((props: TextProps) => props.lineHeight = parseFloat(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.lineHeight}</span>
      </div>
    </div>
  );
};

Text.craft = {
  displayName: 'Texto',
  props: {
    text: 'Digite seu texto aqui',
    fontSize: 16,
    fontWeight: 'normal',
    color: '#000000',
    textAlign: 'left',
    lineHeight: 1.5,
  },
  related: {
    settings: TextSettings,
  },
};
