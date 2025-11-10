import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Trash2, Lock, ExternalLink, Loader2 } from 'lucide-react';
import { useSharedFiles } from '@/hooks/useSharedFiles';
import { UploadFileModal } from '@/components/UploadFileModal';
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

    setDeletingId(deleteId);
    setDeleteId(null); // Fechar modal imediatamente

    try {
      const file = files?.find((f) => f.id === deleteId);
      if (!file) return;

      console.log(`🗑️ Deletando arquivo: ${file.file_name}`);

      // Deletar arquivo do storage
      console.log('📦 Removendo do storage...');
      const { error: storageError } = await supabase.storage
        .from('media-downloads')
        .remove([file.file_path]);

      if (storageError) {
        console.error('❌ Erro ao deletar do storage:', storageError);
        throw storageError;
      }

      console.log('✅ Arquivo removido do storage');

      // Deletar registro do banco
      console.log('🗄️ Removendo registro do banco...');
      const { error: dbError } = await supabase
        .from('shared_files')
        .delete()
        .eq('id', deletingId);

      if (dbError) {
        console.error('❌ Erro ao deletar do banco:', dbError);
        throw dbError;
      }

      console.log('✅ Registro removido do banco');

      queryClient.invalidateQueries({ queryKey: ['shared-files'] });

      toast({
        title: 'Arquivo deletado',
        description: 'O arquivo foi removido com sucesso',
      });
    } catch (error) {
      console.error('❌ Erro ao deletar:', error);
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
          <p className="text-muted-foreground mt-1">
            Gerencie arquivos compartilhados com links públicos
          </p>
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
                  <TableCell className="font-medium">{file.file_name}</TableCell>
                  <TableCell>{formatBytes(file.file_size)}</TableCell>
                  <TableCell>
                    {file.password_hash ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatDate(file.expires_at)}</TableCell>
                  <TableCell>{file.download_count}</TableCell>
                  <TableCell>
                    {isExpired(file.expires_at) ? (
                      <span className="text-destructive">Expirado</span>
                    ) : (
                      <span className="text-green-600">Ativo</span>
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
