import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
  raw?: any;
  message?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export function useReporteiMetrics(
  integrationId: string | null,
  dateRange?: DateRange
) {
  const getDates = () => {
    if (!dateRange) {
      // Default to last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        startDate: format(thirtyDaysAgo, "yyyy-MM-dd"),
        endDate: format(today, "yyyy-MM-dd"),
        comparisonStartDate: null,
        comparisonEndDate: null,
      };
    }

    const startDate = format(dateRange.from, "yyyy-MM-dd");
    const endDate = format(dateRange.to, "yyyy-MM-dd");
    
    // Calculate comparison period (same duration, before the selected period)
    const duration = dateRange.to.getTime() - dateRange.from.getTime();
    const comparisonEnd = new Date(dateRange.from.getTime() - 1);
    const comparisonStart = new Date(comparisonEnd.getTime() - duration);

    return {
      startDate,
      endDate,
      comparisonStartDate: format(comparisonStart, "yyyy-MM-dd"),
      comparisonEndDate: format(comparisonEnd, "yyyy-MM-dd"),
    };
  };

  return useQuery({
    queryKey: ["reportei-metrics", integrationId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<ReporteiMetricsResponse> => {
      if (!integrationId) {
        throw new Error("Integration ID is required");
      }

      const { startDate, endDate, comparisonStartDate, comparisonEndDate } = getDates();

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
