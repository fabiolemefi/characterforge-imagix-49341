import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface AIAssistantModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

export interface AIAssistantFieldSchema {
  name: string;
  type: string;
  required: boolean;
  options?: string[];
  auto_generate?: boolean;
  format?: string;
  min_length?: number;
  required_when_ready?: boolean;
}

export interface AIAssistant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  system_prompt: string;
  greeting_message: string | null;
  ready_message: string | null;
  model_config: AIAssistantModelConfig;
  fields_schema: AIAssistantFieldSchema[];
  validations: Record<string, unknown>;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface AIAssistantInsert {
  name: string;
  slug: string;
  description?: string | null;
  system_prompt: string;
  greeting_message?: string | null;
  ready_message?: string | null;
  model_config?: AIAssistantModelConfig;
  fields_schema?: AIAssistantFieldSchema[];
  validations?: Record<string, unknown>;
  is_active?: boolean;
  avatar_url?: string | null;
}

export interface AIAssistantUpdate extends Partial<AIAssistantInsert> {
  id: string;
}

// Helper to convert DB record to typed AIAssistant
function toAIAssistant(data: Record<string, unknown>): AIAssistant {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    description: data.description as string | null,
    system_prompt: data.system_prompt as string,
    greeting_message: data.greeting_message as string | null,
    ready_message: data.ready_message as string | null,
    model_config: data.model_config as AIAssistantModelConfig,
    fields_schema: (data.fields_schema || []) as AIAssistantFieldSchema[],
    validations: (data.validations || {}) as Record<string, unknown>,
    is_active: data.is_active as boolean,
    avatar_url: data.avatar_url as string | null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    created_by: data.created_by as string | null,
    updated_by: data.updated_by as string | null,
  };
}

export function useAIAssistants() {
  return useQuery({
    queryKey: ["ai-assistants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_assistants")
        .select("*")
        .order("name");

      if (error) throw error;
      return (data || []).map(toAIAssistant);
    },
  });
}

export function useAIAssistant(id: string | undefined) {
  return useQuery({
    queryKey: ["ai-assistants", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("ai_assistants")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return toAIAssistant(data as Record<string, unknown>);
    },
    enabled: !!id,
  });
}

export function useAIAssistantBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["ai-assistants", "slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("ai_assistants")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return toAIAssistant(data as Record<string, unknown>);
    },
    enabled: !!slug,
  });
}

export function useCreateAIAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assistant: AIAssistantInsert) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("ai_assistants")
        .insert({
          name: assistant.name,
          slug: assistant.slug,
          description: assistant.description,
          system_prompt: assistant.system_prompt,
          greeting_message: assistant.greeting_message,
          ready_message: assistant.ready_message,
          model_config: assistant.model_config as unknown as Json,
          fields_schema: assistant.fields_schema as unknown as Json,
          validations: assistant.validations as unknown as Json,
          is_active: assistant.is_active,
          avatar_url: assistant.avatar_url,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return toAIAssistant(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-assistants"] });
      toast.success("Assistente criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar assistente: ${error.message}`);
    },
  });
}

export function useUpdateAIAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AIAssistantUpdate) => {
      const { data: user } = await supabase.auth.getUser();
      
      const updatePayload: Record<string, unknown> = {
        updated_by: user.user?.id,
      };

      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.slug !== undefined) updatePayload.slug = updates.slug;
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.system_prompt !== undefined) updatePayload.system_prompt = updates.system_prompt;
      if (updates.greeting_message !== undefined) updatePayload.greeting_message = updates.greeting_message;
      if (updates.ready_message !== undefined) updatePayload.ready_message = updates.ready_message;
      if (updates.model_config !== undefined) updatePayload.model_config = updates.model_config as unknown as Json;
      if (updates.fields_schema !== undefined) updatePayload.fields_schema = updates.fields_schema as unknown as Json;
      if (updates.validations !== undefined) updatePayload.validations = updates.validations as unknown as Json;
      if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;
      if (updates.avatar_url !== undefined) updatePayload.avatar_url = updates.avatar_url;

      const { data, error } = await supabase
        .from("ai_assistants")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return toAIAssistant(data as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai-assistants"] });
      queryClient.invalidateQueries({ queryKey: ["ai-assistants", data.id] });
      toast.success("Assistente atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar assistente: ${error.message}`);
    },
  });
}

export function useDeleteAIAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_assistants")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-assistants"] });
      toast.success("Assistente excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir assistente: ${error.message}`);
    },
  });
}
