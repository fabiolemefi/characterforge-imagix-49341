import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BrandKit, BrandKitFolder, BrandKitAsset, Typography, BrandColor } from '@/types/brandKit';
import { toast } from 'sonner';

export function useBrandKit() {
  const queryClient = useQueryClient();

  // Fetch the active brand kit
  const { data: brandKit, isLoading: isLoadingKit } = useQuery({
    queryKey: ['brand-kit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_kit')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return {
        ...data,
        typography: data.typography as unknown as Typography,
        color_palette: data.color_palette as unknown as BrandColor[],
      } as BrandKit;
    },
  });

  // Fetch folders
  const { data: folders = [], isLoading: isLoadingFolders } = useQuery({
    queryKey: ['brand-kit-folders', brandKit?.id],
    queryFn: async () => {
      if (!brandKit?.id) return [];
      const { data, error } = await supabase
        .from('brand_kit_folders')
        .select('*')
        .eq('brand_kit_id', brandKit.id)
        .order('position');

      if (error) throw error;
      return data as BrandKitFolder[];
    },
    enabled: !!brandKit?.id,
  });

  // Fetch assets
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery({
    queryKey: ['brand-kit-assets', brandKit?.id],
    queryFn: async () => {
      if (!brandKit?.id) return [];
      const { data, error } = await supabase
        .from('brand_kit_assets')
        .select('*')
        .eq('brand_kit_id', brandKit.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BrandKitAsset[];
    },
    enabled: !!brandKit?.id,
  });

  // Update typography
  const updateTypography = useMutation({
    mutationFn: async (typography: Typography) => {
      if (!brandKit?.id) throw new Error('No brand kit found');
      const { error } = await supabase
        .from('brand_kit')
        .update({ typography: JSON.parse(JSON.stringify(typography)), updated_at: new Date().toISOString() })
        .eq('id', brandKit.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit'] });
      toast.success('Tipografia atualizada');
    },
    onError: () => toast.error('Erro ao atualizar tipografia'),
  });

  // Update color palette
  const updateColorPalette = useMutation({
    mutationFn: async (color_palette: BrandColor[]) => {
      if (!brandKit?.id) throw new Error('No brand kit found');
      const { error } = await supabase
        .from('brand_kit')
        .update({ color_palette: JSON.parse(JSON.stringify(color_palette)), updated_at: new Date().toISOString() })
        .eq('id', brandKit.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit'] });
      toast.success('Paleta de cores atualizada');
    },
    onError: () => toast.error('Erro ao atualizar paleta'),
  });

  // Create folder
  const createFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string }) => {
      if (!brandKit?.id) throw new Error('No brand kit found');
      const { error } = await supabase.from('brand_kit_folders').insert({
        brand_kit_id: brandKit.id,
        parent_id: parentId || null,
        name,
        position: folders.length,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit-folders'] });
      toast.success('Pasta criada');
    },
    onError: () => toast.error('Erro ao criar pasta'),
  });

  // Delete folder
  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('brand_kit_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit-folders'] });
      queryClient.invalidateQueries({ queryKey: ['brand-kit-assets'] });
      toast.success('Pasta excluída');
    },
    onError: () => toast.error('Erro ao excluir pasta'),
  });

  // Upload asset
  const uploadAsset = useMutation({
    mutationFn: async ({ file, folderId }: { file: File; folderId?: string }) => {
      if (!brandKit?.id) throw new Error('No brand kit found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${brandKit.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-kit-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-kit-assets')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('brand_kit_assets').insert({
        brand_kit_id: brandKit.id,
        folder_id: folderId || null,
        name: file.name,
        file_url: publicUrl,
        file_type: fileExt || 'unknown',
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit-assets'] });
      toast.success('Asset enviado');
    },
    onError: () => toast.error('Erro ao enviar asset'),
  });

  // Delete asset
  const deleteAsset = useMutation({
    mutationFn: async (asset: BrandKitAsset) => {
      // Extract file path from URL
      const urlParts = asset.file_url.split('/brand-kit-assets/');
      if (urlParts[1]) {
        await supabase.storage.from('brand-kit-assets').remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from('brand_kit_assets')
        .delete()
        .eq('id', asset.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit-assets'] });
      toast.success('Asset excluído');
    },
    onError: () => toast.error('Erro ao excluir asset'),
  });

  return {
    brandKit,
    folders,
    assets,
    isLoading: isLoadingKit || isLoadingFolders || isLoadingAssets,
    updateTypography,
    updateColorPalette,
    createFolder,
    deleteFolder,
    uploadAsset,
    deleteAsset,
  };
}
