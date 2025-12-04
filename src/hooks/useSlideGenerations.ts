import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export type Dimensions = 'fluid' | '16x9' | '4x3';

export interface HeaderFooterConfig {
  showLogo?: boolean;
  showCardNumber?: boolean;
  footerText?: string;
  hideFromFirstCard?: boolean;
  hideFromLastCard?: boolean;
}

export interface SlideGeneration {
  id: string;
  user_id: string;
  input_text: string;
  source_type: string;
  original_filename: string | null;
  generation_id: string | null;
  status: string;
  gamma_url: string | null;
  export_url: string | null;
  error_message: string | null;
  images_data: Record<string, string> | null;
  dimensions: string | null;
  export_as: string | null;
  header_footer: HeaderFooterConfig | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  url: string;
  tag: string;
}

export function useSlideGenerations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: generations, isLoading, error } = useQuery({
    queryKey: ['slide-generations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('slide_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SlideGeneration[];
    },
    enabled: !!user,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('slide-generations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slide_generations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['slide-generations', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const uploadImage = async (file: File): Promise<{ url: string; path: string }> => {
    if (!user) throw new Error('User not authenticated');

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${timestamp}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('slides-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('slides-images')
      .getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  };

  const deleteImage = async (path: string) => {
    const { error } = await supabase.storage
      .from('slides-images')
      .remove([path]);

    if (error) throw error;
  };

  const createGeneration = useMutation({
    mutationFn: async ({ 
      inputText, 
      sourceType, 
      originalFilename,
      imagesMap,
      textMode = 'preserve',
      dimensions = 'fluid',
      exportAs,
      headerFooter,
      themeId,
      additionalInstructions,
    }: {
      inputText: string; 
      sourceType: string; 
      originalFilename?: string;
      imagesMap?: Record<string, string>;
      textMode?: 'generate' | 'condense' | 'preserve';
      dimensions?: Dimensions;
      exportAs?: 'pdf' | 'pptx';
      headerFooter?: HeaderFooterConfig;
      themeId?: string;
      additionalInstructions?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Create record first - cast to any to bypass strict typing for new columns
      const insertData = {
        user_id: user.id,
        input_text: inputText,
        source_type: sourceType,
        original_filename: originalFilename || null,
        images_data: imagesMap || {},
        dimensions: dimensions as string,
        export_as: exportAs || null,
        header_footer: headerFooter || {},
        status: 'pending',
      };
      
      const { data: record, error: insertError } = await supabase
        .from('slide_generations')
        .insert(insertData as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Call edge function
      const { data, error } = await supabase.functions.invoke('generate-slides', {
        body: {
          text: inputText,
          sourceType,
          originalFilename,
          recordId: record.id,
          imagesMap: imagesMap || {},
          textMode,
          dimensions,
          exportAs,
          headerFooter,
          themeId,
          additionalInstructions,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slide-generations', user?.id] });
    },
  });

  return {
    generations: generations || [],
    isLoading,
    error,
    createGeneration,
    uploadImage,
    deleteImage,
  };
}