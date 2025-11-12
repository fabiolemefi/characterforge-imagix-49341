import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Test, TestStatus } from "@/types/test";
import { toast } from "sonner";

export const useTests = (filters?: { status?: TestStatus; createdBy?: string }) => {
  return useQuery({
    queryKey: ["tests", filters],
    queryFn: async () => {
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
        console.error("Error fetching tests:", error);
        throw error;
      }
      
      console.log("Tests fetched:", data);
      return data as unknown as Test[];
    },
  });
};

export const useTest = (id?: string) => {
  return useQuery({
    queryKey: ["test", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as Test;
    },
    enabled: !!id,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["test"] });
      queryClient.invalidateQueries({ queryKey: ["tests-metrics"] });
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
      const { error } = await supabase
        .from("tests")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["tests-metrics"] });
      toast.success("Teste desativado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao desativar teste: " + error.message);
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
