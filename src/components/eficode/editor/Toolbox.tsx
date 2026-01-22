import React from 'react';
import { useEditor, Element } from '@craftjs/core';
import { Container, Text, Heading, Button, Image, Divider, Spacer } from '../user-components';
import { useEfiCodeBlocks } from '@/hooks/useEfiCodeBlocks';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  SquareDashed, 
  Type, 
  Heading as HeadingIcon, 
  MousePointerClick, 
  ImageIcon,
  Minus,
  MoveVertical,
  Video,
  Columns,
  FormInput,
  LayoutGrid,
  Link,
  List,
  Quote,
  Table,
  Code,
  LucideIcon,
} from 'lucide-react';

interface ToolboxItemProps {
  icon: React.ReactNode;
  label: string;
}

const ToolboxItem = ({ icon, label }: ToolboxItemProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-lg border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors">
      <div className="text-muted-foreground mb-1">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

const ICON_MAP: Record<string, LucideIcon> = {
  SquareDashed,
  Type,
  Heading: HeadingIcon,
  MousePointerClick,
  ImageIcon,
  Minus,
  MoveVertical,
  Video,
  Columns,
  FormInput,
  LayoutGrid,
  Link,
  List,
  Quote,
  Table,
  Code,
};

export const Toolbox = () => {
  const { connectors } = useEditor();
  const { blocks, isLoading } = useEfiCodeBlocks(true);

  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <SquareDashed className="h-5 w-5" />;
  };

  const getComponent = (componentType: string, defaultProps: Record<string, any> = {}) => {
    switch (componentType) {
      case 'Container':
        return <Element is={Container} canvas {...defaultProps} />;
      case 'Heading':
        return <Heading {...defaultProps} />;
      case 'Text':
        return <Text {...defaultProps} />;
      case 'Button':
        return <Button {...defaultProps} />;
      case 'Image':
        return <Image {...defaultProps} />;
      case 'Divider':
        return <Divider {...defaultProps} />;
      case 'Spacer':
        return <Spacer {...defaultProps} />;
      default:
        return <Element is={Container} canvas {...defaultProps} />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Componentes
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
        Componentes
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {blocks.map((block) => (
          <div
            key={block.id}
            ref={(ref) => ref && connectors.create(ref, getComponent(block.component_type, block.default_props || {}))}
          >
            <ToolboxItem
              icon={getIcon(block.icon_name)}
              label={block.name}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
