import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CanvasSettings } from '@/types/canvaEditor';

interface BackgroundPanelProps {
  canvasSettings: CanvasSettings;
  onUpdateSettings: (settings: Partial<CanvasSettings>) => void;
}

const presetColors = [
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0',
  '#1e293b', '#0f172a', '#000000',
  '#fef2f2', '#fef9c3', '#ecfdf5', '#eff6ff', '#faf5ff', '#fff1f2',
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

const presetSizes = [
  { label: 'Post Instagram', width: 1080, height: 1080 },
  { label: 'Story', width: 1080, height: 1920 },
  { label: 'Post Facebook', width: 1200, height: 630 },
  { label: 'YouTube Thumbnail', width: 1280, height: 720 },
  { label: 'Apresentação', width: 1920, height: 1080 },
  { label: 'A4 Retrato', width: 595, height: 842 },
];

export function BackgroundPanel({ canvasSettings, onUpdateSettings }: BackgroundPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-sm text-muted-foreground px-1 mb-3">Cor de Fundo</h3>
        <div className="grid grid-cols-6 gap-2 mb-3">
          {presetColors.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-md border hover:scale-110 transition-transform ${
                canvasSettings.backgroundColor === color ? 'ring-2 ring-primary ring-offset-2' : 'border-border'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onUpdateSettings({ backgroundColor: color })}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="customColor" className="text-xs">Cor personalizada:</Label>
          <Input
            id="customColor"
            type="color"
            value={canvasSettings.backgroundColor}
            onChange={(e) => onUpdateSettings({ backgroundColor: e.target.value })}
            className="w-12 h-8 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={canvasSettings.backgroundColor}
            onChange={(e) => onUpdateSettings({ backgroundColor: e.target.value })}
            className="flex-1 h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm text-muted-foreground px-1 mb-3">Tamanho do Canvas</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label htmlFor="width" className="text-xs">Largura</Label>
            <Input
              id="width"
              type="number"
              value={canvasSettings.width}
              onChange={(e) => onUpdateSettings({ width: parseInt(e.target.value) || 600 })}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="height" className="text-xs">Altura</Label>
            <Input
              id="height"
              type="number"
              value={canvasSettings.height}
              onChange={(e) => onUpdateSettings({ height: parseInt(e.target.value) || 800 })}
              className="h-8"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm text-muted-foreground px-1 mb-3">Tamanhos Pré-definidos</h3>
        <div className="space-y-1">
          {presetSizes.map((size) => (
            <Button
              key={size.label}
              variant="ghost"
              size="sm"
              className="w-full justify-between h-8 text-xs"
              onClick={() => onUpdateSettings({ width: size.width, height: size.height })}
            >
              <span>{size.label}</span>
              <span className="text-muted-foreground">{size.width}x{size.height}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
