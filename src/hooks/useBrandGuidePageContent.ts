import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrandGuideBlock {
  id: string;
  page_id?: string;
  category_id?: string;
  block_type: 'single_column' | 'two_columns' | 'three_columns' | 'title_only' | 'text_only' | 'image' | 'video' | 'embed' | 'separator';
  position: number;
  content: any;
  created_at: string;
  updated_at: string;
}

interface PageContentData {
  category: any;
  page: any | null;
  blocks: BrandGuideBlock[];
}

const fetchPageContent = async (categorySlug: string, pageSlug?: string): Promise<PageContentData | null> => {
  // Buscar categoria
  const { data: category, error: categoryError } = await supabase
    .from('brand_guide_categories')
    .select('*')
    .eq('slug', categorySlug)
    .single();

  if (categoryError || !category) return null;

  if (!pageSlug) {
    // Buscar blocos da categoria diretamente
    const { data: blocks } = await supabase
      .from('brand_guide_blocks')
      .select('*')
      .eq('category_id', category.id)
      .order('position');

    return { category, page: null, blocks: blocks || [] };
  }

  // Buscar página e blocos em paralelo
  const { data: page, error: pageError } = await supabase
    .from('brand_guide_pages')
    .select('*')
    .eq('category_id', category.id)
    .eq('slug', pageSlug)
    .single();

  if (pageError || !page) return { category, page: null, blocks: [] };

  const { data: blocks } = await supabase
    .from('brand_guide_blocks')
    .select('*')
    .eq('page_id', page.id)
    .order('position');

  return { category, page, blocks: blocks || [] };
};

export const useBrandGuidePageContent = (categorySlug?: string, pageSlug?: string) => {
  return useQuery({
    queryKey: ['brand-guide-content', categorySlug, pageSlug],
    queryFn: () => fetchPageContent(categorySlug!, pageSlug),
    enabled: !!categorySlug,
    staleTime: 10 * 60 * 1000, // 10 minutos - considera dados frescos
    gcTime: 30 * 60 * 1000,    // 30 minutos - mantém no cache
  });
};

// Hook para prefetch de páginas (usado no hover do sidebar)
export const usePrefetchBrandGuidePage = () => {
  const queryClient = useQueryClient();

  const prefetch = (categorySlug: string, pageSlug?: string) => {
    queryClient.prefetchQuery({
      queryKey: ['brand-guide-content', categorySlug, pageSlug],
      queryFn: () => fetchPageContent(categorySlug, pageSlug),
      staleTime: 10 * 60 * 1000,
    });
  };

  return prefetch;
};
