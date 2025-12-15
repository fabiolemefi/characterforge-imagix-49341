import { useState } from 'react';
import { Type, Shapes, Upload, Palette, Layers, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextPanel } from './TextPanel';
import { ShapesPanel } from './ShapesPanel';
import { UploadsPanel } from './UploadsPanel';
import { BackgroundPanel } from './BackgroundPanel';
import { LayersPanel } from './LayersPanel';
import { BrandPanel } from './BrandPanel';
import { CanvaObject, CanvasSettings } from '@/types/canvaEditor';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditorSidebarProps {
  objects: CanvaObject[];
  selectedId: string | null;
  canvasSettings: CanvasSettings;
  onAddObject: (object: CanvaObject) => void;
  onSelectObject: (id: string | null) => void;
  onUpdateSettings: (settings: Partial<CanvasSettings>) => void;
  onReorderObjects: (objects: CanvaObject[]) => void;
  onDeleteObject: (id: string) => void;
  onUpdateObject: (id: string, updates: Partial<CanvaObject>) => void;
}

const tabs = [
  { id: 'brand', icon: Crown, label: 'Marca' },
  { id: 'text', icon: Type, label: 'Texto' },
  { id: 'shapes', icon: Shapes, label: 'Formas' },
  { id: 'uploads', icon: Upload, label: 'Uploads' },
  { id: 'background', icon: Palette, label: 'Fundo' },
  { id: 'layers', icon: Layers, label: 'Camadas' },
];

export function EditorSidebar({
  objects,
  selectedId,
  canvasSettings,
  onAddObject,
  onSelectObject,
  onUpdateSettings,
  onReorderObjects,
  onDeleteObject,
  onUpdateObject,
}: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState('brand');
  
  const selectedObject = objects.find(o => o.id === selectedId) || null;

  return (
    <div className="flex h-full bg-card border-r border-border">
      {/* Icon tabs */}
      <div className="w-16 bg-muted/30 border-r border-border flex flex-col">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'w-full py-4 flex flex-col items-center gap-1 transition-colors',
              activeTab === tab.id
                ? 'bg-background text-primary border-l-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <ScrollArea className="w-64">
        <div className="p-4">
          {activeTab === 'brand' && (
            <BrandPanel 
              onAddObject={onAddObject} 
              onUpdateObject={onUpdateObject}
              selectedObject={selectedObject}
            />
          )}
          {activeTab === 'text' && <TextPanel onAddObject={onAddObject} />}
          {activeTab === 'shapes' && <ShapesPanel onAddObject={onAddObject} />}
          {activeTab === 'uploads' && <UploadsPanel onAddObject={onAddObject} />}
          {activeTab === 'background' && (
            <BackgroundPanel
              canvasSettings={canvasSettings}
              onUpdateSettings={onUpdateSettings}
            />
          )}
          {activeTab === 'layers' && (
            <LayersPanel
              objects={objects}
              selectedId={selectedId}
              onSelect={onSelectObject}
              onReorder={onReorderObjects}
              onDelete={onDeleteObject}
              onUpdate={onUpdateObject}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
