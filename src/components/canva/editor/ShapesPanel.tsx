import { Button } from '@/components/ui/button';
import { Square, Circle, Minus } from 'lucide-react';
import { CanvaObject } from '@/types/canvaEditor';

interface ShapesPanelProps {
  onAddObject: (object: CanvaObject) => void;
}

const shapes = [
  { type: 'rect' as const, label: 'Retângulo', icon: Square, color: '#3b82f6' },
  { type: 'circle' as const, label: 'Círculo', icon: Circle, color: '#10b981' },
  { type: 'line' as const, label: 'Linha', icon: Minus, color: '#6b7280' },
];

const colors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#000000', '#ffffff',
];

export function ShapesPanel({ onAddObject }: ShapesPanelProps) {
  const handleAddShape = (shape: typeof shapes[0], color?: string) => {
    const baseProps = {
      id: `${shape.type}-${Date.now()}`,
      type: shape.type,
      x: 100,
      y: 100,
      name: shape.label,
    };

    let newShape: CanvaObject;

    switch (shape.type) {
      case 'rect':
        newShape = {
          ...baseProps,
          width: 150,
          height: 100,
          fill: color || shape.color,
        };
        break;
      case 'circle':
        newShape = {
          ...baseProps,
          radius: 60,
          fill: color || shape.color,
        };
        break;
      case 'line':
        newShape = {
          ...baseProps,
          points: [0, 0, 200, 0],
          stroke: color || shape.color,
          strokeWidth: 3,
        };
        break;
      default:
        return;
    }

    onAddObject(newShape);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm text-muted-foreground px-1 mb-3">Formas</h3>
        <div className="grid grid-cols-3 gap-2">
          {shapes.map((shape) => (
            <Button
              key={shape.type}
              variant="outline"
              className="h-16 flex-col gap-1"
              onClick={() => handleAddShape(shape)}
            >
              <shape.icon className="h-6 w-6" style={{ color: shape.color }} />
              <span className="text-xs">{shape.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm text-muted-foreground px-1 mb-3">Cores Rápidas</h3>
        <div className="grid grid-cols-5 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded-md border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => handleAddShape(shapes[0], color)}
              title={`Adicionar retângulo ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
