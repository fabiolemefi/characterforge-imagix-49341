import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ColorItem {
  name: string;
  hex: string;
  rgb: string;
  cmyk: string;
  pantone: string;
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
  return `${r} ${g} ${b}`;
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

const copyHex = (hex: string) => {
  navigator.clipboard.writeText(hex);
  toast.success('Hex copiado!');
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
    updateColors([...colors, { name: '', hex: '#', rgb: '', cmyk: '', pantone: '' }]);
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
            <div key={index} className="relative group/color border border-border rounded-xl overflow-hidden bg-card">
              {/* Color swatch */}
              <div
                className="w-full aspect-[16/9]"
                style={{
                  backgroundColor: validHex,
                  borderBottom: light ? '1px solid hsl(var(--border))' : 'none',
                }}
              />

              <div className="p-4">
                {isAdmin ? (
                  <div className="space-y-3">
                    {/* Header: name + index */}
                    <div className="flex items-center justify-between">
                      <Input
                        value={color.name}
                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                        placeholder="Nome da cor"
                        className="font-bold text-base border-none shadow-none px-0 h-auto focus-visible:ring-0"
                      />
                      <span className="text-muted-foreground text-sm font-medium ml-2 shrink-0">{index + 1}</span>
                    </div>

                    <Separator />

                    {/* 2x2 grid for codes */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">Hex</span>
                        <Input
                          value={color.hex}
                          onChange={(e) => handleFieldChange(index, 'hex', e.target.value)}
                          placeholder="#000000"
                          className="h-7 text-sm mt-0.5"
                        />
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">CMYK</span>
                        <Input
                          value={color.cmyk}
                          onChange={(e) => handleFieldChange(index, 'cmyk', e.target.value)}
                          placeholder="0, 0, 0, 100"
                          className="h-7 text-sm mt-0.5"
                        />
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">RGB</span>
                        <Input
                          value={color.rgb}
                          readOnly
                          className="h-7 text-sm bg-muted mt-0.5"
                        />
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">Pantone</span>
                        <Input
                          value={color.pantone || ''}
                          onChange={(e) => handleFieldChange(index, 'pantone', e.target.value)}
                          placeholder="Ex: 375 C"
                          className="h-7 text-sm mt-0.5"
                        />
                      </div>
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
                  <div className="space-y-3">
                    {/* Header: name + index */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-foreground">{color.name || 'Sem nome'}</span>
                      <span className="text-muted-foreground text-sm font-medium">{index + 1}</span>
                    </div>

                    <Separator />

                    {/* 2x2 grid for codes */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">Hex</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-foreground">{color.hex}</span>
                          <button
                            onClick={() => copyHex(color.hex)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copiar Hex"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {color.cmyk && (
                        <div>
                          <span className="text-muted-foreground text-xs font-medium">CMYK</span>
                          <p className="text-foreground mt-0.5">{color.cmyk}</p>
                        </div>
                      )}
                      {color.rgb && (
                        <div>
                          <span className="text-muted-foreground text-xs font-medium">RGB</span>
                          <p className="text-foreground mt-0.5">{color.rgb}</p>
                        </div>
                      )}
                      {color.pantone && (
                        <div>
                          <span className="text-muted-foreground text-xs font-medium">Pantone</span>
                          <p className="text-foreground mt-0.5">{color.pantone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
