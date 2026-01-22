import { useState } from 'react';
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
import { useEfiImageLibrary, EfiImageCategory, EfiLibraryImage } from '@/hooks/useEfiImageLibrary';
import { Plus, Pencil, Trash2, Upload, Search, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageLibraryDialog = ({ open, onOpenChange }: ImageLibraryDialogProps) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'images'>('categories');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Biblioteca de Imagens</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'categories' | 'images')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
          </TabsList>
          
          <TabsContent value="categories" className="flex-1 overflow-auto mt-4">
            <CategoriesTab />
          </TabsContent>
          
          <TabsContent value="images" className="flex-1 overflow-auto mt-4">
            <ImagesTab />
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
    </div>
  );
};
