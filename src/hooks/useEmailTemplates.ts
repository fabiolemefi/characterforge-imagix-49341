import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  preview_text: string | null;
  html_content: string;
  blocks_data?: any[];
  is_published: boolean;
  is_model: boolean; // true for models/templates
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name?: string | null;
    email: string;
  } | null;
}

export const useEmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTemplates = async () => {
    try {
      // Only fetch columns needed for listing (exclude heavy html_content and blocks_data)
      const { data, error } = await supabase
        .from('email_templates')
        .select(`
          id,
          name,
          description,
          subject,
          preview_text,
          is_published,
          is_model,
          created_by,
          updated_by,
          created_at,
          updated_at,
          profiles!email_templates_created_by_fkey (
            full_name,
            email
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform and rename profiles to creator
      const transformedData = (data || []).map((template: any) => ({
        ...template,
        html_content: '', // Placeholder - will be loaded when needed
        blocks_data: [],  // Placeholder - will be loaded when needed
        is_model: template.is_model || false,
        creator: template.profiles || null,
        profiles: undefined,
      }));

      setTemplates(transformedData);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar templates',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateById = async (id: string): Promise<EmailTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select(`
          *,
          profiles!email_templates_created_by_fkey (
            full_name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        blocks_data: Array.isArray(data.blocks_data) ? data.blocks_data : [],
        is_model: data.is_model || false,
        creator: data.profiles || null,
      } as EmailTemplate;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar template',
        description: error.message,
      });
      return null;
    }
  };

  const saveTemplate = async (template: Partial<EmailTemplate> & { name: string; html_content: string; blocks_data?: any[] }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('email_templates')
        .insert([{
          name: template.name,
          description: template.description,
          subject: template.subject,
          preview_text: template.preview_text,
          html_content: template.html_content,
          blocks_data: template.blocks_data || [],
          is_published: template.is_published || false,
          is_model: template.is_model || false,
          created_by: user.id,
          updated_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Template salvo!',
        description: 'Seu template foi salvo com sucesso.',
      });

      await loadTemplates();
      return data;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar template',
        description: error.message,
      });
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('email_templates')
        .update({
          ...updates,
          updated_by: user.id,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Template atualizado!',
        description: 'Suas alterações foram salvas.',
      });

      await loadTemplates();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar template',
        description: error.message,
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Template excluído',
        description: 'O template foi removido com sucesso.',
      });

      await loadTemplates();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir template',
        description: error.message,
      });
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return {
    templates,
    loading,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    reloadTemplates: loadTemplates,
    loadTemplateById,
  };
};
