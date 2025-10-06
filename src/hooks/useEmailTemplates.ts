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
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useEmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Transform blocks_data from Json to any[]
      const transformedData = (data || []).map(template => ({
        ...template,
        blocks_data: Array.isArray(template.blocks_data) ? template.blocks_data : [],
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
  };
};
