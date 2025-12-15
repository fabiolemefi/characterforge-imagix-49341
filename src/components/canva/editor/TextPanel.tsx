import { Button } from '@/components/ui/button';
import { Type, Heading1, Heading2, AlignLeft } from 'lucide-react';
import { CanvaObject } from '@/types/canvaEditor';
import { useBrandKit } from '@/hooks/useBrandKit';

interface TextPanelProps {
  onAddObject: (object: CanvaObject) => void;
}

interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
}

const defaultTypography: Record<string, TypographyStyle> = {
  title: { fontFamily: 'Arial', fontSize: 48, fontWeight: '700', color: '#000000' },
  subtitle: { fontFamily: 'Arial', fontSize: 32, fontWeight: '700', color: '#333333' },
  body: { fontFamily: 'Arial', fontSize: 18, fontWeight: '400', color: '#000000' },
};

const textTemplates = [
  { key: 'title', label: 'Título Grande', icon: Heading1 },
  { key: 'subtitle', label: 'Subtítulo', icon: Heading2 },
  { key: 'body', label: 'Texto Normal', icon: AlignLeft },
  { key: 'small', label: 'Texto Pequeno', icon: Type },
];

export function TextPanel({ onAddObject }: TextPanelProps) {
  const { brandKit } = useBrandKit();
  
  const getTypographyStyle = (key: string): TypographyStyle => {
    const typography = brandKit?.typography;
    
    if (typography) {
      if (key === 'title' && typography.title) return typography.title;
      if (key === 'subtitle' && typography.subtitle) return typography.subtitle;
      if (key === 'body' && typography.body) return typography.body;
      if (key === 'small' && typography.body) {
        return {
          ...typography.body,
          fontSize: Math.max(12, typography.body.fontSize - 4),
        };
      }
    }
    
    // Fallback for 'small' which may not exist in brand kit
    if (key === 'small') {
      return {
        ...defaultTypography.body,
        fontSize: Math.max(12, defaultTypography.body.fontSize - 4),
      };
    }
    
    return defaultTypography[key] || defaultTypography.body;
  };

  const handleAddText = (template: typeof textTemplates[0]) => {
    const style = getTypographyStyle(template.key);
    
    const newText: CanvaObject = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 50,
      y: 50,
      text: template.label,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fontStyle: style.fontWeight === '700' ? 'bold' : 'normal',
      fill: style.color,
      width: 400,
      name: template.label,
    };
    onAddObject(newText);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground px-1">Adicionar Texto</h3>
      <div className="space-y-2">
        {textTemplates.map((template) => {
          const style = getTypographyStyle(template.key);
          return (
            <Button
              key={template.key}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleAddText(template)}
            >
              <template.icon className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">{template.label}</div>
                <div className="text-xs text-muted-foreground">
                  {style.fontFamily} • {style.fontSize}px
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
