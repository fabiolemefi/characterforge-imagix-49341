import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailMagicConfig {
  id: string;
  reference_images: string[];
  system_instruction: string;
  top_p: number;
  temperature: number;
  thinking_level: string;
  max_output_tokens: number;
  created_at: string;
  updated_at: string;
}

export const useEmailMagicConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['email-magic-config'],
    queryFn: async () => {
      console.log('🔄 [EmailMagicConfig] Loading config...');
      
      const { data, error } = await supabase
        .from('email_magic_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ [EmailMagicConfig] Error:', error);
        throw error;
      }

      console.log('✅ [EmailMagicConfig] Config loaded');
      return data as EmailMagicConfig | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<EmailMagicConfig>) => {
      const { data: existing } = await supabase
        .from('email_magic_config')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('email_magic_config')
          .update(updates)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_magic_config')
          .insert([updates]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-magic-config'] });
      toast({
        title: 'Configuração salva',
        description: 'As configurações foram atualizadas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('email-magic-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('email-magic-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    try {
      const fileName = imageUrl.split('/').pop();
      if (!fileName) return false;

      const { error } = await supabase.storage
        .from('email-magic-images')
        .remove([fileName]);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar imagem',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateConfig,
    uploadImage,
    deleteImage,
  };
};
