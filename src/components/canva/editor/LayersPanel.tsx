import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Lock, Unlock, Trash2, Type, Square, Circle, Image, Minus } from 'lucide-react';
import { CanvaObject } from '@/types/canvaEditor';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LayersPanelProps {
  objects: CanvaObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReorder: (objects: CanvaObject[]) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CanvaObject>) => void;
}

function LayerItem({
  object,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}: {
  object: CanvaObject;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<CanvaObject>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: object.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getIcon = () => {
    switch (object.type) {
      case 'text': return Type;
      case 'rect': return Square;
      case 'circle': return Circle;
      case 'image': return Image;
      case 'line': return Minus;
      default: return Square;
    }
  };

  const Icon = getIcon();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md border transition-colors',
        isDragging && 'opacity-50',
        isSelected
          ? 'bg-primary/10 border-primary'
          : 'bg-background border-border hover:bg-muted/50'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 text-left min-w-0"
      >
        <Icon className="h-4 w-4 shrink-0" style={{ color: object.fill || object.stroke }} />
        <span className="text-sm truncate">{object.name || object.type}</span>
      </button>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onUpdate({ visible: !(object.visible !== false) })}
        >
          {object.visible !== false ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onUpdate({ locked: !object.locked })}
        >
          {object.locked ? (
            <Lock className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function LayersPanel({
  objects,
  selectedId,
  onSelect,
  onReorder,
  onDelete,
  onUpdate,
}: LayersPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reverse for visual order (top layer first)
  const reversedObjects = useMemo(() => [...objects].reverse(), [objects]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = reversedObjects.findIndex((obj) => obj.id === active.id);
    const newIndex = reversedObjects.findIndex((obj) => obj.id === over.id);
    const newReversed = arrayMove(reversedObjects, oldIndex, newIndex);
    onReorder([...newReversed].reverse());
  };

  if (objects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nenhum elemento no canvas</p>
        <p className="text-xs mt-1">Adicione texto, formas ou imagens</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground px-1">
        Camadas ({objects.length})
      </h3>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={reversedObjects.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {reversedObjects.map((object) => (
              <LayerItem
                key={object.id}
                object={object}
                isSelected={object.id === selectedId}
                onSelect={() => onSelect(object.id)}
                onDelete={() => onDelete(object.id)}
                onUpdate={(updates) => onUpdate(object.id, updates)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
