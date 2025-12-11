import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BriefingStatus } from "@/types/briefing";

interface BriefingMetrics {
  total: number;
  byStatus: Record<BriefingStatus, number>;
  completed: number;
  inProgress: number;
}

export const useBriefingsMetrics = () => {
  return useQuery({
    queryKey: ["briefings-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select("status")
        .eq("is_active", true);

      if (error) throw error;

      const metrics: BriefingMetrics = {
        total: data.length,
        byStatus: {
          rascunho: 0,
          em_revisao: 0,
          aprovado: 0,
          concluido: 0,
        },
        completed: 0,
        inProgress: 0,
      };

      data.forEach((briefing) => {
        metrics.byStatus[briefing.status as BriefingStatus]++;

        if (briefing.status === "concluido") {
          metrics.completed++;
        } else {
          metrics.inProgress++;
        }
      });

      return metrics;
    },
  });
};
