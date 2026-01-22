import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useEfiImageLibrary, EfiImageCategory, EfiLibraryImage } from '@/hooks/useEfiImageLibrary';
import { useEfiLibraryIcons, EfiLibraryIcon, extractGroupPrefix } from '@/hooks/useEfiLibraryIcons';
import { IconImportModal } from './IconImportModal';
import { ImageImportModal } from './ImageImportModal';
import { Plus, Pencil, Trash2, Search, X, ImageIcon, Upload, ChevronDown, FileIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageLibraryDialog = ({ open, onOpenChange }: ImageLibraryDialogProps) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'images' | 'icons'>('categories');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Biblioteca de Imagens</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'categories' | 'images' | 'icons')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
            <TabsTrigger value="icons">Ícones</TabsTrigger>
          </TabsList>
          
          <TabsContent value="categories" className="flex-1 overflow-auto mt-4">
            <CategoriesTab />
          </TabsContent>
          
          <TabsContent value="images" className="flex-1 overflow-auto mt-4">
            <ImagesTab />
          </TabsContent>
          
          <TabsContent value="icons" className="flex-1 overflow-auto mt-4">
            <IconsTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Categories Tab Component
const CategoriesTab = () => {
  const { categoriesWithCount, isLoadingCategories, createCategory, updateCategory, deleteCategory } = useEfiImageLibrary();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EfiImageCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', is_active: true });

  const handleOpenForm = (category?: EfiImageCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', slug: '', description: '', is_active: true });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...formData });
        toast.success('Categoria atualizada');
      } else {
        await createCategory.mutateAsync(formData);
        toast.success('Categoria criada');
      }
      setIsFormOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar categoria');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await deleteCategory.mutateAsync(id);
      toast.success('Categoria excluída');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir categoria');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  if (isFormOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={formData.name}
              onChange={(e) => {
                setFormData({ 
                  ...formData, 
                  name: e.target.value,
                  slug: editingCategory ? formData.slug : generateSlug(e.target.value)
                });
              }}
              placeholder="Ex: Headers de Email"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="Ex: headers-email"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional..."
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label>Ativo</Label>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={createCategory.isPending || updateCategory.isPending}>
              {editingCategory ? 'Atualizar' : 'Criar'}
            </Button>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>
      
      {isLoadingCategories ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : categoriesWithCount.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma categoria cadastrada
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Imagens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoriesWithCount.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                <TableCell>{category.image_count || 0}</TableCell>
                <TableCell>
                  <Badge variant={category.is_active ? 'default' : 'secondary'}>
                    {category.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

// Images Tab Component
const ImagesTab = () => {
  const { categories, images, isLoadingImages, createImage, updateImage, deleteImage, uploadImage } = useEfiImageLibrary();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<EfiLibraryImage | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    url: '',
    alt_text: '',
    tags: '',
    is_active: true,
  });
  const [uploading, setUploading] = useState(false);

  const filteredImages = images.filter(img => {
    const matchesCategory = filterCategory === 'all' || img.category_id === filterCategory;
    const matchesSearch = !searchTerm || 
      img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleOpenForm = (image?: EfiLibraryImage) => {
    if (image) {
      setEditingImage(image);
      setFormData({
        name: image.name,
        category_id: image.category_id || '',
        url: image.url,
        alt_text: image.alt_text || '',
        tags: image.tags?.join(', ') || '',
        is_active: image.is_active,
      });
    } else {
      setEditingImage(null);
      setFormData({ name: '', category_id: '', url: '', alt_text: '', tags: '', is_active: true });
    }
    setIsFormOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const category = categories.find(c => c.id === formData.category_id);
      const url = await uploadImage(file, category?.slug);
      setFormData({ ...formData, url, name: formData.name || file.name.replace(/\.[^/.]+$/, '') });
      toast.success('Imagem enviada');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.url) {
      toast.error('Nome e URL são obrigatórios');
      return;
    }

    try {
      const data = {
        name: formData.name,
        category_id: formData.category_id || null,
        url: formData.url,
        alt_text: formData.alt_text || null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        is_active: formData.is_active,
      };

      if (editingImage) {
        await updateImage.mutateAsync({ id: editingImage.id, ...data });
        toast.success('Imagem atualizada');
      } else {
        await createImage.mutateAsync(data);
        toast.success('Imagem adicionada');
      }
      setIsFormOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar imagem');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;
    try {
      await deleteImage.mutateAsync(id);
      toast.success('Imagem excluída');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir imagem');
    }
  };

  if (isFormOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{editingImage ? 'Editar Imagem' : 'Nova Imagem'}</h3>
          <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da imagem"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Upload</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="URL da imagem"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Texto Alternativo</Label>
              <Input
                value={formData.alt_text}
                onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                placeholder="Descrição da imagem"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="icon, logo, header"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border rounded-lg p-4 min-h-[200px] flex items-center justify-center bg-secondary/50">
              {formData.url ? (
                <img src={formData.url} alt={formData.alt_text || 'Preview'} className="max-w-full max-h-[300px] object-contain" />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  <ImageIcon className="h-12 w-12" />
                  <span>Nenhuma imagem</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={createImage.isPending || updateImage.isPending || uploading}>
            {editingImage ? 'Atualizar' : 'Adicionar'}
          </Button>
          <Button variant="outline" onClick={() => setIsFormOpen(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou tag..."
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" onClick={() => setIsImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
        
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Imagem
        </Button>
      </div>
      
      {isLoadingImages ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma imagem encontrada
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className="group relative border rounded-lg overflow-hidden bg-secondary/30"
            >
              <div className="aspect-square flex items-center justify-center p-2">
                <img
                  src={image.url}
                  alt={image.alt_text || image.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              <div className="p-2 border-t">
                <p className="text-sm font-medium truncate">{image.name}</p>
                {image.category && (
                  <p className="text-xs text-muted-foreground truncate">{image.category.name}</p>
                )}
              </div>
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button variant="secondary" size="icon" onClick={() => handleOpenForm(image)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDelete(image.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageImportModal open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
};

// Icons Tab Component
const IconsTab = () => {
  const { icons, isLoadingIcons, getGroupedIcons, createIcon, updateIcon, deleteIcon, uploadIcon } = useEfiLibraryIcons();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingIcon, setEditingIcon] = useState<EfiLibraryIcon | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    filename: '',
    url: '',
    is_active: true,
  });
  const [uploading, setUploading] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Get unique groups for filter
  const groups = useMemo(() => {
    const uniqueGroups = new Set(icons.map(i => i.group_prefix));
    return Array.from(uniqueGroups).sort((a, b) => {
      if (a === 'geral') return 1;
      if (b === 'geral') return -1;
      return a.localeCompare(b);
    });
  }, [icons]);

  // Filter icons
  const filteredIcons = useMemo(() => {
    return icons.filter(icon => {
      const matchesGroup = filterGroup === 'all' || icon.group_prefix === filterGroup;
      const matchesSearch = !searchTerm || 
        icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        icon.filename.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [icons, filterGroup, searchTerm]);

  // Group filtered icons
  const groupedIcons = useMemo(() => {
    return getGroupedIcons(filteredIcons);
  }, [filteredIcons, getGroupedIcons]);

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  // Initialize all groups as open
  useMemo(() => {
    if (groups.length > 0 && openGroups.length === 0) {
      setOpenGroups(groups);
    }
  }, [groups]);

  const handleOpenForm = (icon?: EfiLibraryIcon) => {
    if (icon) {
      setEditingIcon(icon);
      setFormData({
        name: icon.name,
        filename: icon.filename,
        url: icon.url,
        is_active: icon.is_active,
      });
    } else {
      setEditingIcon(null);
      setFormData({ name: '', filename: '', url: '', is_active: true });
    }
    setIsFormOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.svg')) {
      toast.error('Por favor, selecione um arquivo SVG');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadIcon(file);
      const filename = file.name.toLowerCase();
      const name = filename.replace(/\.svg$/i, '');
      setFormData({ ...formData, url, filename, name: formData.name || name });
      toast.success('Ícone enviado');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar ícone');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.url || !formData.filename) {
      toast.error('Nome, arquivo e URL são obrigatórios');
      return;
    }

    try {
      const data = {
        name: formData.name,
        filename: formData.filename,
        url: formData.url,
        is_active: formData.is_active,
      };

      if (editingIcon) {
        await updateIcon.mutateAsync({ id: editingIcon.id, ...data });
        toast.success('Ícone atualizado');
      } else {
        await createIcon.mutateAsync(data);
        toast.success('Ícone adicionado');
      }
      setIsFormOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar ícone');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ícone?')) return;
    try {
      await deleteIcon.mutateAsync(id);
      toast.success('Ícone excluído');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir ícone');
    }
  };

  if (isFormOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{editingIcon ? 'Editar Ícone' : 'Novo Ícone'}</h3>
          <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload SVG</Label>
              <Input
                type="file"
                accept=".svg"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do ícone"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <Input
                value={formData.filename}
                onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                placeholder="nome-do-arquivo.svg"
                disabled={!!editingIcon}
              />
              <p className="text-xs text-muted-foreground">
                Prefixo define o grupo: ilustra-, bolix-, etc.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="URL do ícone"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border rounded-lg p-8 min-h-[200px] flex items-center justify-center bg-secondary/50">
              {formData.url ? (
                <img src={formData.url} alt={formData.name || 'Preview'} className="max-w-[120px] max-h-[120px] object-contain" />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  <FileIcon className="h-12 w-12" />
                  <span>Nenhum ícone</span>
                </div>
              )}
            </div>
            {formData.filename && (
              <p className="text-sm text-muted-foreground">
                Grupo: <span className="font-medium">{extractGroupPrefix(formData.filename)}</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={createIcon.isPending || updateIcon.isPending || uploading}>
            {editingIcon ? 'Atualizar' : 'Adicionar'}
          </Button>
          <Button variant="outline" onClick={() => setIsFormOpen(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos grupos</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group} value={group}>{group}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome..."
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" onClick={() => setIsImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
        
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ícone
        </Button>
      </div>
      
      {isLoadingIcons ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : Object.keys(groupedIcons).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum ícone encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedIcons).map(([group, groupIcons]) => (
            <Collapsible 
              key={group} 
              open={openGroups.includes(group)}
              onOpenChange={() => toggleGroup(group)}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
                  <span className="font-medium">
                    {group} <span className="text-muted-foreground font-normal">({groupIcons.length} ícones)</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openGroups.includes(group) ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 p-3 bg-secondary/20 rounded-lg mt-1">
                  {groupIcons.map((icon) => (
                    <div
                      key={icon.id}
                      className="group relative aspect-square border rounded-lg overflow-hidden bg-background flex items-center justify-center p-2 hover:border-primary transition-colors"
                    >
                      <img
                        src={icon.url}
                        alt={icon.name}
                        className="max-w-full max-h-full object-contain"
                      />
                      
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                        <p className="text-[10px] text-white text-center px-1 truncate w-full">{icon.name}</p>
                        <div className="flex gap-1">
                          <Button variant="secondary" size="icon" className="h-6 w-6" onClick={() => handleOpenForm(icon)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-6 w-6" onClick={() => handleDelete(icon.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      <IconImportModal open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
};
