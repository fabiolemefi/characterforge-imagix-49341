import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BriefingStatus, Briefing } from "@/types/briefing";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { queryWithAuth } from "@/lib/queryWithAuth";

interface BriefingsFilter {
  status?: BriefingStatus;
  createdBy?: string;
}

export const useBriefings = (filters?: BriefingsFilter) => {
  return useQuery({
    queryKey: ["briefings", filters],
    queryFn: () => queryWithAuth(async () => {
      console.log("📡 [useBriefings] Iniciando fetch de briefings...", { filters, timestamp: new Date().toISOString() });
      
      let query = supabase
        .from("briefings")
        .select("*, profiles!briefings_created_by_fkey(full_name, email, avatar_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.createdBy) {
        query = query.eq("created_by", filters.createdBy);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("❌ [useBriefings] FALHA ao carregar briefings:", {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      console.log("✅ [useBriefings] SUCESSO - Briefings carregados:", {
        count: data?.length || 0,
        timestamp: new Date().toISOString()
      });
      return data as unknown as Briefing[];
    }),
    staleTime: 2 * 60 * 1000,
  });
};

export const useBriefing = (id?: string) => {
  return useQuery({
    queryKey: ["briefing", id],
    queryFn: () => queryWithAuth(async () => {
      console.log("📡 [useBriefing] Iniciando fetch de briefing:", { id, timestamp: new Date().toISOString() });
      
      if (!id) return null;
      const { data, error } = await supabase
        .from("briefings")
        .select("*, profiles!briefings_created_by_fkey(full_name, email, avatar_url)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("❌ [useBriefing] FALHA ao carregar briefing:", {
          id,
          error,
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      console.log("✅ [useBriefing] SUCESSO - Briefing carregado:", { id, timestamp: new Date().toISOString() });
      return data as unknown as Briefing | null;
    }),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateBriefing = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<Briefing>) => {
      const insertData = { ...data, created_by: user?.id } as any;
      delete insertData.profiles;
      
      const { data: result, error } = await supabase
        .from("briefings")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefings"] });
      queryClient.invalidateQueries({ queryKey: ["briefings-metrics"] });
      toast.success("Briefing criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating briefing:", error);
      toast.error("Erro ao criar briefing");
    },
  });
};

export const useUpdateBriefing = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Briefing> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("briefings")
        .update({
          ...data,
          updated_by: user?.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefings"] });
      queryClient.invalidateQueries({ queryKey: ["briefing"] });
      queryClient.invalidateQueries({ queryKey: ["briefings-metrics"] });
      toast.success("Briefing atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating briefing:", error);
      toast.error("Erro ao atualizar briefing");
    },
  });
};

export const useDeactivateBriefing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Verificar se usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("briefings")
        .update({ 
          is_active: false,
          updated_by: user.id
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefings"] });
      queryClient.invalidateQueries({ queryKey: ["briefings-metrics"] });
      toast.success("Briefing excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deactivating briefing:", error);
      toast.error("Erro ao excluir briefing: " + error.message);
    },
  });
};

export const useBriefingCreators = () => {
  return useQuery({
    queryKey: ["briefing-creators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select("created_by, profiles:created_by(full_name, email, avatar_url)")
        .eq("is_active", true);

      if (error) throw error;

      // Get unique creators
      const uniqueCreators = new Map();
      data?.forEach((item: any) => {
        if (!uniqueCreators.has(item.created_by)) {
          uniqueCreators.set(item.created_by, {
            id: item.created_by,
            ...item.profiles,
          });
        }
      });

      return Array.from(uniqueCreators.values());
    },
  });
};
