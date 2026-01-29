import React, { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block } from '@/stores/efiCodeEditorStore';
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BlockListProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

interface SortableBlockItemProps {
  block: Block;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const SortableBlockItem: React.FC<SortableBlockItemProps> = ({
  block,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Extract a preview from the HTML
  const getBlockPreview = (html: string): string => {
    // Try to extract text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    const trimmed = text.trim().substring(0, 50);
    return trimmed || 'Bloco HTML';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 p-2 rounded-md border transition-all',
        isDragging && 'opacity-50 z-50',
        isSelected 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-border bg-card hover:border-muted-foreground/30'
      )}
    >
      {/* Drag Handle */}
      <button
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Block Preview */}
      <div 
        className="flex-1 min-w-0 cursor-pointer py-1"
        onClick={onSelect}
      >
        <p className="text-sm font-medium truncate">
          Bloco {block.order + 1}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {getBlockPreview(block.html)}
        </p>
      </div>

      {/* Actions - visible on hover or when selected */}
      <div className={cn(
        'flex items-center gap-0.5 transition-opacity',
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onMoveUp}
          disabled={isFirst}
          title="Mover para cima"
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onMoveDown}
          disabled={isLast}
          title="Mover para baixo"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDuplicate}
          title="Duplicar"
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
          title="Excluir"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export const BlockList: React.FC<BlockListProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onReorder,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  }, [blocks, onReorder]);

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Nenhum bloco adicionado
        </p>
        <p className="text-xs text-muted-foreground">
          Clique em um componente para adicionar
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map(b => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {blocks.map((block, index) => (
            <SortableBlockItem
              key={block.id}
              block={block}
              isSelected={block.id === selectedBlockId}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
              onSelect={() => onSelectBlock(block.id)}
              onDelete={() => onDelete(block.id)}
              onDuplicate={() => onDuplicate(block.id)}
              onMoveUp={() => onMoveUp(block.id)}
              onMoveDown={() => onMoveDown(block.id)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeBlock ? (
          <div className="flex items-center gap-2 p-2 rounded-md border border-primary bg-card shadow-lg">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                Bloco {activeBlock.order + 1}
              </p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
