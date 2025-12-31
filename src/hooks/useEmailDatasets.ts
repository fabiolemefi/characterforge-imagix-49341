import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailDataset {
  id: string;
  name: string;
  content: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useEmailDatasets = () => {
  const [dataset, setDataset] = useState<EmailDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const { toast } = useToast();

  // Load the main dataset (we'll use a single dataset for simplicity)
  const loadDataset = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('email_datasets')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useEmailDatasets] Error loading dataset:', error);
        throw error;
      }

      setDataset(data);
    } catch (error) {
      console.error('[useEmailDatasets] Failed to load dataset:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save or update dataset
  const saveDataset = async (content: string, name?: string) => {
    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Não autenticado',
          description: 'Você precisa estar logado para salvar o dataset',
        });
        return null;
      }

      if (dataset?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('email_datasets')
          .update({
            content,
            name: name || dataset.name,
            updated_by: user.id,
          })
          .eq('id', dataset.id)
          .select()
          .single();

        if (error) throw error;

        setDataset(data);
        toast({
          title: 'Dataset salvo',
          description: 'Seu dataset foi atualizado com sucesso',
        });
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('email_datasets')
          .insert({
            content,
            name: name || 'Dataset Principal',
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        setDataset(data);
        toast({
          title: 'Dataset criado',
          description: 'Seu dataset foi criado com sucesso',
        });
        return data;
      }
    } catch (error: any) {
      console.error('[useEmailDatasets] Error saving dataset:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar o dataset',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Extract content from PDF using Replicate marker
  const extractFromPdf = async (file: File): Promise<string | null> => {
    try {
      setExtracting(true);
      
      // 1. Upload PDF to storage
      const fileName = `pdf-extractions/${Date.now()}-${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('email-magic-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('[useEmailDatasets] Upload error:', uploadError);
        throw new Error('Erro ao fazer upload do PDF');
      }

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('email-magic-images')
        .getPublicUrl(fileName);

      console.log('[useEmailDatasets] PDF uploaded, public URL:', publicUrl);

      // 3. Call edge function to extract content
      const { data: extractData, error: extractError } = await supabase.functions
        .invoke('extract-pdf-content', {
          body: { pdfUrl: publicUrl },
        });

      if (extractError) {
        console.error('[useEmailDatasets] Extract error:', extractError);
        throw new Error('Erro ao extrair conteúdo do PDF');
      }

      if (!extractData?.success || !extractData?.markdown) {
        console.error('[useEmailDatasets] Invalid extract response:', extractData);
        throw new Error(extractData?.error || 'Resposta inválida da extração');
      }

      // Count emails in the extracted content
      const emailCount = extractData.markdown.includes('---EMAIL_SEPARATOR---')
        ? extractData.markdown.split('---EMAIL_SEPARATOR---').filter((e: string) => e.trim()).length
        : 1;

      console.log('[useEmailDatasets] Extracted content length:', extractData.markdown.length);
      console.log('[useEmailDatasets] Number of emails found:', emailCount);

      toast({
        title: 'PDF extraído',
        description: emailCount > 1 
          ? `${emailCount} emails extraídos com sucesso`
          : `Conteúdo extraído com ${extractData.markdown.length} caracteres`,
      });

      return extractData.markdown;
    } catch (error: any) {
      console.error('[useEmailDatasets] Extract from PDF failed:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na extração',
        description: error.message || 'Não foi possível extrair o conteúdo do PDF',
      });
      return null;
    } finally {
      setExtracting(false);
    }
  };

  // Get the next dataset number based on existing content
  const getNextDatasetNumber = (existingContent: string): number => {
    const regex = /Dataset (\d+)/g;
    let maxNumber = 0;
    let match;
    
    while ((match = regex.exec(existingContent)) !== null) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
    
    return maxNumber + 1;
  };

  // Format extracted content with sequential numbering (newest at top)
  // Supports multiple emails separated by ---EMAIL_SEPARATOR---
  const formatExtractedContent = (existingContent: string, newContent: string): string => {
    const separator = '==========================================================';
    
    // Check if content has multiple emails
    const emails = newContent.includes('---EMAIL_SEPARATOR---')
      ? newContent.split('---EMAIL_SEPARATOR---').map(e => e.trim()).filter(e => e.length > 0)
      : [newContent.trim()];
    
    let formattedNew = '';
    let currentNumber = getNextDatasetNumber(existingContent);
    
    // Process each email, creating a separate dataset entry for each
    for (const email of emails) {
      const paddedNumber = String(currentNumber).padStart(2, '0');
      formattedNew += `Dataset ${paddedNumber}\n${separator}\n\n${email}\n\n`;
      currentNumber++;
    }
    
    if (existingContent.trim()) {
      // Insert at TOP (newest first, descending order)
      return `${formattedNew.trim()}\n\n${existingContent}`;
    }
    return formattedNew.trim();
  };

  useEffect(() => {
    loadDataset();
  }, []);

  return {
    dataset,
    loading,
    saving,
    extracting,
    saveDataset,
    extractFromPdf,
    formatExtractedContent,
    reloadDataset: loadDataset,
  };
};
