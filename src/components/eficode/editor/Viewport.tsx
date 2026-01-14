import React from 'react';
import { useEditor, Frame, Element } from '@craftjs/core';
import { Container } from '../user-components';

interface ViewportProps {
  children?: React.ReactNode;
}

export const Viewport = ({ children }: ViewportProps) => {
  const { connectors, enabled } = useEditor((state) => ({
    enabled: state.options.enabled,
  }));

  return (
    <div className="flex-1 overflow-auto bg-muted/30 p-8">
      <div
        className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
        style={{ 
          minHeight: '600px',
          maxWidth: '1200px',
        }}
      >
        <Frame>
          <Element
            is={Container}
            canvas
            background="#ffffff"
            padding={24}
            minHeight={600}
          >
            {children}
          </Element>
        </Frame>
      </div>
    </div>
  );
};
