import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { 
  JiraOkr, 
  JiraArea, 
  JiraTask, 
  JiraTaskSubtask,
  CreateJiraTaskInput,
  CreateJiraOkrInput 
} from "@/types/jiraTask";

// ============ JIRA OKRs ============

export function useJiraOkrs() {
  return useQuery({
    queryKey: ["jira-okrs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jira_okrs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as JiraOkr[];
    },
  });
}

export function useCreateJiraOkr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJiraOkrInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("jira_okrs")
        .insert({
          name: input.name,
          jira_epic_key: input.jira_epic_key || null,
          description: input.description || null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as JiraOkr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jira-okrs"] });
      toast.success("OKR criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating OKR:", error);
      toast.error("Erro ao criar OKR");
    },
  });
}

export function useUpdateJiraOkr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: CreateJiraOkrInput & { id: string }) => {
      const { data, error } = await supabase
        .from("jira_okrs")
        .update({
          name: input.name,
          jira_epic_key: input.jira_epic_key || null,
          description: input.description || null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as JiraOkr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jira-okrs"] });
      toast.success("OKR atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating OKR:", error);
      toast.error("Erro ao atualizar OKR");
    },
  });
}

export function useDeleteJiraOkr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("jira_okrs")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jira-okrs"] });
      toast.success("OKR removido com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting OKR:", error);
      toast.error("Erro ao remover OKR");
    },
  });
}

// ============ JIRA AREAS ============

export function useJiraAreas() {
  return useQuery({
    queryKey: ["jira-areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jira_areas")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      // Parse default_subtasks from JSON
      return data.map(area => ({
        ...area,
        default_subtasks: Array.isArray(area.default_subtasks) 
          ? area.default_subtasks 
          : JSON.parse(area.default_subtasks as unknown as string)
      })) as JiraArea[];
    },
  });
}

// ============ JIRA TASKS ============

export function useJiraTasks() {
  return useQuery({
    queryKey: ["jira-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jira_tasks")
        .select(`
          *,
          jira_okr:jira_okrs(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as JiraTask[];
    },
  });
}

export function useJiraTaskWithSubtasks(taskId: string) {
  return useQuery({
    queryKey: ["jira-task", taskId],
    queryFn: async () => {
      const { data: task, error: taskError } = await supabase
        .from("jira_tasks")
        .select(`
          *,
          jira_okr:jira_okrs(*)
        `)
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;

      const { data: subtasks, error: subtasksError } = await supabase
        .from("jira_task_subtasks")
        .select(`
          *,
          jira_area:jira_areas(*)
        `)
        .eq("jira_task_id", taskId)
        .order("created_at", { ascending: true });

      if (subtasksError) throw subtasksError;

      return {
        task: task as JiraTask,
        subtasks: subtasks as JiraTaskSubtask[],
      };
    },
    enabled: !!taskId,
  });
}

export function useCreateJiraTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJiraTaskInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get user session for the edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      // Call edge function to create task in Jira
      const { data, error } = await supabase.functions.invoke("create-jira-task", {
        body: {
          ...input,
          user_id: user.id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jira-tasks"] });
      toast.success("Tarefa criada no Jira com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating Jira task:", error);
      toast.error(`Erro ao criar tarefa: ${error.message}`);
    },
  });
}

// ============ METRICS ============

export function useJiraTasksMetrics() {
  return useQuery({
    queryKey: ["jira-tasks-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jira_tasks")
        .select("id, status, created_at, areas");

      if (error) throw error;

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeek = new Date(now);
      thisWeek.setDate(now.getDate() - now.getDay());

      const total = data.length;
      const created = data.filter(t => t.status === 'created').length;
      const failed = data.filter(t => t.status === 'failed').length;
      const thisMonthCount = data.filter(t => new Date(t.created_at) >= thisMonth).length;
      const thisWeekCount = data.filter(t => new Date(t.created_at) >= thisWeek).length;

      // Count by area
      const areaCount: Record<string, number> = {};
      data.forEach(t => {
        (t.areas || []).forEach((area: string) => {
          areaCount[area] = (areaCount[area] || 0) + 1;
        });
      });

      return {
        total,
        created,
        failed,
        thisMonth: thisMonthCount,
        thisWeek: thisWeekCount,
        byArea: areaCount,
      };
    },
  });
}
