import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SiteSettings {
  id: string;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  twitter_card: string;
  favicon_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateSiteSettingsData {
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  twitter_card?: string;
  favicon_url?: string;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return data as SiteSettings;
    },
  });
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSiteSettingsData) => {
      // First get the single record
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .limit(1)
        .single();

      if (!existing) throw new Error("Site settings not found");

      const { data: updated, error } = await supabase
        .from("site_settings")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return updated as SiteSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    },
  });
}

export function useUploadSiteImage() {
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: "og_image" | "favicon" }) => {
      const fileName = `site-settings/${type}-${crypto.randomUUID()}-${file.name}`;
      
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
