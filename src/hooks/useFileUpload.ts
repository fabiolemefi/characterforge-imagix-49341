import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    setUploadProgress({
      percentage: 0,
      loaded: 0,
      total: file.size,
      speed: 0,
      timeRemaining: 0,
    });

    try {
      const startTime = Date.now();
      const shareCode = generateShareCode();
      const timestamp = Date.now();
      const filePath = `${timestamp}-${file.name}`;

      // Upload do arquivo com tracking de progresso
      console.log(`[Upload] Iniciando upload: ${file.name} (${file.size} bytes)`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media-downloads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Upload] Erro no storage:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }
      
      console.log('[Upload] Upload concluído no storage');

      // Hash da senha se fornecida
      let passwordHash = null;
      if (metadata.password) {
        passwordHash = await hashPassword(metadata.password);
      }

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

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
