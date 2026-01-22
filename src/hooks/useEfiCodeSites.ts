import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface PageSettings {
  containerMaxWidth: string;
  title: string;
  description: string;
  keywords: string;
  favicon: string;
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundAttachment: string;
  backgroundRepeat: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
  customHeadCode: string;
}

export const defaultPageSettings: PageSettings = {
  containerMaxWidth: '1200',
  title: '',
  description: '',
  keywords: '',
  favicon: '',
  backgroundColor: '#ffffff',
  backgroundImage: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'scroll',
  backgroundRepeat: 'no-repeat',
  googleAnalyticsId: '',
  facebookPixelId: '',
  customHeadCode: '',
};

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
  page_settings: PageSettings | null;
}

// Helper to convert DB row to EfiCodeSite
const toEfiCodeSite = (row: any): EfiCodeSite => ({
  ...row,
  page_settings: row.page_settings as PageSettings | null,
});

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
      return (data || []).map(toEfiCodeSite);
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
          page_settings: defaultPageSettings as unknown as Json,
        })
        .select()
        .single();
      
      if (error) throw error;
      return toEfiCodeSite(data);
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
    mutationFn: async ({ id, page_settings, ...updates }: Partial<EfiCodeSite> & { id: string }) => {
      const updateData: Record<string, any> = { ...updates };
      if (page_settings) {
        updateData.page_settings = page_settings as unknown as Json;
      }
      
      const { data, error } = await supabase
        .from('efi_code_sites')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return toEfiCodeSite(data);
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
          content: site.content as Json,
          html_content: site.html_content,
          css_content: site.css_content,
          page_settings: (site.page_settings || defaultPageSettings) as unknown as Json,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return toEfiCodeSite(data);
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
      return toEfiCodeSite(data);
    },
    enabled: !!id,
  });
};
