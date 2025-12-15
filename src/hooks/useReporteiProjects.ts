import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReporteiIntegration {
  id: string;
  integration_id: string;
  source_name: string;
  integration_name: string;
}

export interface ReporteiProject {
  id: number;
  name: string;
  slug: string;
  avatar: string | null;
  integrations: ReporteiIntegration[];
}

interface ReporteiResponse {
  projects: ReporteiProject[];
  total: number;
}

export function useReporteiProjects() {
  return useQuery({
    queryKey: ["reportei-projects"],
    queryFn: async (): Promise<ReporteiProject[]> => {
      console.log("Fetching Reportei projects...");
      
      const { data, error } = await supabase.functions.invoke<ReporteiResponse>(
        "list-reportei-projects"
      );

      if (error) {
        console.error("Error fetching Reportei projects:", error);
        throw error;
      }

      console.log("Reportei projects fetched:", data?.projects?.length);
      return data?.projects || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
