import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface ColorItem {
  name: string;
  hex: string;
  rgb: string;
  cmyk: string;
}

interface ColorPaletteBlockProps {
  blockId: string;
  content: { colors?: ColorItem[] };
  isAdmin: boolean;
  columns: 2 | 3;
  onContentChange: (content: any) => void;
}

const hexToRgb = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return '';
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '';
  return `${r}, ${g}, ${b}`;
};

const isLightColor = (hex: string): boolean => {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return true;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r)) return true;
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
};

export function ColorPaletteBlock({ blockId, content, isAdmin, columns, onContentChange }: ColorPaletteBlockProps) {
  const [colors, setColors] = useState<ColorItem[]>(content?.colors || []);

  useEffect(() => {
    setColors(content?.colors || []);
  }, [content]);

  const updateColors = (updated: ColorItem[]) => {
    setColors(updated);
    onContentChange({ colors: updated });
  };

  const handleFieldChange = (index: number, field: keyof ColorItem, value: string) => {
    const updated = [...colors];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'hex') {
      const hexVal = value.startsWith('#') ? value : `#${value}`;
      updated[index].hex = hexVal;
      updated[index].rgb = hexToRgb(hexVal);
    }
    updateColors(updated);
  };

  const addColor = () => {
    updateColors([...colors, { name: '', hex: '#', rgb: '', cmyk: '' }]);
  };

  const removeColor = (index: number) => {
    updateColors(colors.filter((_, i) => i !== index));
  };

  const gridClass = columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="py-6">
      <div className={`grid ${gridClass} gap-6`}>
        {colors.map((color, index) => {
          const validHex = color.hex && color.hex.length >= 4 ? color.hex : '#cccccc';
          const light = isLightColor(validHex);

          return (
            <div key={index} className="relative group/color">
              {/* Color square */}
              <div
                className="w-full aspect-[4/3] rounded-lg mb-3"
                style={{
                  backgroundColor: validHex,
                  border: light ? '1px solid hsl(var(--border))' : 'none',
                }}
              />

              {isAdmin ? (
                <div className="space-y-2">
                  <Input
                    value={color.name}
                    onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                    placeholder="Nome da cor"
                    className="font-semibold"
                  />
                  <div className="grid grid-cols-[60px_1fr] gap-x-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground font-medium">Hex</span>
                    <Input
                      value={color.hex}
                      onChange={(e) => handleFieldChange(index, 'hex', e.target.value)}
                      placeholder="#000000"
                      className="h-7 text-sm"
                    />
                    <span className="text-muted-foreground font-medium">RGB</span>
                    <Input
                      value={color.rgb}
                      readOnly
                      className="h-7 text-sm bg-muted"
                    />
                    <span className="text-muted-foreground font-medium">CMYK</span>
                    <Input
                      value={color.cmyk}
                      onChange={(e) => handleFieldChange(index, 'cmyk', e.target.value)}
                      placeholder="0, 0, 0, 100"
                      className="h-7 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive opacity-0 group-hover/color:opacity-100 transition-opacity"
                    onClick={() => removeColor(index)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {color.name && <p className="font-semibold text-foreground">{color.name}</p>}
                  <div className="border-t border-border pt-2 grid grid-cols-[60px_1fr] gap-x-2 gap-y-0.5 text-sm">
                    {color.hex && (
                      <>
                        <span className="text-muted-foreground">Hex</span>
                        <span className="text-foreground">{color.hex}</span>
                      </>
                    )}
                    {color.rgb && (
                      <>
                        <span className="text-muted-foreground">RGB</span>
                        <span className="text-foreground">{color.rgb}</span>
                      </>
                    )}
                    {color.cmyk && (
                      <>
                        <span className="text-muted-foreground">CMYK</span>
                        <span className="text-foreground">{color.cmyk}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={addColor}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Cor
          </Button>
        </div>
      )}
    </div>
  );
}
