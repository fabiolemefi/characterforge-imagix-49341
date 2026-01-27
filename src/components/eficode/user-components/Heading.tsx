import React from 'react';
import { useNode } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';

interface HeadingProps {
  text?: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
}

const fontSizes: Record<string, number> = {
  h1: 36,
  h2: 30,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
};

export const Heading = ({
  text = 'Título',
  level = 'h2',
  color = '#1d1d1d',
  textAlign = 'left',
}: HeadingProps) => {
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
        onChange={(e) => setProp((props: HeadingProps) => props.text = e.target.value)}
        tagName={level}
        style={{
          fontSize: fontSizes[level],
          fontWeight: 'bold',
          color,
          textAlign,
          margin: 0,
          outline: 'none',
        }}
      />
    </div>
  );
};

export const HeadingSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nível do Título</label>
        <select
          value={props.level || 'h2'}
          onChange={(e) => setProp((props: HeadingProps) => props.level = e.target.value as HeadingProps['level'])}
          className="w-full border rounded p-2"
        >
          <option value="h1">H1 - Principal</option>
          <option value="h2">H2 - Seção</option>
          <option value="h3">H3 - Subseção</option>
          <option value="h4">H4</option>
          <option value="h5">H5</option>
          <option value="h6">H6</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Cor do Texto</label>
        <input
          type="color"
          value={props.color || '#1d1d1d'}
          onChange={(e) => setProp((props: HeadingProps) => props.color = e.target.value)}
          className="w-full h-10 rounded border cursor-pointer"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Alinhamento</label>
        <select
          value={props.textAlign || 'left'}
          onChange={(e) => setProp((props: HeadingProps) => props.textAlign = e.target.value as HeadingProps['textAlign'])}
          className="w-full border rounded p-2"
        >
          <option value="left">Esquerda</option>
          <option value="center">Centro</option>
          <option value="right">Direita</option>
        </select>
      </div>
    </div>
  );
};

Heading.craft = {
  displayName: 'Título',
  props: {
    text: 'Título',
    level: 'h2',
    color: '#1d1d1d',
    textAlign: 'left',
  },
  related: {
    settings: HeadingSettings,
  },
};
