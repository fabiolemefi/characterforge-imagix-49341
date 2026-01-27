import React from 'react';
import { useNode } from '@craftjs/core';

interface DividerProps {
  color?: string;
  thickness?: number;
  marginY?: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

export const Divider = ({
  color = '#e2e8f0',
  thickness = 1,
  marginY = 16,
  style = 'solid',
}: DividerProps) => {
  const { connectors: { connect, drag }, isActive } = useNode((node) => ({
    isActive: node.events.selected,
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        boxShadow: isActive ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none',
      }}
    >
      <hr
        style={{
          border: 'none',
          borderTop: `${thickness}px ${style} ${color}`,
          margin: `${marginY}px 0`,
        }}
      />
    </div>
  );
};

export const DividerSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Cor</label>
        <input
          type="color"
          value={props.color || '#e2e8f0'}
          onChange={(e) => setProp((props: DividerProps) => props.color = e.target.value)}
          className="w-full h-10 rounded border cursor-pointer"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Espessura (px)</label>
        <input
          type="range"
          min="1"
          max="8"
          value={props.thickness || 1}
          onChange={(e) => setProp((props: DividerProps) => props.thickness = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.thickness}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Margem Vertical (px)</label>
        <input
          type="range"
          min="0"
          max="64"
          value={props.marginY || 16}
          onChange={(e) => setProp((props: DividerProps) => props.marginY = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.marginY}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Estilo</label>
        <select
          value={props.style || 'solid'}
          onChange={(e) => setProp((props: DividerProps) => props.style = e.target.value as DividerProps['style'])}
          className="w-full border rounded p-2"
        >
          <option value="solid">Sólido</option>
          <option value="dashed">Tracejado</option>
          <option value="dotted">Pontilhado</option>
        </select>
      </div>
    </div>
  );
};

Divider.craft = {
  displayName: 'Separador',
  props: {
    color: '#e2e8f0',
    thickness: 1,
    marginY: 16,
    style: 'solid',
  },
  related: {
    settings: DividerSettings,
  },
};
