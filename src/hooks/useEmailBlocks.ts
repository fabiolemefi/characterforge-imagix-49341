import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailBlock {
  id: string;
  name: string;
  description: string | null;
  category: string;
  html_template: string;
  thumbnail_url: string | null;
  ai_instructions: string | null;
  is_active: boolean;
  created_at: string;
}

export const useEmailBlocks = () => {
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('email_blocks')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setBlocks(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar blocos',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocks();
  }, []);

  return { blocks, loading, reloadBlocks: loadBlocks };
};
