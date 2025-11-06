import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BrandGuideBlock } from './useBrandGuide';

export const useBrandGuideHomeBlocks = () => {
  return useQuery({
    queryKey: ['brand-guide-home-blocks'],
    queryFn: async () => {
      console.log('🔄 [ReactQuery] Carregando blocos da home do guia de marca...');
      
      const { data, error } = await supabase
        .from('brand_guide_blocks')
        .select('*')
        .is('page_id', null)
        .is('category_id', null)
        .order('position');

      if (error) {
        console.error('❌ [ReactQuery] Erro ao carregar blocos da home:', error);
        throw error;
      }

      console.log('✅ [ReactQuery] Blocos da home carregados:', data?.length);
      return data as BrandGuideBlock[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
