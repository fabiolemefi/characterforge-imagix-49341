import { useState, useEffect, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as LucideIcons from "lucide-react";

interface CategoryPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: string;
  pageId?: string;
  mode: 'category' | 'page';
  onSuccess: () => void;
}

const availableIcons = [
  'Book', 'Palette', 'Image', 'Type', 'Hash', 'FileText', 'Grid3X3', 'Layout',
  'StickyNote', 'Square', 'RectangleHorizontal', 'Layers', 'Shapes', 'Star',
  'Heart', 'Circle', 'SquareStack', 'Folder', 'File', 'Calendar', 'Clock',
  'User', 'Users', 'Building', 'Home', 'Globe', 'MapPin', 'Phone', 'Mail',
  'Send', 'Paperclip', 'Camera', 'Headphones', 'Monitor', 'Code', 'Zap'
];

export const CategoryPageDialog = memo(({
  open,
  onOpenChange,
  categoryId,
  pageId,
  mode,
  onSuccess
}: CategoryPageDialogProps) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('Book');
  const [iconSearch, setIconSearch] = useState('');
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && pageId) {
      loadPageData();
    } else if (open && categoryId && mode === 'category') {
      loadCategoryData();
    } else if (open) {
      resetForm();
    }
  }, [open, pageId, categoryId, mode]);

  const resetForm = () => {
    setName('');
    setSlug('');
    setIcon('Book');
    setPosition(0);
  };

  const loadCategoryData = async () => {
    if (!categoryId) return;
    const { data, error } = await supabase
      .from('brand_guide_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) {
      toast.error('Erro ao carregar categoria');
      return;
    }

    if (data) {
      setName(data.name);
      setSlug(data.slug);
      setIcon(data.icon);
      setPosition(data.position);
    }
  };

  const loadPageData = async () => {
    if (!pageId) return;
    const { data, error } = await supabase
      .from('brand_guide_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (error) {
      toast.error('Erro ao carregar página');
      return;
    }

    if (data) {
      setName(data.name);
      setSlug(data.slug);
      setPosition(data.position);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!pageId && !categoryId) {
      setSlug(generateSlug(value));
    }
  };

  const handleSave = async () => {
    if (!name || !slug) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'category') {
        if (categoryId) {
          // Update category
          const { error } = await supabase
            .from('brand_guide_categories')
            .update({ name, slug, icon, position })
            .eq('id', categoryId);

          if (error) throw error;
          toast.success('Categoria atualizada com sucesso');
        } else {
          // Create category
          const { error } = await supabase
            .from('brand_guide_categories')
            .insert({ name, slug, icon, position });

          if (error) throw error;
          toast.success('Categoria criada com sucesso');
        }
      } else {
        // Page mode
        if (pageId) {
          // Update page
          const { error } = await supabase
            .from('brand_guide_pages')
            .update({ name, slug, position })
            .eq('id', pageId);

          if (error) throw error;
          toast.success('Página atualizada com sucesso');
        } else {
          // Create page
          const { error } = await supabase
            .from('brand_guide_pages')
            .insert({ 
              category_id: categoryId!, 
              name, 
              slug, 
              position 
            });

          if (error) throw error;
          toast.success('Página criada com sucesso');
        }
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'category'
              ? (categoryId ? 'Editar Categoria' : 'Nova Categoria')
              : (pageId ? 'Editar Página' : 'Nova Página')
            }
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: ID Visual"
            />
          </div>

          <div>
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Ex: id-visual"
            />
          </div>

          {mode === 'category' && (
            <div className="space-y-3">
              <div>
                <Label>Ícone</Label>
                <Input
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="Buscar ícones..."
                  className="mb-2"
                />
              </div>

              <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-6 gap-3">
                  {availableIcons
                    .filter(icon => icon.toLowerCase().includes(iconSearch.toLowerCase()))
                    .map(iconName => {
                      const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Book;
                      return (
                        <button
                          key={iconName}
                          onClick={() => setIcon(iconName)}
                          className={`p-2 rounded-md transition-colors flex flex-col items-center gap-1 hover:bg-gray-100 ${
                            icon === iconName ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                          }`}
                          title={iconName}
                        >
                          <IconComponent size={20} />
                          <span className="text-xs truncate w-full text-center">{iconName}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Ícone selecionado: <span className="font-medium">{icon}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Posição</Label>
            <Input
              type="number"
              value={position}
              onChange={(e) => setPosition(parseInt(e.target.value))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
