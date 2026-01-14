import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface EfiCodeBlock {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon_name: string;
  component_type: string;
  default_props: Record<string, unknown>;
  thumbnail_url: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EfiCodeBlockFormData {
  name: string;
  description?: string | null;
  category: string;
  icon_name: string;
  component_type: string;
  default_props?: Record<string, unknown>;
  thumbnail_url?: string | null;
  position?: number;
  is_active?: boolean;
}

const toEfiCodeBlock = (row: Record<string, unknown>): EfiCodeBlock => ({
  id: row.id as string,
  name: row.name as string,
  description: row.description as string | null,
  category: row.category as string,
  icon_name: row.icon_name as string,
  component_type: row.component_type as string,
  default_props: (row.default_props as Record<string, unknown>) || {},
  thumbnail_url: row.thumbnail_url as string | null,
  position: row.position as number,
  is_active: row.is_active as boolean,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

export const useEfiCodeBlocks = (onlyActive = false) => {
  const queryClient = useQueryClient();

  const blocksQuery = useQuery({
    queryKey: ['efi-code-blocks', onlyActive],
    queryFn: async () => {
      let query = supabase
        .from('efi_code_blocks')
        .select('*')
        .order('position', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => toEfiCodeBlock(row as Record<string, unknown>));
    },
  });

  const createBlock = useMutation({
    mutationFn: async (formData: EfiCodeBlockFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('efi_code_blocks')
        .insert({
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          icon_name: formData.icon_name,
          component_type: formData.component_type,
          default_props: (formData.default_props || {}) as Json,
          thumbnail_url: formData.thumbnail_url || null,
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return toEfiCodeBlock(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-blocks'] });
    },
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, ...formData }: EfiCodeBlockFormData & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('efi_code_blocks')
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          icon_name: formData.icon_name,
          component_type: formData.component_type,
          default_props: (formData.default_props || {}) as Json,
          thumbnail_url: formData.thumbnail_url || null,
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return toEfiCodeBlock(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-blocks'] });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('efi_code_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-blocks'] });
    },
  });

  const toggleBlockActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('efi_code_blocks')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-blocks'] });
    },
  });

  return {
    blocks: blocksQuery.data || [],
    isLoading: blocksQuery.isLoading,
    error: blocksQuery.error,
    createBlock,
    updateBlock,
    deleteBlock,
    toggleBlockActive,
  };
};
