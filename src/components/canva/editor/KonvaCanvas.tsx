import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Image, Line, Transformer } from 'react-konva';
import { CanvaObject } from '@/types/canvaEditor';
import useImage from 'use-image';

interface KonvaCanvasProps {
  objects: CanvaObject[];
  selectedId: string | null;
  canvasSettings: { width: number; height: number; backgroundColor: string };
  zoom: number;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<CanvaObject>) => void;
}

const URLImage = ({ src, ...props }: { src: string } & any) => {
  const [image] = useImage(src, 'anonymous');
  return <Image image={image} {...props} />;
};

export function KonvaCanvas({
  objects,
  selectedId,
  canvasSettings,
  zoom,
  onSelect,
  onUpdate,
}: KonvaCanvasProps) {
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [textareaStyle, setTextareaStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode && editingTextId !== selectedId) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedId, objects, editingTextId]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingTextId]);

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage() || e.target.name() === 'background') {
      onSelect(null);
      if (editingTextId) {
        finishTextEdit();
      }
    }
  };

  const handleDragEnd = (id: string, e: any) => {
    onUpdate(id, { x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = (id: string, e: any) => {
    const node = e.target;
    onUpdate(id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * node.scaleX()),
      height: Math.max(5, node.height() * node.scaleY()),
      rotation: node.rotation(),
      scaleX: 1,
      scaleY: 1,
    });
  };

  const handleTextDblClick = useCallback((obj: CanvaObject, e: any) => {
    const textNode = e.target;
    const stage = stageRef.current;
    const container = containerRef.current;
    
    if (!stage || !container) return;

    // Hide transformer during editing
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }

    const textPosition = textNode.absolutePosition();
    const stageBox = stage.container().getBoundingClientRect();
    
    // Calculate position relative to container
    const areaPosition = {
      x: stageBox.left + textPosition.x * zoom,
      y: stageBox.top + textPosition.y * zoom,
    };

    // Get container position
    const containerBox = container.getBoundingClientRect();
    
    setEditingTextId(obj.id);
    setEditValue(obj.text || '');
    setTextareaStyle({
      position: 'absolute',
      left: `${areaPosition.x - containerBox.left}px`,
      top: `${areaPosition.y - containerBox.top}px`,
      width: `${(obj.width || 200) * zoom}px`,
      minHeight: `${(obj.fontSize || 24) * zoom * 1.5}px`,
      fontSize: `${(obj.fontSize || 24) * zoom}px`,
      fontFamily: obj.fontFamily || 'Arial',
      fontWeight: obj.fontStyle === 'bold' ? 'bold' : 'normal',
      color: obj.fill || '#000000',
      border: '2px solid hsl(var(--primary))',
      padding: '4px',
      margin: '0',
      overflow: 'hidden',
      background: 'white',
      outline: 'none',
      resize: 'none',
      lineHeight: '1.2',
      transformOrigin: 'left top',
      zIndex: 1000,
    });
  }, [zoom]);

  const finishTextEdit = useCallback(() => {
    if (editingTextId) {
      onUpdate(editingTextId, { text: editValue });
      setEditingTextId(null);
      setEditValue('');
    }
  }, [editingTextId, editValue, onUpdate]);

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishTextEdit();
    }
    if (e.key === 'Escape') {
      setEditingTextId(null);
      setEditValue('');
    }
  };

  const renderObject = (obj: CanvaObject) => {
    const commonProps = {
      id: obj.id,
      x: obj.x,
      y: obj.y,
      rotation: obj.rotation || 0,
      opacity: obj.opacity ?? 1,
      visible: obj.visible !== false,
      draggable: !obj.locked && editingTextId !== obj.id,
      onClick: () => onSelect(obj.id),
      onTap: () => onSelect(obj.id),
      onDragEnd: (e: any) => handleDragEnd(obj.id, e),
      onTransformEnd: (e: any) => handleTransformEnd(obj.id, e),
    };

    switch (obj.type) {
      case 'rect':
        return (
          <Rect
            key={obj.id}
            {...commonProps}
            width={obj.width || 100}
            height={obj.height || 100}
            fill={obj.fill || '#3b82f6'}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
            cornerRadius={4}
          />
        );
      case 'circle':
        return (
          <Circle
            key={obj.id}
            {...commonProps}
            radius={obj.radius || 50}
            fill={obj.fill || '#10b981'}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
          />
        );
      case 'text':
        return (
          <Text
            key={obj.id}
            {...commonProps}
            text={obj.text || 'Texto'}
            fontSize={obj.fontSize || 24}
            fontFamily={obj.fontFamily || 'Arial'}
            fontStyle={obj.fontStyle}
            textDecoration={obj.textDecoration}
            fill={obj.fill || '#000000'}
            align={obj.align || 'left'}
            width={obj.width}
            visible={obj.visible !== false && editingTextId !== obj.id}
            onDblClick={(e: any) => handleTextDblClick(obj, e)}
            onDblTap={(e: any) => handleTextDblClick(obj, e)}
          />
        );
      case 'image':
        return (
          <URLImage
            key={obj.id}
            {...commonProps}
            src={obj.src || ''}
            width={obj.width || 200}
            height={obj.height || 200}
          />
        );
      case 'line':
        return (
          <Line
            key={obj.id}
            {...commonProps}
            points={obj.points || [0, 0, 100, 0]}
            stroke={obj.stroke || '#000000'}
            strokeWidth={obj.strokeWidth || 2}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-auto bg-muted/50 flex items-center justify-center p-8 relative"
    >
      <div
        className="shadow-2xl relative"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <Stage
          ref={stageRef}
          width={canvasSettings.width}
          height={canvasSettings.height}
          onClick={handleStageClick}
          onTap={handleStageClick}
          style={{ backgroundColor: canvasSettings.backgroundColor }}
        >
          <Layer>
            {/* Background */}
            <Rect
              name="background"
              x={0}
              y={0}
              width={canvasSettings.width}
              height={canvasSettings.height}
              fill={canvasSettings.backgroundColor}
            />
            {/* Objects */}
            {objects.map(renderObject)}
            {/* Transformer */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>
      
      {/* Text editing textarea */}
      {editingTextId && (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={finishTextEdit}
          onKeyDown={handleTextareaKeyDown}
          style={textareaStyle}
        />
      )}
    </div>
  );
}
