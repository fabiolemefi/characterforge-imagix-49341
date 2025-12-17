import { useEffect, useState, useRef } from 'react';
import { GripVertical, Monitor, Tablet, Smartphone, Trash2, Upload, Loader } from 'lucide-react';
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
  onReorderBlocks?: (blocks: BlockData[]) => void;
  onUpdateBlock?: (instanceId: string, html: string) => void;
  onDeleteBlock?: (instanceId: string) => void;
}

interface SortableBlockProps {
  block: BlockData;
  onUpdate: (html: string) => void;
  onDelete: () => void;
}

const SortableBlock = ({ block, onUpdate, onDelete }: SortableBlockProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [innerRef, setInnerRef] = useState<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showImageOverlay, setShowImageOverlay] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [uploadedImg, setUploadedImg] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      setTimeout(() => innerRef?.focus(), 0);
    }
  };

  const handleBlur = () => {
    if (innerRef) {
      setIsEditing(false);
      onUpdate(innerRef.innerHTML);
    }
  };

  useEffect(() => {
    if (innerRef && !isEditing) {
      const handleImgMouseEnter = (e: Event) => {
        const target = e.target as HTMLImageElement;
        if (target.tagName === 'IMG') {
          const rect = target.getBoundingClientRect();
          setOverlayPosition({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          });
          setUploadedImg(target);
          setShowImageOverlay(true);
        }
      };

      const imgs = innerRef.querySelectorAll('img');

      imgs.forEach(img => {
        img.addEventListener('mouseenter', handleImgMouseEnter);
      });

      return () => {
        imgs.forEach(img => {
          img.removeEventListener('mouseenter', handleImgMouseEnter);
        });
      };
    }
  }, [innerRef, isEditing, block.html]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      if (uploadedImg) {
        uploadedImg.classList.add('animate-pulse');

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create a blob URL for the image
        const url = URL.createObjectURL(file);
        uploadedImg.src = url;

        // Short delay to show the updated image
        await new Promise(resolve => setTimeout(resolve, 300));

        uploadedImg.classList.remove('animate-pulse');
        onUpdate(innerRef?.innerHTML || '');
        setIsUploading(false);
        setShowImageOverlay(false);
      }
    } else {
      // No file selected
      setIsUploading(false);
    }
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
        <div className="absolute -left-14 top-1/2 -translate-y-1/2 flex gap-2 z-10">
          <button
            onClick={onDelete}
            className="bg-white border border-gray-300 p-2 rounded shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing bg-white border border-gray-300 p-2 rounded shadow-sm hover:bg-gray-50 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-gray-600" />
          </div>
        </div>
      )}

      <div
        ref={setInnerRef}
        contentEditable={isEditing}
        dangerouslySetInnerHTML={{ __html: block.html }}
        onClick={handleClick}
        onBlur={handleBlur}
        suppressContentEditableWarning
        className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {showImageOverlay && (
        <div
          className="fixed bg-black/70 flex items-center justify-center z-50 cursor-pointer rounded"
          style={{
            left: overlayPosition.left,
            top: overlayPosition.top,
            width: overlayPosition.width,
            height: overlayPosition.height,
          }}
          onClick={() => {
            setIsUploading(false);
            fileInputRef.current?.click();
          }}
          onMouseLeave={() => setShowImageOverlay(false)}
        >
          {isUploading ? <Loader className="h-8 w-8 text-white animate-spin" /> : <Upload className="h-8 w-8 text-white" />}
        </div>
      )}
    </div>
  );
};

export const EmailPreview = ({
  blocks = [],
  className = '',
  onReorderBlocks,
  onUpdateBlock,
  onDeleteBlock,
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
      <div className={`bg-muted rounded-lg overflow-hidden flex flex-col h-full ${className}`}>
        <div className="bg-background border-b p-3 flex items-center justify-between flex-shrink-0">
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
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Adicione blocos para visualizar seu email</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-muted rounded-lg overflow-hidden flex flex-col h-full ${className}`}>
      <div className="bg-background border-b p-3 flex items-center justify-between flex-shrink-0">
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
      <div className="overflow-y-auto flex-1">
        <div className="bg-[#f5f5f5] p-5">
          <div className="mx-auto bg-white transition-all duration-300 relative" style={{ maxWidth: getPreviewWidth() }}>
            {!localBlocks.length ? (
              <div className="flex items-center justify-center py-20">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gray-200 animate-pulse rounded"></div>
                  <div className="w-32 h-4 bg-gray-200 animate-pulse rounded"></div>
                  <div className="w-24 h-3 bg-gray-200 animate-pulse rounded"></div>
                </div>
              </div>
            ) : (
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
                      onUpdate={(html: string) => onUpdateBlock?.(block.instanceId, html)}
                      onDelete={() => onDeleteBlock?.(block.instanceId)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
