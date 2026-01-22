import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EfiCodeConfig {
  id: string;
  global_css: string;
  created_at: string;
  updated_at: string;
}

export const useEfiCodeConfig = () => {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['efi-code-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efi_code_config')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as EfiCodeConfig;
    },
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: { global_css: string }) => {
      const config = configQuery.data;
      if (!config) throw new Error('Config not found');
      
      const { data, error } = await supabase
        .from('efi_code_config')
        .update({
          global_css: updates.global_css,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as EfiCodeConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-config'] });
      toast.success('CSS global salvo!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar CSS: ' + error.message);
    },
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    globalCss: configQuery.data?.global_css || '',
    updateConfig,
  };
};
