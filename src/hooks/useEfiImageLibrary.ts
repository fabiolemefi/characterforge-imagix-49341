import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EfiImageCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  image_count?: number;
}

export interface EfiLibraryImage {
  id: string;
  category_id: string | null;
  name: string;
  url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  tags: string[];
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  category?: EfiImageCategory;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string | null;
  position?: number;
  is_active?: boolean;
}

export interface ImageFormData {
  category_id?: string | null;
  name: string;
  url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  tags?: string[];
  position?: number;
  is_active?: boolean;
}

export const useEfiImageLibrary = () => {
  const queryClient = useQueryClient();

  // Categories queries and mutations
  const categoriesQuery = useQuery({
    queryKey: ['efi-image-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efi_image_categories')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      return data as EfiImageCategory[];
    },
  });

  const categoriesWithCountQuery = useQuery({
    queryKey: ['efi-image-categories-with-count'],
    queryFn: async () => {
      const { data: categories, error: catError } = await supabase
        .from('efi_image_categories')
        .select('*')
        .order('position', { ascending: true });

      if (catError) throw catError;

      const { data: images, error: imgError } = await supabase
        .from('efi_library_images')
        .select('category_id');

      if (imgError) throw imgError;

      const countMap: Record<string, number> = {};
      images?.forEach(img => {
        if (img.category_id) {
          countMap[img.category_id] = (countMap[img.category_id] || 0) + 1;
        }
      });

      return (categories || []).map(cat => ({
        ...cat,
        image_count: countMap[cat.id] || 0,
      })) as EfiImageCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (formData: CategoryFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('efi_image_categories')
        .insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EfiImageCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...formData }: CategoryFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('efi_image_categories')
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as EfiImageCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('efi_image_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  // Images queries and mutations
  const imagesQuery = useQuery({
    queryKey: ['efi-library-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efi_library_images')
        .select(`
          *,
          category:efi_image_categories(*)
        `)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as EfiLibraryImage[];
    },
  });

  const createImage = useMutation({
    mutationFn: async (formData: ImageFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('efi_library_images')
        .insert({
          category_id: formData.category_id || null,
          name: formData.name,
          url: formData.url,
          thumbnail_url: formData.thumbnail_url || null,
          alt_text: formData.alt_text || null,
          tags: formData.tags || [],
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EfiLibraryImage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-library-images'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const updateImage = useMutation({
    mutationFn: async ({ id, ...formData }: ImageFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('efi_library_images')
        .update({
          category_id: formData.category_id || null,
          name: formData.name,
          url: formData.url,
          thumbnail_url: formData.thumbnail_url || null,
          alt_text: formData.alt_text || null,
          tags: formData.tags || [],
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as EfiLibraryImage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-library-images'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const deleteImage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('efi_library_images')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-library-images'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const uploadImage = async (file: File, categorySlug?: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = categorySlug ? `library/${categorySlug}/${fileName}` : `library/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('efi-code-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('efi-code-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  return {
    // Categories
    categories: categoriesQuery.data || [],
    categoriesWithCount: categoriesWithCountQuery.data || [],
    isLoadingCategories: categoriesQuery.isLoading || categoriesWithCountQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    
    // Images
    images: imagesQuery.data || [],
    isLoadingImages: imagesQuery.isLoading,
    createImage,
    updateImage,
    deleteImage,
    uploadImage,
  };
};
