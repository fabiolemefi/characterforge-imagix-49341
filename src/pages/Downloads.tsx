import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Trash2, Lock, ExternalLink, Loader2, Edit } from 'lucide-react';
import { useSharedFiles } from '@/hooks/useSharedFiles';
import { UploadFileModal } from '@/components/UploadFileModal';
import { EditFileModal } from '@/components/EditFileModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Nunca';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const isExpired = (dateString: string | null): boolean => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

export default function Downloads() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editFile, setEditFile] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data: files, isLoading } = useSharedFiles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCopyLink = (shareCode: string) => {
    const link = `${window.location.origin}/share/file?code=${shareCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência',
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const fileIdToDelete = deleteId;
    setDeletingId(fileIdToDelete);
    setDeleteId(null);

    try {
      const file = files?.find((f) => f.id === fileIdToDelete);
      if (!file) return;

      // 1. Checar se o arquivo existe no storage
      const folder = file.file_path.substring(0, file.file_path.lastIndexOf('/'));
      const fileName = file.file_path.substring(file.file_path.lastIndexOf('/') + 1);

      const { data: listData } = await supabase.storage
        .from('media-downloads')
        .list(folder || undefined, {
          search: fileName,
        });

      const existsInStorage = listData?.some((f) => f.name === fileName);

      // 2. Se existe no storage, deletar
      if (existsInStorage) {
        const { error: storageError } = await supabase.storage
          .from('media-downloads')
          .remove([file.file_path]);

        if (storageError) {
          console.error('Erro ao deletar do storage:', storageError);
          // Continua mesmo assim para remover do banco
        }
      }

      // 3. Sempre deletar o registro do banco
      const { error: dbError } = await supabase
        .from('shared_files')
        .delete()
        .eq('id', fileIdToDelete);

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['shared-files'] });
      toast({
        title: 'Arquivo deletado',
        description: existsInStorage
          ? 'O arquivo foi removido com sucesso'
          : 'O registro foi removido (arquivo já não existia no storage)',
      });
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        title: 'Erro ao deletar',
        description: 'Não foi possível remover o arquivo',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Área para Download</h1>
          
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Download
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Proteção</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead>Downloads</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : files?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum arquivo compartilhado ainda
                </TableCell>
              </TableRow>
            ) : (
              files?.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium text-base">{file.file_name}</TableCell>
                  <TableCell className="text-sm">{formatBytes(file.file_size)}</TableCell>
                  <TableCell>
                    {file.password_hash ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(file.expires_at)}</TableCell>
                  <TableCell className="text-sm">{file.download_count}</TableCell>
                  <TableCell>
                    {isExpired(file.expires_at) ? (
                      <span className="text-destructive text-sm">Expirado</span>
                    ) : (
                      <span className="text-green-600 text-sm">Ativo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyLink(file.share_code)}
                        title="Copiar link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open(`/share/file?code=${file.share_code}`, '_blank')
                        }
                        title="Abrir página de download"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditFile(file)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(file.id)}
                        disabled={deletingId === file.id}
                        title="Deletar"
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UploadFileModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      <EditFileModal open={!!editFile} onOpenChange={(open) => !open && setEditFile(null)} file={editFile} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este arquivo? Esta ação não pode ser desfeita e o
              link de compartilhamento deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
