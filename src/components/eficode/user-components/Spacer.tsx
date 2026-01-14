import React from 'react';
import { useNode } from '@craftjs/core';

interface SpacerProps {
  height?: number;
}

export const Spacer = ({
  height = 32,
}: SpacerProps) => {
  const { connectors: { connect, drag }, isActive } = useNode((node) => ({
    isActive: node.events.selected,
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        height,
        background: isActive ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(59, 130, 246, 0.1) 5px, rgba(59, 130, 246, 0.1) 10px)' : 'transparent',
        border: isActive ? '1px dashed #3b82f6' : '1px dashed transparent',
        cursor: 'move',
      }}
    />
  );
};

export const SpacerSettings = () => {
  const { actions: { setProp }, props } = useNode((node) => ({
    props: node.data.props,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Altura (px)</label>
        <input
          type="range"
          min="8"
          max="200"
          value={props.height || 32}
          onChange={(e) => setProp((props: SpacerProps) => props.height = parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{props.height}px</span>
      </div>
    </div>
  );
};

Spacer.craft = {
  displayName: 'Espaçador',
  props: {
    height: 32,
  },
  related: {
    settings: SpacerSettings,
  },
};
