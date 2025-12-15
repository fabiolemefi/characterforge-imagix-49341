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

const SNAP_THRESHOLD = 5;

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
  
  // Snapping guidelines state
  const [guidelines, setGuidelines] = useState<{
    vertical: number[];
    horizontal: number[];
  }>({ vertical: [], horizontal: [] });

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

  const getObjectBounds = (obj: CanvaObject) => {
    const width = obj.width || (obj.type === 'circle' ? (obj.radius || 50) * 2 : 100);
    const height = obj.height || (obj.type === 'circle' ? (obj.radius || 50) * 2 : 100);
    const x = obj.type === 'circle' ? obj.x - (obj.radius || 50) : obj.x;
    const y = obj.type === 'circle' ? obj.y - (obj.radius || 50) : obj.y;
    
    return { x, y, width, height };
  };

  const getSnapPoints = useCallback((currentObjId: string) => {
    const points = {
      vertical: [
        { point: canvasSettings.width / 2, type: 'center' },
        { point: 0, type: 'edge' },
        { point: canvasSettings.width, type: 'edge' },
      ],
      horizontal: [
        { point: canvasSettings.height / 2, type: 'center' },
        { point: 0, type: 'edge' },
        { point: canvasSettings.height, type: 'edge' },
      ],
    };

    objects.forEach(obj => {
      if (obj.id === currentObjId) return;
      
      const bounds = getObjectBounds(obj);
      
      // Vertical snap points (X axis)
      points.vertical.push(
        { point: bounds.x, type: 'object' },
        { point: bounds.x + bounds.width / 2, type: 'object' },
        { point: bounds.x + bounds.width, type: 'object' }
      );
      
      // Horizontal snap points (Y axis)
      points.horizontal.push(
        { point: bounds.y, type: 'object' },
        { point: bounds.y + bounds.height / 2, type: 'object' },
        { point: bounds.y + bounds.height, type: 'object' }
      );
    });

    return points;
  }, [objects, canvasSettings]);

  const handleDragMove = useCallback((id: string, e: any) => {
    const node = e.target;
    const obj = objects.find(o => o.id === id);
    if (!obj) return;

    const snapPoints = getSnapPoints(id);
    
    // Get current node bounds
    const isCircle = obj.type === 'circle';
    const nodeWidth = isCircle ? (obj.radius || 50) * 2 : (node.width() || obj.width || 100);
    const nodeHeight = isCircle ? (obj.radius || 50) * 2 : (node.height() || obj.height || 100);
    
    const nodeX = isCircle ? node.x() - (obj.radius || 50) : node.x();
    const nodeY = isCircle ? node.y() - (obj.radius || 50) : node.y();
    
    const nodeRect = {
      left: nodeX,
      right: nodeX + nodeWidth,
      top: nodeY,
      bottom: nodeY + nodeHeight,
      centerX: nodeX + nodeWidth / 2,
      centerY: nodeY + nodeHeight / 2,
    };

    let newX = node.x();
    let newY = node.y();
    const activeGuides: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };

    // Check vertical snapping (X axis)
    for (const { point } of snapPoints.vertical) {
      if (Math.abs(nodeRect.left - point) < SNAP_THRESHOLD) {
        newX = isCircle ? point + (obj.radius || 50) : point;
        activeGuides.vertical.push(point);
        break;
      } else if (Math.abs(nodeRect.centerX - point) < SNAP_THRESHOLD) {
        newX = isCircle ? point : point - nodeWidth / 2;
        activeGuides.vertical.push(point);
        break;
      } else if (Math.abs(nodeRect.right - point) < SNAP_THRESHOLD) {
        newX = isCircle ? point - (obj.radius || 50) : point - nodeWidth;
        activeGuides.vertical.push(point);
        break;
      }
    }

    // Check horizontal snapping (Y axis)
    for (const { point } of snapPoints.horizontal) {
      if (Math.abs(nodeRect.top - point) < SNAP_THRESHOLD) {
        newY = isCircle ? point + (obj.radius || 50) : point;
        activeGuides.horizontal.push(point);
        break;
      } else if (Math.abs(nodeRect.centerY - point) < SNAP_THRESHOLD) {
        newY = isCircle ? point : point - nodeHeight / 2;
        activeGuides.horizontal.push(point);
        break;
      } else if (Math.abs(nodeRect.bottom - point) < SNAP_THRESHOLD) {
        newY = isCircle ? point - (obj.radius || 50) : point - nodeHeight;
        activeGuides.horizontal.push(point);
        break;
      }
    }

    node.x(newX);
    node.y(newY);
    setGuidelines(activeGuides);
  }, [objects, getSnapPoints]);

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage() || e.target.name() === 'background') {
      onSelect(null);
      if (editingTextId) {
        finishTextEdit();
      }
    }
  };

  const handleDragEnd = (id: string, e: any) => {
    setGuidelines({ vertical: [], horizontal: [] });
    onUpdate(id, { x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = (id: string, e: any) => {
    const node = e.target;
    const obj = objects.find(o => o.id === id);
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Reset scale on the node to prevent accumulation
    node.scaleX(1);
    node.scaleY(1);
    
    if (obj?.type === 'text') {
      // For text, only adjust width (horizontal resize only)
      onUpdate(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(50, node.width() * scaleX),
        rotation: node.rotation(),
      });
    } else {
      onUpdate(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
    }
  };

  // Get selected object for transformer configuration
  const selectedObject = objects.find(obj => obj.id === selectedId);

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
      onDragMove: (e: any) => handleDragMove(obj.id, e),
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
            
            {/* Snap Guidelines */}
            {guidelines.vertical.map((x, i) => (
              <Line
                key={`guide-v-${i}`}
                points={[x, 0, x, canvasSettings.height]}
                stroke="#ff00ff"
                strokeWidth={1}
                dash={[4, 4]}
              />
            ))}
            {guidelines.horizontal.map((y, i) => (
              <Line
                key={`guide-h-${i}`}
                points={[0, y, canvasSettings.width, y]}
                stroke="#ff00ff"
                strokeWidth={1}
                dash={[4, 4]}
              />
            ))}
            
            {/* Transformer */}
            <Transformer
              ref={transformerRef}
              keepRatio={selectedObject?.type === 'image'}
              enabledAnchors={
                selectedObject?.type === 'image'
                  ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                  : selectedObject?.type === 'text'
                  ? ['middle-left', 'middle-right']
                  : undefined
              }
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
