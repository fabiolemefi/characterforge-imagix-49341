import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SharedFile {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  share_code: string;
  password_hash: string | null;
  expires_at: string | null;
  download_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useSharedFiles = () => {
  return useQuery({
    queryKey: ['shared-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SharedFile[];
    },
  });
};
