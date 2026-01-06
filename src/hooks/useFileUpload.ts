import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

// Função para criar hash de senha usando Web Crypto API
async function hashPassword(password: string): Promise<string> {
  // Gerar salt aleatório
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Criar hash
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Retornar no formato: salt$hash
  return `${salt}$${hashHex}`;
}

export interface UploadProgress {
  percentage: number;
  loaded: number;
  total: number;
  speed: number;
  timeRemaining: number;
  finalizing?: boolean;
}

export interface FileMetadata {
  fileName: string;
  expiresAt?: Date;
  password?: string;
}

const generateShareCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

export const useFileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File, metadata: FileMetadata): Promise<string> => {
    setIsUploading(true);
    
    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    setUploadProgress({
      percentage: 0,
      loaded: 0,
      total: file.size,
      speed: 0,
      timeRemaining: 0,
    });

    try {
      const shareCode = generateShareCode();
      const timestamp = Date.now();
      
      // Sanitizar nome do arquivo - remover caracteres especiais
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Substituir caracteres especiais por underscore
        .replace(/_{2,}/g, '_'); // Remover underscores duplicados
      
      const filePath = `${timestamp}-${sanitizedFileName}`;

      console.log(`[Upload] Iniciando upload: ${file.name} (${file.size} bytes)`);

      // Get session from store (already validated by ProtectedRoute)
      const session = useAuthStore.getState().session;
      if (!session) throw new Error('Usuário não autenticado');

      const uploadWithProgress = new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Tracking de progresso
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000; // segundos
            const bytesDiff = e.loaded - lastLoaded;
            const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
            const remaining = e.total - e.loaded;
            const timeRemaining = speed > 0 ? remaining / speed : 0;

            setUploadProgress({
              percentage: (e.loaded / e.total) * 100,
              loaded: e.loaded,
              total: e.total,
              speed: speed,
              timeRemaining: timeRemaining,
            });

            lastLoaded = e.loaded;
            lastTime = now;
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('[Upload] Upload concluído no storage');
            resolve();
          } else {
            // Capturar mensagem de erro do servidor
            let errorMessage = `Status ${xhr.status}: ${xhr.statusText}`;
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.error || response.message) {
                errorMessage = response.error || response.message;
              }
            } catch (e) {
              // Se não conseguir parsear, usa o responseText direto
              if (xhr.responseText) {
                errorMessage = xhr.responseText;
              }
            }
            console.error('[Upload] Erro do servidor:', errorMessage);
            reject(new Error(`Erro no upload: ${errorMessage}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Erro de rede durante o upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelado'));
        });

        // Configurar requisição - usar encodeURIComponent para o filePath
        const encodedFilePath = encodeURIComponent(filePath);
        const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/media-downloads/${encodedFilePath}`;
        console.log('[Upload] URL:', url);
        
        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.setRequestHeader('x-upsert', 'false');
        
        xhr.send(file);
      });

      await uploadWithProgress;

      // Atualizar progresso para mostrar fase de finalização
      setUploadProgress({
        percentage: 100,
        loaded: file.size,
        total: file.size,
        speed: 0,
        timeRemaining: 0,
        finalizing: true,
      });

      console.log('[Upload] Upload concluído no storage');
      console.log('[Upload] Criando registro no banco de dados');

      // Hash da senha se fornecida
      let passwordHash = null;
      if (metadata.password) {
        passwordHash = await hashPassword(metadata.password);
      }

      // Obter usuário do store
      const user = useAuthStore.getState().user;
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Criar registro na tabela
      console.log('[Upload] Criando registro no banco de dados');
      
      const { error: dbError } = await supabase
        .from('shared_files')
        .insert({
          user_id: user.id,
          file_name: metadata.fileName,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          share_code: shareCode,
          password_hash: passwordHash,
          expires_at: metadata.expiresAt?.toISOString(),
        });

      if (dbError) {
        console.error('[Upload] Erro ao criar registro:', dbError);
        // Remover arquivo se falhar ao criar registro
        await supabase.storage.from('media-downloads').remove([filePath]);
        throw new Error(`Erro ao criar registro: ${dbError.message}`);
      }
      
      console.log('[Upload] Registro criado com sucesso');

      setUploadProgress({
        percentage: 100,
        loaded: file.size,
        total: file.size,
        speed: file.size / ((Date.now() - startTime) / 1000),
        timeRemaining: 0,
      });

      return shareCode;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, uploadProgress, isUploading };
};
