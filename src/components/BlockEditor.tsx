import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface BlockEditorProps {
  open: boolean;
  onClose: () => void;
  blockHtml: string;
  blockName: string;
  onSave: (newHtml: string) => void;
}

export const BlockEditor = ({ open, onClose, blockHtml, blockName, onSave }: BlockEditorProps) => {
  const [html, setHtml] = useState(blockHtml);

  const handleSave = () => {
    onSave(html);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Editar Bloco: {blockName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>HTML do Bloco</Label>
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="font-mono text-xs min-h-[400px] mt-2"
              placeholder="Cole ou edite o HTML do bloco aqui..."
            />
            <p className="text-xs text-muted-foreground mt-2">
              Dica: Use CSS inline para garantir compatibilidade com clientes de email
            </p>
          </div>

          <div className="border rounded-lg p-4 bg-muted">
            <p className="text-sm font-medium mb-2">Preview:</p>
            <div 
              className="bg-white p-4 rounded border"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
