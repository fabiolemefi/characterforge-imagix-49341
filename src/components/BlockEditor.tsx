import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisualBlockEditor } from './VisualBlockEditor';

interface BlockEditorProps {
  open: boolean;
  onClose: () => void;
  blockHtml: string;
  blockName: string;
  onSave: (newHtml: string) => void;
}

export const BlockEditor = ({
  open,
  onClose,
  blockHtml,
  blockName,
  onSave,
}: BlockEditorProps) => {
  const [html, setHtml] = useState(blockHtml);

  const handleSave = () => {
    onSave(html);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {blockName}</DialogTitle>
          <DialogDescription>
            Edite os textos e imagens do bloco ou acesse o código HTML no accordion abaixo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <VisualBlockEditor html={html} onUpdate={setHtml} />

          <div className="border rounded-md p-4 bg-muted/30">
            <p className="text-sm font-medium mb-2">Pré-visualização</p>
            <div 
              className="border rounded bg-white p-4"
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
