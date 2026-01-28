import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EfiLink {
  id: string;
  user_id: string;
  link_pattern: 'onelink' | 'sejaefi';
  url_destino: string;
  deeplink?: string;
  deeplink_param?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  pid?: string;
  af_channel?: string;
  c?: string;
  af_adset?: string;
  af_ad?: string;
  original_url?: string;
  shortened_url?: string;
  shortened_code?: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export type EfiLinkInsert = Omit<EfiLink, 'id' | 'created_at' | 'updated_at'>;
export type EfiLinkUpdate = Partial<Omit<EfiLink, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export interface EfiLinkWithCreator extends EfiLink {
  creator?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export function useEfiLinks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['efi-links', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Buscar links
      const { data: links, error: linksError } = await supabase
        .from('efi_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      // Buscar user_ids únicos
      const userIds = [...new Set(links.map(l => l.user_id))];
      
      // Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Retorna links sem creator em caso de erro
        return links as EfiLinkWithCreator[];
      }

      // Mapear profiles por id
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Juntar dados
      return links.map(link => ({
        ...link,
        creator: profilesMap.get(link.user_id) || undefined,
      })) as EfiLinkWithCreator[];
    },
    enabled: !!user?.id,
  });
}

export function useEfiLink(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['efi-link', id],
    queryFn: async () => {
      if (!id || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('efi_links')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as EfiLink | null;
    },
    enabled: !!id && !!user?.id,
  });
}

export function useCreateEfiLink() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (link: Omit<EfiLinkInsert, 'user_id'>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('efi_links')
        .insert({ ...link, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as EfiLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-links'] });
      toast.success('Link criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar link:', error);
      toast.error('Erro ao criar link');
    },
  });
}

export function useUpdateEfiLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EfiLinkUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('efi_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as EfiLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-links'] });
      toast.success('Link atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar link:', error);
      toast.error('Erro ao atualizar link');
    },
  });
}

export function useDeleteEfiLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('efi_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-links'] });
      toast.success('Link excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir link:', error);
      toast.error('Erro ao excluir link');
    },
  });
}

// Função helper para gerar URL completa baseada nos parâmetros
export function generateFullUrl(link: Partial<EfiLink>): string {
  const {
    link_pattern,
    url_destino,
    deeplink,
    deeplink_param,
    pid,
    af_channel,
    c,
    af_adset,
    af_ad,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
  } = link;

  if (!url_destino) return '';

  let finalLink: string;

  if (link_pattern === 'sejaefi') {
    finalLink = `https://link.sejaefi.com.br/JQdZ?af_web_dp=${encodeURIComponent(url_destino)}`;
    
    if (deeplink) {
      finalLink += `&deep_link_value=${encodeURIComponent(deeplink)}`;
    }
    
    if (deeplink_param) {
      finalLink += `&product_id=${encodeURIComponent(deeplink_param)}`;
    }
  } else {
    finalLink = `https://efibank.onelink.me/sOnA?af_ios_url=${encodeURIComponent(url_destino)}&af_android_url=${encodeURIComponent(url_destino)}&af_web_dp=${encodeURIComponent(url_destino)}`;
  }

  // Adiciona parâmetros AppsFlyer
  if (pid) finalLink += `&pid=${encodeURIComponent(pid)}`;
  if (af_channel) finalLink += `&af_channel=${encodeURIComponent(af_channel)}`;
  if (c) finalLink += `&c=${encodeURIComponent(c)}`;
  if (af_adset) finalLink += `&af_adset=${encodeURIComponent(af_adset)}`;
  if (af_ad) finalLink += `&af_ad=${encodeURIComponent(af_ad)}`;

  // Adiciona parâmetros UTM
  if (utm_source) finalLink += `&utm_source=${encodeURIComponent(utm_source)}`;
  if (utm_medium) finalLink += `&utm_medium=${encodeURIComponent(utm_medium)}`;
  if (utm_campaign) finalLink += `&utm_campaign=${encodeURIComponent(utm_campaign)}`;
  if (utm_content) finalLink += `&utm_content=${encodeURIComponent(utm_content)}`;
  if (utm_term) finalLink += `&utm_term=${encodeURIComponent(utm_term)}`;

  return finalLink;
}
