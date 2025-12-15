import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
} from 'lucide-react';
import { CanvaObject } from '@/types/canvaEditor';
import { toast } from 'sonner';

interface EditorToolbarProps {
  selectedObject: CanvaObject | null;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  stageRef: React.RefObject<any>;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<CanvaObject>) => void;
  onDuplicate: () => void;
}

const fontFamilies = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Impact',
  'Comic Sans MS',
];

const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96];

export function EditorToolbar({
  selectedObject,
  zoom,
  canUndo,
  canRedo,
  stageRef,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onDelete,
  onUpdate,
  onDuplicate,
}: EditorToolbarProps) {
  const handleExport = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'design.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Imagem exportada com sucesso!');
  };

  const isText = selectedObject?.type === 'text';
  const isShape = selectedObject?.type === 'rect' || selectedObject?.type === 'circle';

  return (
    <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-2">
      {/* Undo/Redo */}
      <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo}>
        <Redo2 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Zoom controls */}
      <Button variant="ghost" size="icon" onClick={onZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
      <Button variant="ghost" size="icon" onClick={onZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Context-specific controls */}
      {isText && (
        <>
          <Select
            value={selectedObject.fontFamily || 'Arial'}
            onValueChange={(value) => onUpdate({ fontFamily: value })}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(selectedObject.fontSize || 24)}
            onValueChange={(value) => onUpdate({ fontSize: parseInt(value) })}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant={selectedObject.fontStyle?.includes('bold') ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              onUpdate({
                fontStyle: selectedObject.fontStyle?.includes('bold')
                  ? selectedObject.fontStyle.replace('bold', '').trim()
                  : `${selectedObject.fontStyle || ''} bold`.trim(),
              })
            }
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedObject.fontStyle?.includes('italic') ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              onUpdate({
                fontStyle: selectedObject.fontStyle?.includes('italic')
                  ? selectedObject.fontStyle.replace('italic', '').trim()
                  : `${selectedObject.fontStyle || ''} italic`.trim(),
              })
            }
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedObject.textDecoration === 'underline' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              onUpdate({
                textDecoration: selectedObject.textDecoration === 'underline' ? '' : 'underline',
              })
            }
          >
            <Underline className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant={selectedObject.align === 'left' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ align: 'left' })}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedObject.align === 'center' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ align: 'center' })}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedObject.align === 'right' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ align: 'right' })}
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cor:</span>
            <Input
              type="color"
              value={selectedObject.fill || '#000000'}
              onChange={(e) => onUpdate({ fill: e.target.value })}
              className="w-8 h-8 p-1 cursor-pointer"
            />
          </div>
        </>
      )}

      {isShape && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Preenchimento:</span>
            <Input
              type="color"
              value={selectedObject.fill || '#3b82f6'}
              onChange={(e) => onUpdate({ fill: e.target.value })}
              className="w-8 h-8 p-1 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Borda:</span>
            <Input
              type="color"
              value={selectedObject.stroke || '#000000'}
              onChange={(e) => onUpdate({ stroke: e.target.value })}
              className="w-8 h-8 p-1 cursor-pointer"
            />
            <Input
              type="number"
              min={0}
              max={20}
              value={selectedObject.strokeWidth || 0}
              onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) || 0 })}
              className="w-16 h-8"
            />
          </div>
        </>
      )}

      {selectedObject && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Opacidade:</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={Math.round((selectedObject.opacity ?? 1) * 100)}
              onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
              className="w-16 h-8"
            />
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="icon" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export */}
      <Button variant="default" size="sm" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" />
        Exportar PNG
      </Button>
    </div>
  );
}
