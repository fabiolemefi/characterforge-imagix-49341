import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createAuthenticatedQuery } from '@/services/supabaseWithAuth';

export interface Plugin {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_new: boolean;
  in_development: boolean;
}

export const usePlugins = () => {
  return useQuery({
    queryKey: ['plugins'],
    queryFn: async () => {
      return createAuthenticatedQuery<Plugin[]>(
        async () => supabase
          .from('plugins')
          .select('*')
          .eq('is_active', true)
          .eq('in_development', false)
          .order('name')
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};
