import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ImageCampaign {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  prompt: string | null;
  access_code: string | null;
  is_active: boolean;
  customization_mode: 'always' | 'never' | 'user_choice';
  background_image_url: string | null;
  logo_url: string | null;
  seal_opacity: number | null;
  footer_text: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ImageCampaignAsset {
  id: string;
  campaign_id: string;
  image_url: string;
  thumbnail_url: string | null;
  name: string;
  is_visible: boolean;
  position: number;
  created_at: string;
}

export interface CreateCampaignData {
  title: string;
  slug: string;
  subtitle?: string;
  prompt?: string;
  access_code?: string;
  is_active?: boolean;
  customization_mode?: 'always' | 'never' | 'user_choice';
  background_image_url?: string;
  logo_url?: string;
  seal_opacity?: number;
  footer_text?: string;
}

export interface UpdateCampaignData extends Partial<CreateCampaignData> {
  id: string;
}

export interface CreateAssetData {
  campaign_id: string;
  image_url: string;
  thumbnail_url?: string;
  name: string;
  is_visible?: boolean;
  position?: number;
}

export interface UpdateAssetData {
  id: string;
  is_visible?: boolean;
  position?: number;
  name?: string;
  thumbnail_url?: string;
}

// Hook para listar todas as campanhas (admin)
export function useCampaigns() {
  return useQuery({
    queryKey: ["image-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ImageCampaign[];
    },
  });
}

// Hook para buscar uma campanha por slug (público)
export function useCampaign(slug: string | undefined) {
  return useQuery({
    queryKey: ["image-campaign", slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from("image_campaigns")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data as ImageCampaign | null;
    },
    enabled: !!slug,
    retry: 3,
    retryDelay: 1000,
    staleTime: 0,
  });
}

// Hook para listar assets de uma campanha
export function useCampaignAssets(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["image-campaign-assets", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from("image_campaign_assets")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as ImageCampaignAsset[];
    },
    enabled: !!campaignId,
  });
}

// Hook para criar campanha
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCampaignData) => {
      const { data: campaign, error } = await supabase
        .from("image_campaigns")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return campaign as ImageCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["image-campaigns"] });
      toast.success("Campanha criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar campanha: ${error.message}`);
    },
  });
}

// Hook para atualizar campanha
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCampaignData) => {
      const { data: campaign, error } = await supabase
        .from("image_campaigns")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return campaign as ImageCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["image-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["image-campaign", data.slug] });
      toast.success("Campanha atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar campanha: ${error.message}`);
    },
  });
}

// Hook para deletar campanha
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("image_campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["image-campaigns"] });
      toast.success("Campanha excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir campanha: ${error.message}`);
    },
  });
}

// Hook para criar asset
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAssetData) => {
      const { data: asset, error } = await supabase
        .from("image_campaign_assets")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return asset as ImageCampaignAsset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["image-campaign-assets", data.campaign_id] });
      toast.success("Asset adicionado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar asset: ${error.message}`);
    },
  });
}

// Hook para atualizar asset
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAssetData) => {
      const { data: asset, error } = await supabase
        .from("image_campaign_assets")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return asset as ImageCampaignAsset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["image-campaign-assets", data.campaign_id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar asset: ${error.message}`);
    },
  });
}

// Hook para deletar asset
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from("image_campaign_assets")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["image-campaign-assets", data.campaignId] });
      toast.success("Asset excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir asset: ${error.message}`);
    },
  });
}

// Hook para upload de imagem para storage
export function useUploadCampaignImage() {
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      const fileName = `${folder}/${crypto.randomUUID()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from("image-campaigns")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("image-campaigns")
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    },
    onError: (error: Error) => {
      toast.error(`Erro ao fazer upload: ${error.message}`);
    },
  });
}
