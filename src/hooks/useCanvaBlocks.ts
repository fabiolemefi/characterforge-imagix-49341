import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface CanvaBlock {
  id: string;
  name: string;
  block_type: string;
  html_content: string;
  thumbnail_url: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CanvaBlockType = 'header' | 'hero' | 'conteudo' | 'titulo' | 'assinatura' | 'footer';

export const BLOCK_TYPES: { value: CanvaBlockType; label: string }[] = [
  { value: 'header', label: 'Header' },
  { value: 'hero', label: 'Hero' },
  { value: 'conteudo', label: 'Conteúdo' },
  { value: 'titulo', label: 'Título' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'footer', label: 'Footer' },
];

export const useCanvaBlocks = () => {
  const [blocks, setBlocks] = useState<CanvaBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('canva_blocks')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setBlocks((data as CanvaBlock[]) || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar blocos',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const createBlock = async (block: Omit<CanvaBlock, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => {
    try {
      const { data, error } = await supabase
        .from('canva_blocks')
        .insert({
          ...block,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Bloco criado',
        description: 'O bloco foi criado com sucesso.',
      });

      await loadBlocks();
      return data as CanvaBlock;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar bloco',
        description: error.message,
      });
      return null;
    }
  };

  const updateBlock = async (id: string, block: Partial<CanvaBlock>) => {
    try {
      const { error } = await supabase
        .from('canva_blocks')
        .update({
          ...block,
          updated_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Bloco atualizado',
        description: 'O bloco foi atualizado com sucesso.',
      });

      await loadBlocks();
      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar bloco',
        description: error.message,
      });
      return false;
    }
  };

  const deleteBlock = async (id: string) => {
    try {
      const { error } = await supabase
        .from('canva_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Bloco excluído',
        description: 'O bloco foi excluído com sucesso.',
      });

      await loadBlocks();
      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir bloco',
        description: error.message,
      });
      return false;
    }
  };

  const uploadThumbnail = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('canva-blocks')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('canva-blocks')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: error.message,
      });
      return null;
    }
  };

  useEffect(() => {
    loadBlocks();
  }, []);

  return {
    blocks,
    loading,
    reloadBlocks: loadBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    uploadThumbnail,
  };
};
