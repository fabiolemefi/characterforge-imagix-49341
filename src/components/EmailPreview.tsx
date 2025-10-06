import { useEffect, useState } from 'react';
import { GripVertical, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BlockData {
  instanceId: string;
  html: string;
}

interface EmailPreviewProps {
  blocks?: BlockData[];
  className?: string;
  onEditBlock?: (instanceId: string) => void;
  onReorderBlocks?: (blocks: BlockData[]) => void;
}

interface SortableBlockProps {
  block: BlockData;
  onEdit: () => void;
}

const SortableBlock = ({ block, onEdit }: SortableBlockProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.instanceId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div 
          className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center cursor-pointer transition-opacity"
          onClick={onEdit}
        >
          <span className="text-white font-medium text-sm">Editar componente</span>
          <div
            {...attributes}
            {...listeners}
            className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing bg-white/20 p-2 rounded hover:bg-white/30 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-white" />
          </div>
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: block.html }} />
    </div>
  );
};

export const EmailPreview = ({ 
  blocks = [], 
  className = '',
  onEditBlock,
  onReorderBlocks,
}: EmailPreviewProps) => {
  const [localBlocks, setLocalBlocks] = useState<BlockData[]>(blocks);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  const getPreviewWidth = () => {
    switch (viewMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '600px';
    }
  };

  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalBlocks((items) => {
        const oldIndex = items.findIndex(item => item.instanceId === active.id);
        const newIndex = items.findIndex(item => item.instanceId === over.id);
        const newBlocks = arrayMove(items, oldIndex, newIndex);
        onReorderBlocks?.(newBlocks);
        return newBlocks;
      });
    }
  };

  if (localBlocks.length === 0) {
    return (
      <div className={`bg-muted rounded-lg overflow-hidden ${className}`}>
        <div className="bg-background border-b p-3 flex items-center justify-between">
          <span className="text-sm font-medium">Preview do Email</span>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[600px] text-muted-foreground">
          <p>Adicione blocos para visualizar seu email</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-muted rounded-lg overflow-hidden ${className}`}>
      <div className="bg-background border-b p-3 flex items-center justify-between">
        <span className="text-sm font-medium">Preview do Email</span>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'tablet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tablet')}
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="overflow-auto" style={{ minHeight: '600px' }}>
        <div className="bg-[#f5f5f5] p-5">
          <div className="mx-auto bg-white transition-all duration-300" style={{ maxWidth: getPreviewWidth() }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localBlocks.map(b => b.instanceId)}
                strategy={verticalListSortingStrategy}
              >
                {localBlocks.map((block) => (
                  <SortableBlock
                    key={block.instanceId}
                    block={block}
                    onEdit={() => onEditBlock?.(block.instanceId)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
};
