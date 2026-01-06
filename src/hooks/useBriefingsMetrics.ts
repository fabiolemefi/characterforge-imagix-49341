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
      console.log('📈 [useBriefingsMetrics] === FETCH START ===');
      console.log('📈 [useBriefingsMetrics] Timestamp:', new Date().toISOString());
      
      // Verificar sessão antes de buscar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('📈 [useBriefingsMetrics] Session check:', {
        hasSession: !!session,
        sessionError: sessionError?.message,
        userId: session?.user?.id
      });
      
      if (!session) {
        console.error('📈 [useBriefingsMetrics] ❌ No session - aborting fetch');
        throw new Error('Sessão não encontrada');
      }
      
      console.log('📈 [useBriefingsMetrics] Executando query...');
      const { data, error } = await supabase
        .from("briefings")
        .select("status")
        .eq("is_active", true);

      console.log('📈 [useBriefingsMetrics] Query result:', {
        success: !error,
        dataCount: data?.length || 0,
        error: error?.message
      });

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

      console.log('📈 [useBriefingsMetrics] === FETCH END (SUCCESS) ===', metrics);
      return metrics;
    },
    staleTime: 2 * 60 * 1000,
  });
};
