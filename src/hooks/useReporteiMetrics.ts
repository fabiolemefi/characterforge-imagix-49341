import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

interface MetricValue {
  value: number | string;
  trend?: number[];
  comparison?: {
    value: number | string;
    diff: number;
    diff_percentage: number;
  };
}

interface Metric {
  id: string;
  name: string;
  description?: string;
  type?: string;
  value: MetricValue | null;
}

interface ReporteiMetricsResponse {
  metrics: Metric[];
  widgets: any[];
  raw: any;
}

export function useReporteiMetrics(
  integrationId: string | null,
  period: "7d" | "15d" | "30d" = "30d"
) {
  const getPeriodDates = () => {
    const today = new Date();
    const days = period === "7d" ? 7 : period === "15d" ? 15 : 30;
    
    const endDate = format(today, "yyyy-MM-dd");
    const startDate = format(subDays(today, days), "yyyy-MM-dd");
    const comparisonEndDate = format(subDays(today, days + 1), "yyyy-MM-dd");
    const comparisonStartDate = format(subDays(today, days * 2), "yyyy-MM-dd");

    return { startDate, endDate, comparisonStartDate, comparisonEndDate };
  };

  return useQuery({
    queryKey: ["reportei-metrics", integrationId, period],
    queryFn: async (): Promise<ReporteiMetricsResponse> => {
      if (!integrationId) {
        throw new Error("Integration ID is required");
      }

      const { startDate, endDate, comparisonStartDate, comparisonEndDate } = getPeriodDates();

      const { data, error } = await supabase.functions.invoke("get-reportei-metrics", {
        body: {
          integrationId,
          startDate,
          endDate,
          comparisonStartDate,
          comparisonEndDate,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!integrationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
