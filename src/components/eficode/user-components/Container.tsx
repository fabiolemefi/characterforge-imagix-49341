import React from 'react';
import { useNode, Element } from '@craftjs/core';

interface ContainerProps {
  background?: string;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  minHeight?: number;
  flexDirection?: 'row' | 'column';
  justifyContent?: string;
  alignItems?: string;
  gap?: number;
  children?: React.ReactNode;
}

export const Container = ({
  background = 'transparent',
  padding = 16,
  margin = 0,
  borderRadius = 0,
  minHeight = 100,
  flexDirection = 'column',
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  gap = 8,
  children,
}: ContainerProps) => {
  const { connectors: { connect, drag } } = useNode();

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        background,
        padding,
        margin,
        borderRadius,
        minHeight,
        display: 'flex',
        flexDirection,
        justifyContent,
        alignItems,
        gap,
      }}
    >
      {children}
    </div>
  );
};

export const ContainerSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Cor de Fundo</label>
        <input
          type="color"
          value={props.background === 'transparent' ? '#ffffff' : props.background}
          onChange={(e) => setProp((props: ContainerProps) => props.background = e.target.value)}
          className="w-full h-10 rounded border cursor-pointer"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Padding (px)</label>
        <input
          type="range"
          min="0"
          max="64"
          value={props.padding || 16}
          onChange={(e) => setProp((props: ContainerProps) => props.padding = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.padding}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Margem (px)</label>
        <input
          type="range"
          min="0"
          max="64"
          value={props.margin || 0}
          onChange={(e) => setProp((props: ContainerProps) => props.margin = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.margin}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Border Radius (px)</label>
        <input
          type="range"
          min="0"
          max="32"
          value={props.borderRadius || 0}
          onChange={(e) => setProp((props: ContainerProps) => props.borderRadius = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.borderRadius}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Altura Mínima (px)</label>
        <input
          type="range"
          min="50"
          max="500"
          value={props.minHeight || 100}
          onChange={(e) => setProp((props: ContainerProps) => props.minHeight = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.minHeight}px</span>
      </div>
      <div>
        <label className="text-sm font-medium">Direção</label>
        <select
          value={props.flexDirection || 'column'}
          onChange={(e) => setProp((props: ContainerProps) => props.flexDirection = e.target.value as 'row' | 'column')}
          className="w-full border rounded p-2"
        >
          <option value="column">Vertical</option>
          <option value="row">Horizontal</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Gap (px)</label>
        <input
          type="range"
          min="0"
          max="32"
          value={props.gap || 8}
          onChange={(e) => setProp((props: ContainerProps) => props.gap = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.gap}px</span>
      </div>
    </div>
  );
};

Container.craft = {
  displayName: 'Container',
  props: {
    background: 'transparent',
    padding: 16,
    margin: 0,
    borderRadius: 0,
    minHeight: 100,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: 8,
  },
  related: {
    settings: ContainerSettings,
  },
  rules: {
    canDrag: () => true,
  },
};
