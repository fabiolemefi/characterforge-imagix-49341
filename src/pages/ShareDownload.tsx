import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Lock, FileIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileInfo {
  file_name: string;
  file_size: number;
  file_type: string;
  password_hash: string | null;
  expires_at: string | null;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export default function ShareDownload() {
  const [searchParams] = useSearchParams();
  const shareCode = searchParams.get('code');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (shareCode) {
      loadFileInfo();
    } else {
      setError('Link inválido');
      setIsLoading(false);
    }
  }, [shareCode]);

  const loadFileInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_files')
        .select('file_name, file_size, file_type, password_hash, expires_at')
        .eq('share_code', shareCode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setError('Link inválido ou expirado');
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('Este link expirou');
        return;
      }

      setFileInfo(data);
    } catch (error) {
      console.error('Erro ao carregar arquivo:', error);
      setError('Erro ao carregar informações do arquivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!shareCode) return;

    if (fileInfo?.password_hash && !password) {
      toast({
        title: 'Senha necessária',
        description: 'Digite a senha para continuar',
        variant: 'destructive',
      });
      return;
    }

    setIsDownloading(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('validate-download', {
        body: {
          share_code: shareCode,
          password: password || undefined,
        },
      });

      // Verificar se há erro específico na resposta da edge function
      if (data?.error) {
        setError(data.error);
        return;
      }

      // Se houver erro genérico e não temos dados válidos
      if (error && !data?.download_url) {
        console.error('Erro no download:', error);
        setError('Erro ao processar download. Tente novamente.');
        return;
      }

      // Iniciar download
      window.location.href = data.download_url;

      toast({
        title: 'Download iniciado!',
        description: 'Seu arquivo está sendo baixado',
      });
    } catch (error: any) {
      console.error('Erro no download:', error);
      setError('Erro ao processar download. Tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !fileInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <FileIcon className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Download de Arquivo</h1>
        </div>

        {fileInfo && (
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome do arquivo</p>
              <p className="font-medium">{fileInfo.file_name}</p>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Tamanho</p>
                <p className="font-medium">{formatBytes(fileInfo.file_size)}</p>
              </div>
              {fileInfo.password_hash && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Protegido</span>
                </div>
              )}
            </div>

            {fileInfo.password_hash && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha de 4 dígitos</Label>
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
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              {isDownloading ? 'Preparando download...' : 'Baixar Arquivo'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
