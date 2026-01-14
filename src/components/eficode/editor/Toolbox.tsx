import React from 'react';
import { useEditor, Element } from '@craftjs/core';
import { Container, Text, Heading, Button, Image, Divider, Spacer } from '../user-components';
import { 
  SquareDashed, 
  Type, 
  Heading as HeadingIcon, 
  MousePointerClick, 
  ImageIcon,
  Minus,
  MoveVertical,
} from 'lucide-react';

interface ToolboxItemProps {
  icon: React.ReactNode;
  label: string;
  onDragStart: () => void;
}

const ToolboxItem = ({ icon, label, onDragStart }: ToolboxItemProps) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex flex-col items-center justify-center p-3 rounded-lg border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
    >
      <div className="text-muted-foreground mb-1">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

export const Toolbox = () => {
  const { connectors } = useEditor();

  const components = [
    {
      icon: <SquareDashed className="h-5 w-5" />,
      label: 'Container',
      element: <Element is={Container} canvas />,
    },
    {
      icon: <HeadingIcon className="h-5 w-5" />,
      label: 'Título',
      element: <Heading />,
    },
    {
      icon: <Type className="h-5 w-5" />,
      label: 'Texto',
      element: <Text />,
    },
    {
      icon: <MousePointerClick className="h-5 w-5" />,
      label: 'Botão',
      element: <Button />,
    },
    {
      icon: <ImageIcon className="h-5 w-5" />,
      label: 'Imagem',
      element: <Image />,
    },
    {
      icon: <Minus className="h-5 w-5" />,
      label: 'Separador',
      element: <Divider />,
    },
    {
      icon: <MoveVertical className="h-5 w-5" />,
      label: 'Espaçador',
      element: <Spacer />,
    },
  ];

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
        Componentes
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {components.map((component, index) => (
          <div
            key={index}
            ref={(ref) => ref && connectors.create(ref, component.element)}
          >
            <ToolboxItem
              icon={component.icon}
              label={component.label}
              onDragStart={() => {}}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
