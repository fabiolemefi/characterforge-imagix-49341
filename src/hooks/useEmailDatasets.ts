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

interface PdfExtraction {
  id: string;
  status: string;
  cleaned_markdown: string | null;
  error_message: string | null;
}

export const useEmailDatasets = () => {
  const [dataset, setDataset] = useState<EmailDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[useEmailDatasets] Error saving dataset:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: errorMessage,
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Sanitize filename for Supabase Storage compatibility
  const sanitizeFileName = (fileName: string): string => {
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    
    const sanitized = nameWithoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\-_]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    
    return sanitized + ext.toLowerCase();
  };

  // Poll for extraction status with visibility change support
  const pollExtractionStatus = async (extractionId: string): Promise<string | null> => {
    const maxAttempts = 120; // 10 minutes max (5s * 120)
    const pollInterval = 5000; // 5 seconds

    // Function to check status once
    const checkStatus = async (): Promise<PdfExtraction | null> => {
      const { data, error } = await supabase
        .from('pdf_extractions')
        .select('status, cleaned_markdown, error_message')
        .eq('id', extractionId)
        .single();

      if (error) {
        console.error('Error polling extraction status:', error);
        throw new Error('Falha ao verificar status da extração');
      }

      return data as PdfExtraction | null;
    };

    // Function to update UI based on status
    const updateUIStatus = (status: string): void => {
      switch (status) {
        case 'pending':
          setExtractionStatus('Iniciando extração...');
          break;
        case 'extracting':
          setExtractionStatus('Extraindo texto do PDF...');
          break;
        case 'cleaning':
          setExtractionStatus('Limpando e formatando conteúdo...');
          break;
        case 'completed':
          setExtractionStatus('Concluído!');
          break;
      }
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const extraction = await checkStatus();

      if (!extraction) {
        throw new Error('Extração não encontrada');
      }

      console.log(`📊 Poll attempt ${attempt + 1}: status = ${extraction.status}`);

      updateUIStatus(extraction.status);

      if (extraction.status === 'completed') {
        return extraction.cleaned_markdown;
      }

      if (extraction.status === 'failed') {
        throw new Error(extraction.error_message || 'Extração falhou');
      }

      // Wait with visibility change support - check immediately when tab regains focus
      await new Promise<void>(resolve => {
        let resolved = false;

        // Normal timer
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            document.removeEventListener('visibilitychange', handleVisibility);
            resolve();
          }
        }, pollInterval);

        // Listener for when tab regains focus - trigger immediate check
        const handleVisibility = () => {
          if (document.visibilityState === 'visible' && !resolved) {
            console.log('👁️ Tab regained focus, checking status immediately...');
            resolved = true;
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', handleVisibility);
            resolve();
          }
        };

        document.addEventListener('visibilitychange', handleVisibility);
      });
    }

    throw new Error('Timeout - extração demorou demais');
  };

  // Extract content from PDF using async Replicate processing
  const extractFromPdf = async (file: File): Promise<string | null> => {
    try {
      setExtracting(true);
      setExtractionStatus('Fazendo upload do PDF...');
      
      // 1. Upload PDF to storage with sanitized filename
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `pdf-extractions/${Date.now()}-${sanitizedName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('email-magic-images')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('[useEmailDatasets] Upload error:', uploadError);
        throw new Error('Erro ao fazer upload do PDF');
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('email-magic-images')
        .getPublicUrl(uploadData.path);

      const pdfUrl = urlData.publicUrl;
      console.log('📄 PDF uploaded:', pdfUrl);

      setExtractionStatus('Iniciando extração...');

      // 3. Call edge function to start async extraction
      const { data: extractionData, error: extractionError } = await supabase.functions.invoke(
        'extract-pdf-content',
        {
          body: { pdfUrl, fileName: file.name },
        }
      );

      if (extractionError) {
        console.error('[useEmailDatasets] Extraction start error:', extractionError);
        throw new Error('Erro ao iniciar extração');
      }

      console.log('🚀 Extraction started:', extractionData);

      if (!extractionData?.extractionId) {
        throw new Error('Nenhum ID de extração retornado');
      }

      // 4. Poll for completion
      const markdown = await pollExtractionStatus(extractionData.extractionId);

      if (!markdown) {
        throw new Error('Nenhum conteúdo extraído do PDF');
      }

      console.log('✅ Extraction completed, markdown length:', markdown.length);

      // Count emails in the extracted content
      const emailCount = markdown.includes('---EMAIL_SEPARATOR---')
        ? markdown.split('---EMAIL_SEPARATOR---').filter((e: string) => e.trim()).length
        : 1;

      toast({
        title: 'PDF extraído',
        description: emailCount > 1 
          ? `${emailCount} emails extraídos com sucesso`
          : `Conteúdo extraído com ${markdown.length} caracteres`,
      });

      return markdown;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[useEmailDatasets] Extract from PDF failed:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na extração',
        description: errorMessage,
      });
      return null;
    } finally {
      setExtracting(false);
      setExtractionStatus('');
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
    extractionStatus,
    saveDataset,
    extractFromPdf,
    formatExtractedContent,
    reloadDataset: loadDataset,
  };
};
