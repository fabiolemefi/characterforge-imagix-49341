import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';

export interface EfiLibraryIcon {
  id: string;
  name: string;
  filename: string;
  group_prefix: string;
  url: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface IconFormData {
  name: string;
  filename: string;
  group_prefix?: string;
  url: string;
  is_active?: boolean;
}

export interface IconImportResult {
  filename: string;
  status: 'new' | 'existing' | 'replaced' | 'error';
  error?: string;
}

// Extract group prefix from filename
export const extractGroupPrefix = (filename: string): string => {
  const name = filename.replace(/\.svg$/i, '');
  const knownPrefixes = ['ilustra', 'bolix', 'icon', 'ico'];
  
  for (const prefix of knownPrefixes) {
    if (name.toLowerCase().startsWith(`${prefix}-`)) {
      return prefix;
    }
  }
  
  return 'geral';
};

export const useEfiLibraryIcons = () => {
  const queryClient = useQueryClient();

  // Query all icons
  const iconsQuery = useQuery({
    queryKey: ['efi-library-icons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efi_library_icons' as any)
        .select('*')
        .order('group_prefix', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as unknown as EfiLibraryIcon[];
    },
  });

  // Get icons grouped by prefix
  const getGroupedIcons = (icons: EfiLibraryIcon[]) => {
    const groups: Record<string, EfiLibraryIcon[]> = {};
    
    icons.forEach(icon => {
      const group = icon.group_prefix || 'geral';
      if (!groups[group]) groups[group] = [];
      groups[group].push(icon);
    });
    
    // Sort groups: known prefixes first, then 'geral' last
    const sortedGroups: Record<string, EfiLibraryIcon[]> = {};
    const knownPrefixes = ['ilustra', 'bolix', 'icon'];
    
    knownPrefixes.forEach(prefix => {
      if (groups[prefix]) {
        sortedGroups[prefix] = groups[prefix];
      }
    });
    
    Object.keys(groups)
      .filter(key => !knownPrefixes.includes(key) && key !== 'geral')
      .sort()
      .forEach(key => {
        sortedGroups[key] = groups[key];
      });
    
    if (groups['geral']) {
      sortedGroups['geral'] = groups['geral'];
    }
    
    return sortedGroups;
  };

  // Create icon
  const createIcon = useMutation({
    mutationFn: async (formData: IconFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('efi_library_icons' as any)
        .insert({
          name: formData.name,
          filename: formData.filename,
          group_prefix: formData.group_prefix || extractGroupPrefix(formData.filename),
          url: formData.url,
          is_active: formData.is_active ?? true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as EfiLibraryIcon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-library-icons'] });
    },
  });

  // Update icon
  const updateIcon = useMutation({
    mutationFn: async ({ id, ...formData }: IconFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('efi_library_icons' as any)
        .update({
          name: formData.name,
          filename: formData.filename,
          group_prefix: formData.group_prefix || extractGroupPrefix(formData.filename),
          url: formData.url,
          is_active: formData.is_active ?? true,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as EfiLibraryIcon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-library-icons'] });
    },
  });

  // Delete icon
  const deleteIcon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('efi_library_icons' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-library-icons'] });
    },
  });

  // Upload single icon
  const uploadIcon = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase();
    const filePath = `icons/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('efi-code-assets')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('efi-code-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Check which icons already exist
  const checkExistingIcons = async (filenames: string[]): Promise<Set<string>> => {
    const { data, error } = await supabase
      .from('efi_library_icons' as any)
      .select('filename')
      .in('filename', filenames);

    if (error) throw error;
    return new Set((data as any[])?.map(item => item.filename) || []);
  };

  // Import icons from ZIP
  const importIconsFromZip = async (
    zipFile: File,
    replace: boolean,
    onProgress?: (current: number, total: number, filename: string) => void
  ): Promise<IconImportResult[]> => {
    const results: IconImportResult[] = [];
    const zip = new JSZip();
    
    const zipContent = await zip.loadAsync(zipFile);
    
    // Filter only SVG files
    const svgFiles: { filename: string; file: JSZip.JSZipObject }[] = [];
    
    zipContent.forEach((relativePath, file) => {
      if (!file.dir && relativePath.toLowerCase().endsWith('.svg')) {
        // Get just the filename, not the full path
        const filename = relativePath.split('/').pop() || relativePath;
        svgFiles.push({ filename: filename.toLowerCase(), file });
      }
    });

    if (svgFiles.length === 0) {
      throw new Error('Nenhum arquivo SVG encontrado no ZIP');
    }

    // Check existing icons
    const filenames = svgFiles.map(f => f.filename);
    const existingSet = await checkExistingIcons(filenames);

    const { data: { user } } = await supabase.auth.getUser();
    
    let processed = 0;
    
    for (const { filename, file } of svgFiles) {
      processed++;
      onProgress?.(processed, svgFiles.length, filename);
      
      const exists = existingSet.has(filename);
      
      if (exists && !replace) {
        results.push({ filename, status: 'existing' });
        continue;
      }

      try {
        // Get file content
        const content = await file.async('blob');
        const svgFile = new File([content], filename, { type: 'image/svg+xml' });
        
        // Upload to storage
        const url = await uploadIcon(svgFile);
        
        const name = filename.replace(/\.svg$/i, '');
        const groupPrefix = extractGroupPrefix(filename);

        if (exists && replace) {
          // Update existing record
          await supabase
            .from('efi_library_icons' as any)
            .update({ url, name, group_prefix: groupPrefix })
            .eq('filename', filename);
          
          results.push({ filename, status: 'replaced' });
        } else {
          // Insert new record
          await supabase
            .from('efi_library_icons' as any)
            .insert({
              name,
              filename,
              group_prefix: groupPrefix,
              url,
              is_active: true,
              created_by: user?.id,
            });
          
          results.push({ filename, status: 'new' });
        }
      } catch (error: any) {
        results.push({ filename, status: 'error', error: error.message });
      }
    }

    // Invalidate cache
    queryClient.invalidateQueries({ queryKey: ['efi-library-icons'] });
    
    return results;
  };

  // Get preview of ZIP contents
  const getZipPreview = async (
    zipFile: File
  ): Promise<{ filename: string; exists: boolean }[]> => {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFile);
    
    const svgFilenames: string[] = [];
    
    zipContent.forEach((relativePath, file) => {
      if (!file.dir && relativePath.toLowerCase().endsWith('.svg')) {
        const filename = (relativePath.split('/').pop() || relativePath).toLowerCase();
        svgFilenames.push(filename);
      }
    });

    if (svgFilenames.length === 0) {
      return [];
    }

    const existingSet = await checkExistingIcons(svgFilenames);
    
    return svgFilenames.map(filename => ({
      filename,
      exists: existingSet.has(filename),
    }));
  };

  return {
    icons: iconsQuery.data || [],
    isLoadingIcons: iconsQuery.isLoading,
    getGroupedIcons,
    createIcon,
    updateIcon,
    deleteIcon,
    uploadIcon,
    importIconsFromZip,
    getZipPreview,
    checkExistingIcons,
  };
};
