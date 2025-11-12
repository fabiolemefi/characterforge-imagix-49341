import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TestStatus } from "@/types/test";

interface TestMetrics {
  total: number;
  byStatus: Record<TestStatus, number>;
  byType: Record<string, number>;
  completed: number;
  inProgress: number;
}

export const useTestsMetrics = () => {
  return useQuery({
    queryKey: ["tests-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("status, test_types")
        .eq("is_active", true);

      if (error) throw error;

      const metrics: TestMetrics = {
        total: data.length,
        byStatus: {
          planejamento: 0,
          execucao: 0,
          analise: 0,
          documentacao: 0,
        },
        byType: {},
        completed: 0,
        inProgress: 0,
      };

      data.forEach((test) => {
        // Count by status
        metrics.byStatus[test.status as TestStatus]++;

        // Count completed vs in progress
        if (test.status === "documentacao") {
          metrics.completed++;
        } else {
          metrics.inProgress++;
        }

        // Count by type
        test.test_types?.forEach((type: string) => {
          metrics.byType[type] = (metrics.byType[type] || 0) + 1;
        });
      });

      return metrics;
    },
  });
};
