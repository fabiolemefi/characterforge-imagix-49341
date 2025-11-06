import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrandGuideCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  position: number;
  pages?: BrandGuidePage[];
}

export interface BrandGuidePage {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  position: number;
}

export const useBrandGuideCategories = () => {
  return useQuery({
    queryKey: ['brand-guide-categories'],
    queryFn: async () => {
      console.log('🔄 [ReactQuery] Carregando categorias do guia de marca...');
      
      const { data, error } = await supabase
        .from('brand_guide_categories')
        .select('*')
        .eq('is_active', true)
        .order('position');

      if (error) {
        console.error('❌ [ReactQuery] Erro ao carregar categorias:', error);
        throw error;
      }

      console.log('✅ [ReactQuery] Categorias carregadas:', data?.length);
      return data as BrandGuideCategory[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useBrandGuidePages = () => {
  return useQuery({
    queryKey: ['brand-guide-pages'],
    queryFn: async () => {
      console.log('🔄 [ReactQuery] Carregando páginas do guia de marca...');
      
      const { data, error } = await supabase
        .from('brand_guide_pages')
        .select('*')
        .eq('is_active', true)
        .order('position');

      if (error) {
        console.error('❌ [ReactQuery] Erro ao carregar páginas:', error);
        throw error;
      }

      console.log('✅ [ReactQuery] Páginas carregadas:', data?.length);
      return data as BrandGuidePage[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
