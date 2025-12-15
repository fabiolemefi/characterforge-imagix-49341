import { Button } from '@/components/ui/button';
import { Type, Heading1, Heading2, AlignLeft } from 'lucide-react';
import { CanvaObject } from '@/types/canvaEditor';

interface TextPanelProps {
  onAddObject: (object: CanvaObject) => void;
}

const textTemplates = [
  { label: 'Título Grande', fontSize: 48, fontStyle: 'bold', icon: Heading1 },
  { label: 'Subtítulo', fontSize: 32, fontStyle: 'bold', icon: Heading2 },
  { label: 'Texto Normal', fontSize: 18, fontStyle: 'normal', icon: AlignLeft },
  { label: 'Texto Pequeno', fontSize: 14, fontStyle: 'normal', icon: Type },
];

export function TextPanel({ onAddObject }: TextPanelProps) {
  const handleAddText = (template: typeof textTemplates[0]) => {
    const newText: CanvaObject = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 50,
      y: 50,
      text: template.label,
      fontSize: template.fontSize,
      fontFamily: 'Arial',
      fontStyle: template.fontStyle,
      fill: '#000000',
      width: 300,
      name: template.label,
    };
    onAddObject(newText);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground px-1">Adicionar Texto</h3>
      <div className="space-y-2">
        {textTemplates.map((template) => (
          <Button
            key={template.label}
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleAddText(template)}
          >
            <template.icon className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">{template.label}</div>
              <div className="text-xs text-muted-foreground">{template.fontSize}px</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
