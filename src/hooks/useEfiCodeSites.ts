import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EfiCodeSite {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  content: Record<string, any>;
  html_content: string | null;
  css_content: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useEfiCodeSites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sitesQuery = useQuery({
    queryKey: ['efi-code-sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efi_code_sites')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as EfiCodeSite[];
    },
    enabled: !!user,
  });

  const createSite = useMutation({
    mutationFn: async (site: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('efi_code_sites')
        .insert({
          name: site.name,
          description: site.description || null,
          created_by: user?.id,
          content: {},
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as EfiCodeSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-sites'] });
      toast.success('Site criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar site: ' + error.message);
    },
  });

  const updateSite = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EfiCodeSite> & { id: string }) => {
      const { data, error } = await supabase
        .from('efi_code_sites')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as EfiCodeSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-sites'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar site: ' + error.message);
    },
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('efi_code_sites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-sites'] });
      toast.success('Site excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir site: ' + error.message);
    },
  });

  const duplicateSite = useMutation({
    mutationFn: async (site: EfiCodeSite) => {
      const { data, error } = await supabase
        .from('efi_code_sites')
        .insert({
          name: `${site.name} (cópia)`,
          description: site.description,
          content: site.content,
          html_content: site.html_content,
          css_content: site.css_content,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as EfiCodeSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-sites'] });
      toast.success('Site duplicado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao duplicar site: ' + error.message);
    },
  });

  return {
    sites: sitesQuery.data || [],
    isLoading: sitesQuery.isLoading,
    error: sitesQuery.error,
    createSite,
    updateSite,
    deleteSite,
    duplicateSite,
  };
};

export const useEfiCodeSite = (id: string | undefined) => {
  return useQuery({
    queryKey: ['efi-code-site', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('efi_code_sites')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as EfiCodeSite;
    },
    enabled: !!id,
  });
};
