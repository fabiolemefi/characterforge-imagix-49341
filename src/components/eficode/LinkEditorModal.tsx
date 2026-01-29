import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link, Type } from 'lucide-react';

interface LinkEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementType: 'link' | 'button';
  initialText: string;
  initialHref: string | null;
  onSave: (text: string, href: string | null) => void;
}

export const LinkEditorModal = ({
  open,
  onOpenChange,
  elementType,
  initialText,
  initialHref,
  onSave,
}: LinkEditorModalProps) => {
  const [text, setText] = useState(initialText);
  const [href, setHref] = useState(initialHref || '');

  // Reset state when modal opens with new values
  useEffect(() => {
    if (open) {
      setText(initialText);
      setHref(initialHref || '');
    }
  }, [open, initialText, initialHref]);

  const handleSave = () => {
    onSave(text, elementType === 'link' ? href : null);
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

          {elementType === 'link' && (
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
