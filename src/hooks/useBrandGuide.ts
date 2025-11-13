import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandGuideCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  position: number;
  content: any;
  is_active: boolean;
  pages?: BrandGuidePage[];
}

export interface BrandGuidePage {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  position: number;
  content: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandGuideBlock {
  id: string;
  page_id?: string;
  category_id?: string;
  block_type: 'single_column' | 'two_columns' | 'three_columns' | 'title_only' | 'text_only' | 'image' | 'video' | 'embed';
  position: number;
  content: any;
  created_at: string;
  updated_at: string;
}

export const useBrandGuide = () => {
  const [categories, setCategories] = useState<BrandGuideCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('brand_guide_categories')
        .select('*')
        .eq('is_active', true)
        .order('position');

      if (categoriesError) throw categoriesError;

      const { data: pagesData, error: pagesError } = await supabase
        .from('brand_guide_pages')
        .select('*')
        .eq('is_active', true)
        .order('position');

      if (pagesError) throw pagesError;

      const categoriesWithPages = categoriesData?.map((category) => ({
        ...category,
        pages: pagesData?.filter((page) => page.category_id === category.id) || [],
      })) || [];

      setCategories(categoriesWithPages);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const loadPageContent = async (categorySlug: string, pageSlug?: string) => {
    try {
      // Tentar usar categoria do cache primeiro
      let category = categories.find(c => c.slug === categorySlug);
      
      // Se não estiver no cache, buscar do banco
      if (!category) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('brand_guide_categories')
          .select('*')
          .eq('slug', categorySlug)
          .single();

        if (categoryError) throw categoryError;
        category = categoryData;
      }

      if (!pageSlug) {
        const { data: blocks, error: blocksError } = await supabase
          .from('brand_guide_blocks')
          .select('*')
          .eq('category_id', category.id)
          .order('position');

        if (blocksError) throw blocksError;
        return { category, page: null, blocks: blocks || [] };
      }

      // Fazer requisições em paralelo para página e blocos
      const pagePromise = supabase
        .from('brand_guide_pages')
        .select('*')
        .eq('category_id', category.id)
        .eq('slug', pageSlug)
        .single();

      const [pageResult] = await Promise.all([pagePromise]);

      if (pageResult.error) throw pageResult.error;

      const { data: blocks, error: blocksError } = await supabase
        .from('brand_guide_blocks')
        .select('*')
        .eq('page_id', pageResult.data.id)
        .order('position');

      if (blocksError) throw blocksError;

      return { category, page: pageResult.data, blocks: blocks || [] };
    } catch (error: any) {
      console.error('Error loading page content:', error);
      toast.error('Erro ao carregar conteúdo da página');
      return null;
    }
  };

  const updateBlock = async (blockId: string, content: any) => {
    try {
      const { error } = await supabase
        .from('brand_guide_blocks')
        .update({ content })
        .eq('id', blockId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error updating block:', error);
      toast.error('Erro ao atualizar bloco');
      return false;
    }
  };

  const addBlock = async (pageId: string | null, categoryId: string | null, blockType: 'single_column' | 'two_columns' | 'three_columns' | 'title_only' | 'text_only' | 'image' | 'video' | 'embed') => {
    try {
      const { data: existingBlocks } = await supabase
        .from('brand_guide_blocks')
        .select('position')
        .or(pageId ? `page_id.eq.${pageId}` : `category_id.eq.${categoryId}`)
        .order('position', { ascending: false })
        .limit(1);

      const newPosition = existingBlocks && existingBlocks.length > 0 ? existingBlocks[0].position + 1 : 0;

      const defaultContent = blockType === 'single_column' 
        ? { title: '', subtitle: '', media_type: 'image', media_url: '', media_alt: '' }
        : blockType === 'two_columns'
        ? { columns: [
            { image_url: '', title: '', description: '' },
            { image_url: '', title: '', description: '' }
          ]}
        : blockType === 'three_columns'
        ? { columns: [
            { image_url: '', title: '', description: '' },
            { image_url: '', title: '', description: '' },
            { image_url: '', title: '', description: '' }
          ]}
        : blockType === 'title_only'
        ? { title: '' }
        : blockType === 'text_only'
        ? { text: '' }
        : blockType === 'image'
        ? { image_url: '', image_alt: '' }
        : blockType === 'video'
        ? { video_url: '' }
        : { embed_url: '' };

      const { data, error } = await supabase
        .from('brand_guide_blocks')
        .insert({
          page_id: pageId,
          category_id: categoryId,
          block_type: blockType,
          position: newPosition,
          content: defaultContent,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Bloco adicionado com sucesso');
      return data;
    } catch (error: any) {
      console.error('Error adding block:', error);
      toast.error('Erro ao adicionar bloco');
      return null;
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('brand_guide_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;
      toast.success('Bloco removido com sucesso');
      return true;
    } catch (error: any) {
      console.error('Error deleting block:', error);
      toast.error('Erro ao remover bloco');
      return false;
    }
  };

  const uploadAsset = async (file: File, path: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('brand-guide-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-guide-assets')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading asset:', error);
      toast.error('Erro ao fazer upload do arquivo');
      return null;
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return {
    categories,
    loading,
    loadCategories,
    loadPageContent,
    updateBlock,
    addBlock,
    deleteBlock,
    uploadAsset,
  };
};
