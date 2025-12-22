import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EfiReportConfig {
  id: string;
  analysis_prompt: string;
  design_prompt: string;
  logo_url: string;
  aspect_ratio: string;
  resolution: string;
  colors: string[];
  created_at: string;
  updated_at: string;
}

export function useEfiReportConfig() {
  const [config, setConfig] = useState<EfiReportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('efi_report_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      
      setConfig({
        ...data,
        colors: Array.isArray(data.colors) ? data.colors : JSON.parse(data.colors as string)
      });
    } catch (error: any) {
      console.error('Error loading config:', error);
      toast({
        title: 'Erro ao carregar configuração',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<Omit<EfiReportConfig, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('efi_report_config')
        .update(updates)
        .eq('id', config.id);

      if (error) throw error;

      setConfig({ ...config, ...updates } as EfiReportConfig);
      toast({
        title: 'Configuração salva',
        description: 'As alterações foram salvas com sucesso',
      });
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: 'Erro ao salvar configuração',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `efi-report-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('plugin-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('plugin-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteLogo = async (logoUrl: string): Promise<boolean> => {
    try {
      const fileName = logoUrl.split('/').pop();
      if (!fileName) return false;

      await supabase.storage
        .from('plugin-images')
        .remove([fileName]);

      return true;
    } catch (error) {
      console.error('Error deleting logo:', error);
      return false;
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    loading,
    saving,
    updateConfig,
    reloadConfig: loadConfig,
    uploadLogo,
    deleteLogo,
  };
}
