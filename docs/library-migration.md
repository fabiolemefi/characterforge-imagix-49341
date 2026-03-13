# Migração da Biblioteca de Imagens e Ícones

## Resumo

| Tabela | Registros | Descrição |
|---|---|---|
| `efi_image_categories` | 3 | Hero, Sede, Sys |
| `efi_library_images` | 3 | Imagens organizadas por categoria |
| `efi_library_icons` | 363 | Ícones SVG (grupos: `geral`, `ilustra`) |

Bucket de storage: `efi-code-assets` (público)

---

## 1. Como exportar os dados

### Opção A: SQL completo (schema + dados)
```
GET /functions/v1/export-library-data?format=sql
Authorization: Bearer <anon_key>
```

### Opção B: JSON com todos os registros
```
GET /functions/v1/export-library-data?format=json
Authorization: Bearer <anon_key>
```

O endpoint retorna um arquivo pronto para download com todas as tabelas, RLS policies, bucket de storage e INSERTs de todos os dados.

---

## 2. Schema das Tabelas

### efi_image_categories
```sql
CREATE TABLE public.efi_image_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
```

### efi_library_images
```sql
CREATE TABLE public.efi_library_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.efi_image_categories(id),
  name text NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  alt_text text,
  tags text[] DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
```

### efi_library_icons
```sql
CREATE TABLE public.efi_library_icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  filename text NOT NULL,
  group_prefix text NOT NULL DEFAULT 'geral',
  url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
```

---

## 3. RLS Policies

```sql
ALTER TABLE public.efi_image_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efi_library_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efi_library_icons ENABLE ROW LEVEL SECURITY;

-- Categorias
CREATE POLICY "Admins can manage image categories" ON public.efi_image_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Anyone can view active image categories" ON public.efi_image_categories
  FOR SELECT USING (is_active = true);

-- Imagens
CREATE POLICY "Admins can manage library images" ON public.efi_library_images
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Anyone can view active library images" ON public.efi_library_images
  FOR SELECT USING (is_active = true);

-- Ícones
CREATE POLICY "Admins can manage library icons" ON public.efi_library_icons
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Anyone can view active library icons" ON public.efi_library_icons
  FOR SELECT USING (is_active = true);
```

---

## 4. Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('efi-code-assets', 'efi-code-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read efi-code-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'efi-code-assets');

CREATE POLICY "Auth users upload efi-code-assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'efi-code-assets' AND auth.role() = 'authenticated');
```

---

## 5. Código TypeScript

### Hook: useEfiImageLibrary.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EfiImageCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  image_count?: number;
}

export interface EfiLibraryImage {
  id: string;
  category_id: string | null;
  name: string;
  url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  tags: string[];
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  category?: EfiImageCategory;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string | null;
  position?: number;
  is_active?: boolean;
}

export interface ImageFormData {
  category_id?: string | null;
  name: string;
  url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  tags?: string[];
  position?: number;
  is_active?: boolean;
}

export const useEfiImageLibrary = () => {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['efi-image-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efi_image_categories')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return data as EfiImageCategory[];
    },
  });

  const categoriesWithCountQuery = useQuery({
    queryKey: ['efi-image-categories-with-count'],
    queryFn: async () => {
      const { data: categories, error: catError } = await supabase
        .from('efi_image_categories')
        .select('*')
        .order('position', { ascending: true });
      if (catError) throw catError;

      const { data: images, error: imgError } = await supabase
        .from('efi_library_images')
        .select('category_id');
      if (imgError) throw imgError;

      const countMap: Record<string, number> = {};
      images?.forEach(img => {
        if (img.category_id) {
          countMap[img.category_id] = (countMap[img.category_id] || 0) + 1;
        }
      });

      return (categories || []).map(cat => ({
        ...cat,
        image_count: countMap[cat.id] || 0,
      })) as EfiImageCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (formData: CategoryFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('efi_image_categories')
        .insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as EfiImageCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...formData }: CategoryFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('efi_image_categories')
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as EfiImageCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('efi_image_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const imagesQuery = useQuery({
    queryKey: ['efi-library-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efi_library_images')
        .select(`*, category:efi_image_categories(*)`)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as EfiLibraryImage[];
    },
  });

  const createImage = useMutation({
    mutationFn: async (formData: ImageFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('efi_library_images')
        .insert({
          category_id: formData.category_id || null,
          name: formData.name,
          url: formData.url,
          thumbnail_url: formData.thumbnail_url || null,
          alt_text: formData.alt_text || null,
          tags: formData.tags || [],
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as EfiLibraryImage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-library-images'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const updateImage = useMutation({
    mutationFn: async ({ id, ...formData }: ImageFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('efi_library_images')
        .update({
          category_id: formData.category_id || null,
          name: formData.name,
          url: formData.url,
          thumbnail_url: formData.thumbnail_url || null,
          alt_text: formData.alt_text || null,
          tags: formData.tags || [],
          position: formData.position ?? 0,
          is_active: formData.is_active ?? true,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as EfiLibraryImage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-library-images'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const deleteImage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('efi_library_images')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-library-images'] });
      queryClient.invalidateQueries({ queryKey: ['efi-image-categories-with-count'] });
    },
  });

  const uploadImage = async (file: File, categorySlug?: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = categorySlug ? `library/${categorySlug}/${fileName}` : `library/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('efi-code-assets')
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('efi-code-assets')
      .getPublicUrl(filePath);
    return publicUrl;
  };

  return {
    categories: categoriesQuery.data || [],
    categoriesWithCount: categoriesWithCountQuery.data || [],
    isLoadingCategories: categoriesQuery.isLoading || categoriesWithCountQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    images: imagesQuery.data || [],
    isLoadingImages: imagesQuery.isLoading,
    createImage,
    updateImage,
    deleteImage,
    uploadImage,
  };
};
```

### Hook: useEfiLibraryIcons.ts

```typescript
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

export const extractGroupPrefix = (filename: string): string => {
  const name = filename.replace(/\.svg$/i, '');
  const knownPrefixes = ['ilustra', 'bolix', 'icon', 'ico'];
  for (const prefix of knownPrefixes) {
    if (name.toLowerCase().startsWith(`${prefix}-`)) return prefix;
  }
  return 'geral';
};

export const useEfiLibraryIcons = () => {
  const queryClient = useQueryClient();

  const iconsQuery = useQuery({
    queryKey: ['efi-library-icons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efi_library_icons')
        .select('*')
        .order('group_prefix', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as EfiLibraryIcon[];
    },
  });

  const getGroupedIcons = (icons: EfiLibraryIcon[]) => {
    const groups: Record<string, EfiLibraryIcon[]> = {};
    icons.forEach(icon => {
      const group = icon.group_prefix || 'geral';
      if (!groups[group]) groups[group] = [];
      groups[group].push(icon);
    });
    const sortedGroups: Record<string, EfiLibraryIcon[]> = {};
    const knownPrefixes = ['ilustra', 'bolix', 'icon'];
    knownPrefixes.forEach(prefix => { if (groups[prefix]) sortedGroups[prefix] = groups[prefix]; });
    Object.keys(groups).filter(k => !knownPrefixes.includes(k) && k !== 'geral').sort().forEach(k => { sortedGroups[k] = groups[k]; });
    if (groups['geral']) sortedGroups['geral'] = groups['geral'];
    return sortedGroups;
  };

  const createIcon = useMutation({
    mutationFn: async (formData: IconFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('efi_library_icons')
        .insert({
          name: formData.name,
          filename: formData.filename,
          group_prefix: formData.group_prefix || extractGroupPrefix(formData.filename),
          url: formData.url,
          is_active: formData.is_active ?? true,
          created_by: user?.id,
        })
        .select().single();
      if (error) throw error;
      return data as EfiLibraryIcon;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['efi-library-icons'] }); },
  });

  const updateIcon = useMutation({
    mutationFn: async ({ id, ...formData }: IconFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('efi_library_icons')
        .update({
          name: formData.name,
          filename: formData.filename,
          group_prefix: formData.group_prefix || extractGroupPrefix(formData.filename),
          url: formData.url,
          is_active: formData.is_active ?? true,
        })
        .eq('id', id).select().single();
      if (error) throw error;
      return data as EfiLibraryIcon;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['efi-library-icons'] }); },
  });

  const deleteIcon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('efi_library_icons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['efi-library-icons'] }); },
  });

  const uploadIcon = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase();
    const filePath = `icons/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('efi-code-assets').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('efi-code-assets').getPublicUrl(filePath);
    return publicUrl;
  };

  const checkExistingIcons = async (filenames: string[]): Promise<Set<string>> => {
    const { data, error } = await supabase
      .from('efi_library_icons').select('filename').in('filename', filenames);
    if (error) throw error;
    return new Set(data?.map(item => item.filename) || []);
  };

  const importIconsFromZip = async (
    zipFile: File, replace: boolean,
    onProgress?: (current: number, total: number, filename: string) => void
  ): Promise<IconImportResult[]> => {
    const results: IconImportResult[] = [];
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFile);
    const svgFiles: { filename: string; file: JSZip.JSZipObject }[] = [];
    zipContent.forEach((relativePath, file) => {
      if (!file.dir && relativePath.toLowerCase().endsWith('.svg')) {
        const filename = (relativePath.split('/').pop() || relativePath).toLowerCase();
        svgFiles.push({ filename, file });
      }
    });
    if (svgFiles.length === 0) throw new Error('Nenhum arquivo SVG encontrado no ZIP');

    const filenames = svgFiles.map(f => f.filename);
    const existingSet = await checkExistingIcons(filenames);
    const { data: { user } } = await supabase.auth.getUser();
    let processed = 0;

    for (const { filename, file } of svgFiles) {
      processed++;
      onProgress?.(processed, svgFiles.length, filename);
      const exists = existingSet.has(filename);
      if (exists && !replace) { results.push({ filename, status: 'existing' }); continue; }
      try {
        const content = await file.async('blob');
        const svgFile = new File([content], filename, { type: 'image/svg+xml' });
        const url = await uploadIcon(svgFile);
        const name = filename.replace(/\.svg$/i, '');
        const groupPrefix = extractGroupPrefix(filename);
        if (exists && replace) {
          await supabase.from('efi_library_icons').update({ url, name, group_prefix: groupPrefix }).eq('filename', filename);
          results.push({ filename, status: 'replaced' });
        } else {
          await supabase.from('efi_library_icons').insert({ name, filename, group_prefix: groupPrefix, url, is_active: true, created_by: user?.id });
          results.push({ filename, status: 'new' });
        }
      } catch (error: any) {
        results.push({ filename, status: 'error', error: error.message });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['efi-library-icons'] });
    return results;
  };

  const getZipPreview = async (zipFile: File): Promise<{ filename: string; exists: boolean }[]> => {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFile);
    const svgFilenames: string[] = [];
    zipContent.forEach((relativePath, file) => {
      if (!file.dir && relativePath.toLowerCase().endsWith('.svg')) {
        svgFilenames.push((relativePath.split('/').pop() || relativePath).toLowerCase());
      }
    });
    if (svgFilenames.length === 0) return [];
    const existingSet = await checkExistingIcons(svgFilenames);
    return svgFilenames.map(filename => ({ filename, exists: existingSet.has(filename) }));
  };

  return {
    icons: iconsQuery.data || [],
    isLoadingIcons: iconsQuery.isLoading,
    getGroupedIcons,
    createIcon, updateIcon, deleteIcon,
    uploadIcon, importIconsFromZip, getZipPreview, checkExistingIcons,
  };
};
```

### Componente: ImagePickerModal.tsx

```typescript
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEfiImageLibrary, EfiLibraryImage } from '@/hooks/useEfiImageLibrary';
import { useEfiLibraryIcons, EfiLibraryIcon } from '@/hooks/useEfiLibraryIcons';
import { Search, ImageIcon, Check, Shapes } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (image: { url: string; name?: string }) => void;
}

export const ImagePickerModal = ({ open, onOpenChange, onSelectImage }: ImagePickerModalProps) => {
  const { categories, images, isLoadingImages } = useEfiImageLibrary();
  const { icons, isLoadingIcons, getGroupedIcons } = useEfiLibraryIcons();
  
  const [activeTab, setActiveTab] = useState<'images' | 'icons'>('images');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIconGroup, setSelectedIconGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ type: 'image' | 'icon'; item: EfiLibraryImage | EfiLibraryIcon } | null>(null);

  const filteredImages = useMemo(() => {
    return images.filter(img => {
      if (!img.is_active) return false;
      const matchesCategory = !selectedCategory || img.category_id === selectedCategory;
      const matchesSearch = !searchTerm || 
        img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [images, selectedCategory, searchTerm]);

  const groupedIcons = useMemo(() => getGroupedIcons(icons.filter(i => i.is_active)), [icons, getGroupedIcons]);
  
  const filteredIcons = useMemo(() => {
    const activeIcons = icons.filter(i => i.is_active);
    return activeIcons.filter(icon => {
      const matchesGroup = !selectedIconGroup || icon.group_prefix === selectedIconGroup;
      const matchesSearch = !searchTerm || 
        icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        icon.filename.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [icons, selectedIconGroup, searchTerm]);

  const iconGroups = Object.keys(groupedIcons);

  const handleSelect = () => {
    if (selectedItem) {
      onSelectImage({ url: selectedItem.item.url, name: selectedItem.item.name });
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedItem(null);
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedIconGroup(null);
  };

  const handleItemClick = (type: 'image' | 'icon', item: EfiLibraryImage | EfiLibraryIcon) => {
    setSelectedItem({ type, item });
  };

  const handleItemDoubleClick = (type: 'image' | 'icon', item: EfiLibraryImage | EfiLibraryIcon) => {
    onSelectImage({ url: item.url, name: item.name });
    handleClose();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'images' | 'icons');
    setSelectedItem(null);
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedIconGroup(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar da Biblioteca</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Imagens
            </TabsTrigger>
            <TabsTrigger value="icons" className="flex items-center gap-2">
              <Shapes className="h-4 w-4" /> Ícones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="flex-1 flex flex-col overflow-hidden mt-0">
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              <Button variant={selectedCategory === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(null)}>Todas</Button>
              {categories.filter(c => c.is_active).map((category) => (
                <Button key={category.id} variant={selectedCategory === category.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(category.id)}>{category.name}</Button>
              ))}
              <div className="flex-1 min-w-[200px] relative ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="pl-10 h-9" />
              </div>
            </div>
            <div className="flex-1 overflow-auto py-4">
              {isLoadingImages ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                  <ImageIcon className="h-12 w-12" /><span>Nenhuma imagem encontrada</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {filteredImages.map((image) => (
                    <div key={image.id} className={cn("relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", selectedItem?.type === 'image' && selectedItem.item.id === image.id && "ring-2 ring-primary")} onClick={() => handleItemClick('image', image)} onDoubleClick={() => handleItemDoubleClick('image', image)}>
                      <div className="aspect-square flex items-center justify-center p-2 bg-secondary/30">
                        <img src={image.url} alt={image.alt_text || image.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="p-1.5 border-t bg-background"><p className="text-xs font-medium truncate text-center">{image.name}</p></div>
                      {selectedItem?.type === 'image' && selectedItem.item.id === image.id && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="h-3 w-3" /></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="icons" className="flex-1 flex flex-col overflow-hidden mt-0">
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              <Button variant={selectedIconGroup === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedIconGroup(null)}>Todos</Button>
              {iconGroups.map((group) => (
                <Button key={group} variant={selectedIconGroup === group ? 'default' : 'outline'} size="sm" onClick={() => setSelectedIconGroup(group)} className="capitalize">{group}</Button>
              ))}
              <div className="flex-1 min-w-[200px] relative ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="pl-10 h-9" />
              </div>
            </div>
            <div className="flex-1 overflow-auto py-4">
              {isLoadingIcons ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredIcons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                  <Shapes className="h-12 w-12" /><span>Nenhum ícone encontrado</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {filteredIcons.map((icon) => (
                    <div key={icon.id} className={cn("relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 group", selectedItem?.type === 'icon' && selectedItem.item.id === icon.id && "ring-2 ring-primary")} onClick={() => handleItemClick('icon', icon)} onDoubleClick={() => handleItemDoubleClick('icon', icon)} title={icon.name}>
                      <div className="aspect-square flex items-center justify-center p-2 bg-secondary/30">
                        <img src={icon.url} alt={icon.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      {selectedItem?.type === 'icon' && selectedItem.item.id === icon.id && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="h-3 w-3" /></div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] font-medium truncate text-center">{icon.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSelect} disabled={!selectedItem}>Selecionar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 6. Dependências necessárias

```json
{
  "jszip": "^3.10.1",
  "@tanstack/react-query": "^5.56.2",
  "@supabase/supabase-js": "^2.58.0"
}
```

---

## 7. Sobre os assets (URLs)

As URLs dos arquivos apontam para o storage público deste projeto:
```
https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/efi-code-assets/...
```

**Opção A — Manter URLs atuais**: Funciona imediatamente. Os assets são públicos e acessíveis de qualquer lugar.

**Opção B — Re-upload para novo storage**: Necessário se quiser independência total. Baixe os assets e faça upload para o novo bucket `efi-code-assets`. Depois atualize as URLs no banco.

---

## 8. Prompt para LLM no novo projeto

Use o seguinte prompt ao pedir para outra IA recriar o sistema:

---

> **Prompt:**
>
> Preciso que você crie uma **biblioteca centralizada de imagens e ícones SVG** no meu projeto. O sistema usa **React + TypeScript + Supabase + Tanstack Query + shadcn/ui + JSZip**.
>
> **O que precisa ser criado:**
>
> 1. **3 tabelas no Supabase** com RLS:
>    - `efi_image_categories` — categorias de imagens (name, slug, description, position, is_active)
>    - `efi_library_images` — imagens com referência a categoria (name, url, thumbnail_url, alt_text, tags[], position, is_active)
>    - `efi_library_icons` — ícones SVG com agrupamento automático (name, filename, group_prefix, url, is_active)
>    - RLS: admins gerenciam tudo, qualquer um visualiza itens ativos
>
> 2. **Bucket de storage** `efi-code-assets` (público) com pastas `library/` para imagens e `icons/` para ícones
>
> 3. **Hook `useEfiImageLibrary`** com: queries de categorias (com contagem de imagens), CRUD de categorias e imagens, upload de imagens
>
> 4. **Hook `useEfiLibraryIcons`** com: query de ícones, agrupamento por prefixo (detectado automaticamente do filename: `ilustra-xxx` → grupo `ilustra`, sem prefixo conhecido → `geral`), CRUD, upload individual, importação em lote via ZIP
>
> 5. **Componente `ImagePickerModal`** — modal com abas (Imagens/Ícones), filtros por categoria/grupo, busca por nome/tags, seleção com clique simples (destaca) e duplo clique (seleciona e fecha). Grid responsivo.
>
> Aqui está o SQL completo com dados para importar: [cole o conteúdo do endpoint /export-library-data?format=sql]
>
> E aqui estão os hooks e componente TypeScript completos: [cole o código desta documentação]

---
