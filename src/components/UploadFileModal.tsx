import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FormContainer } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Upload, Lock } from 'lucide-react';

interface UploadFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatSpeed = (bytesPerSecond: number): string => {
  return formatBytes(bytesPerSecond) + '/s';
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
};

export function UploadFileModal({ open, onOpenChange }: UploadFileModalProps) {
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [password, setPassword] = useState('');
  const [shareLink, setShareLink] = useState('');
  const { uploadFile, uploadProgress, isUploading } = useFileUpload();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 1073741824) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 1GB',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      if (!fileName) {
        setFileName(selectedFile.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !fileName) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e selecione um arquivo',
        variant: 'destructive',
      });
      return;
    }

    if (password && (password.length !== 4 || !/^\d+$/.test(password))) {
      toast({
        title: 'Senha inválida',
        description: 'A senha deve ter exatamente 4 dígitos',
        variant: 'destructive',
      });
      return;
    }

    try {
      const shareCode = await uploadFile(file, {
        fileName,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        password: password || undefined,
      });

      const link = `${window.location.origin}/share/file?code=${shareCode}`;
      setShareLink(link);

      queryClient.invalidateQueries({ queryKey: ['shared-files'] });

      toast({
        title: 'Upload concluído!',
        description: 'Arquivo compartilhado com sucesso',
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível fazer upload do arquivo';
      toast({
        title: 'Erro no upload',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência',
    });
  };

  const handleClose = () => {
    setFileName('');
    setFile(null);
    setExpiresAt('');
    setPassword('');
    setShareLink('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Download</DialogTitle>
        </DialogHeader>

        {shareLink ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground mb-2">Link de compartilhamento:</p>
              <div className="flex gap-2">
                <Input value={shareLink} readOnly className="font-mono text-sm" />
                <Button onClick={handleCopyLink} size="icon" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">Concluir</Button>
          </div>
        ) : (
          <FormContainer>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">Nome do arquivo *</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Nome descritivo para o arquivo"
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Selecionar arquivo *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  required
                  className="cursor-pointer"
                />
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  Tamanho: {formatBytes(file.size)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Data de expiração</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
              />
              <p className="text-xs text-muted-foreground">Deixe em branco para nunca expirar</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Senha de 4 dígitos (opcional)
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                maxLength={4}
                pattern="[0-9]*"
              />
            </div>

            {isUploading && uploadProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}</span>
                  <span>{Math.round(uploadProgress.percentage)}%</span>
                </div>
                <Progress value={uploadProgress.percentage} />
                {uploadProgress.finalizing ? (
                  <div className="text-sm text-center text-muted-foreground">
                    Finalizando...
                  </div>
                ) : (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatSpeed(uploadProgress.speed)}</span>
                    <span>~{formatTime(uploadProgress.timeRemaining)} restantes</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Enviando...' : 'Upload'}
              </Button>
            </div>
          </form>
          </FormContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
