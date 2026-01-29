import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, Type, Image, ExternalLink } from 'lucide-react';

interface LinkEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementType: 'link' | 'button';
  initialText: string;
  initialHref: string | null;
  initialTarget: string | null;
  hasInnerImage: boolean;
  innerImageSrc: string | null;
  onSave: (text: string, href: string | null, target: string | null) => void;
  onChangeImage: () => void;
}

export const LinkEditorModal = ({
  open,
  onOpenChange,
  elementType,
  initialText,
  initialHref,
  initialTarget,
  hasInnerImage,
  innerImageSrc,
  onSave,
  onChangeImage,
}: LinkEditorModalProps) => {
  const [text, setText] = useState(initialText);
  const [href, setHref] = useState(initialHref || '');
  const [target, setTarget] = useState(initialTarget || '_self');

  // Reset state when modal opens with new values
  useEffect(() => {
    if (open) {
      setText(initialText);
      setHref(initialHref || '');
      setTarget(initialTarget || '_self');
    }
  }, [open, initialText, initialHref, initialTarget]);

  const handleSave = () => {
    const finalTarget = target === '_self' ? null : target;
    onSave(text, href || null, finalTarget);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {elementType === 'link' ? (
              <>
                <Link className="h-5 w-5 text-emerald-500" />
                Editar Link
              </>
            ) : (
              <>
                <Type className="h-5 w-5 text-emerald-500" />
                Editar Botão
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="text">Texto</Label>
            <Input
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Texto do elemento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="href">URL (href)</Label>
            <Input
              id="href"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Abrir em</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="target">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_self">
                  <span className="flex items-center gap-2">
                    Mesma janela
                  </span>
                </SelectItem>
                <SelectItem value="_blank">
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Nova janela
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasInnerImage && (
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                onClick={onChangeImage}
              >
                <Image className="h-4 w-4" />
                Trocar Ícone
              </Button>
              {innerImageSrc && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Atual: {innerImageSrc.split('/').pop()}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
