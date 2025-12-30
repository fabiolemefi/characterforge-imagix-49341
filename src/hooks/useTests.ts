import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Test, TestStatus } from "@/types/test";
import { toast } from "sonner";
import { queryWithAuth } from "@/lib/queryWithAuth";

export const useTests = (filters?: { status?: TestStatus; createdBy?: string }) => {
  return useQuery({
    queryKey: ["tests", filters],
    queryFn: () => queryWithAuth(async () => {
      console.log("📡 [useTests] Iniciando fetch de tests...", { filters, timestamp: new Date().toISOString() });
      
      let query = supabase
        .from("tests")
        .select(`
          *,
          profiles!tests_created_by_fkey(full_name, email, avatar_url)
        `)
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
        console.error("❌ [useTests] FALHA ao carregar tests:", {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      console.log("✅ [useTests] SUCESSO - Tests carregados:", {
        count: data?.length || 0,
        timestamp: new Date().toISOString()
      });
      return data as unknown as Test[];
    }),
    staleTime: 2 * 60 * 1000,
  });
};

export const useTest = (id?: string) => {
  return useQuery({
    queryKey: ["test", id],
    queryFn: () => queryWithAuth(async () => {
      console.log("📡 [useTest] Iniciando fetch de test:", { id, timestamp: new Date().toISOString() });
      
      if (!id) return null;

      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("❌ [useTest] FALHA ao carregar test:", {
          id,
          error,
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
      
      console.log("✅ [useTest] SUCESSO - Test carregado:", { id, timestamp: new Date().toISOString() });
      return data as unknown as Test;
    }),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (test: Partial<Test>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("tests")
        .insert({
          ...test as any,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["tests-metrics"] });
      toast.success("Teste criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar teste: " + error.message);
    },
  });
};

export const useUpdateTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...test }: Partial<Test> & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("tests")
        .update({
          ...test as any,
          updated_by: user.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["test", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tests-metrics"] });
      queryClient.refetchQueries({ queryKey: ["tests"] });
      toast.success("Teste atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar teste: " + error.message);
    },
  });
};

export const useDeactivateTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Verificar se usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("tests")
        .update({ 
          is_active: false,
          updated_by: user.id
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["tests-metrics"] });
      toast.success("Teste excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir teste: " + error.message);
    },
  });
};

export const useTestCreators = () => {
  return useQuery({
    queryKey: ["test-creators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select(`
          created_by,
          profiles!tests_created_by_fkey(full_name, email)
        `)
        .eq("is_active", true);

      if (error) throw error;

      // Get unique creators
      const uniqueCreators = Array.from(
        new Map(data.map(item => [item.created_by, item.profiles])).entries()
      ).map(([id, profile]) => ({
        id,
        ...(profile as any),
      }));

      return uniqueCreators;
    },
  });
};
