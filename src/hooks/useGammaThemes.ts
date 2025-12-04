import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GammaTheme {
  id: string;
  name: string;
  type: 'standard' | 'custom';
  colorKeywords?: string[];
  toneKeywords?: string[];
}

export function useGammaThemes() {
  return useQuery({
    queryKey: ['gamma-themes'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-gamma-themes');
      if (error) throw error;
      return data.themes as GammaTheme[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
