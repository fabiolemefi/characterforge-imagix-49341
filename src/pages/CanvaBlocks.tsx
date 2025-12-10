import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCanvaBlocks, CanvaBlock, BLOCK_TYPES } from '@/hooks/useCanvaBlocks';
import { CanvaBlockModal } from '@/components/canva/CanvaBlockModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CanvaBlocks() {
  const { blocks, loading, reloadBlocks, deleteBlock } = useCanvaBlocks();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<CanvaBlock | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<CanvaBlock | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (block: CanvaBlock) => {
    setSelectedBlock(block);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedBlock(null);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!blockToDelete) return;
    setDeleting(true);
    await deleteBlock(blockToDelete.id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    setBlockToDelete(null);
  };

  const getTypeLabel = (type: string) => {
    return BLOCK_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blocos do Canva</h1>
          <p className="text-muted-foreground">Gerencie os blocos de código HTML para uso no Canva</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Criar novo bloco
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Thumb</TableHead>
              <TableHead>Nome do Bloco</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : blocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum bloco cadastrado. Clique em "Criar novo bloco" para começar.
                </TableCell>
              </TableRow>
            ) : (
              blocks.map((block) => (
                <TableRow key={block.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                      {block.thumbnail_url ? (
                        <img 
                          src={block.thumbnail_url} 
                          alt={block.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          N/A
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{block.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getTypeLabel(block.block_type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={block.is_active ? 'default' : 'outline'}>
                      {block.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(block.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(block)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setBlockToDelete(block);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CanvaBlockModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        block={selectedBlock}
        onSuccess={reloadBlocks}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o bloco "{blockToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
