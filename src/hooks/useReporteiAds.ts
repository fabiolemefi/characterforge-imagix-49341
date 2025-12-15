import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Ad {
  id: string;
  name: string;
  cost: number;
  interactions: number;
  platform: 'meta' | 'google';
  integrationId: string;
  projectName: string;
  campaignName?: string;
}

export function useReporteiAds(platform: 'all' | 'meta' | 'google' = 'all') {
  return useQuery({
    queryKey: ["reportei-ads", platform],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-reportei-ads", {
        body: { platform },
      });

      if (error) throw error;
      return data.ads as Ad[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
