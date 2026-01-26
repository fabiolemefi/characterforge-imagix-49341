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
  return (
    <div className="p-4 text-center text-sm text-muted-foreground">
      <p>As propriedades do Container são configuradas no painel esquerdo (Configurações).</p>
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
