import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BlocksLibrary } from './BlocksLibrary';
import { EmailBlock } from '@/hooks/useEmailBlocks';

interface AddBlockModalProps {
  open: boolean;
  onClose: () => void;
  blocks: EmailBlock[];
  onAddBlock: (block: EmailBlock) => void;
}

export const AddBlockModal = ({ open, onClose, blocks, onAddBlock }: AddBlockModalProps) => {
  const handleAddBlock = (block: EmailBlock) => {
    onAddBlock(block);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Bloco</DialogTitle>
          <DialogDescription>
            Escolha um bloco para adicionar ao seu email
          </DialogDescription>
        </DialogHeader>
        <BlocksLibrary blocks={blocks} onAddBlock={handleAddBlock} />
      </DialogContent>
    </Dialog>
  );
};
