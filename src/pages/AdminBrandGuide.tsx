import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Edit } from 'lucide-react';
import { useBrandGuide } from '@/hooks/useBrandGuide';
import { CategoryPageDialog } from '@/components/brandguide/CategoryPageDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminBrandGuide() {
  const { categories, loading, loadCategories } = useBrandGuide();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'category' | 'page'>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>();

  const handleAddCategory = () => {
    setSelectedCategoryId(undefined);
    setSelectedPageId(undefined);
    setDialogMode('category');
    setDialogOpen(true);
  };

  const handleEditCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedPageId(undefined);
    setDialogMode('category');
    setDialogOpen(true);
  };

  const handleAddPage = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedPageId(undefined);
    setDialogMode('page');
    setDialogOpen(true);
  };

  const handleEditPage = (categoryId: string, pageId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedPageId(pageId);
    setDialogMode('page');
    setDialogOpen(true);
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta página?')) return;

    const { error } = await supabase
      .from('brand_guide_pages')
      .delete()
      .eq('id', pageId);

    if (error) {
      toast.error('Erro ao excluir página');
    } else {
      toast.success('Página excluída com sucesso');
      loadCategories();
    }
  };

  const handleDialogSuccess = () => {
    loadCategories();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Guia de Marca</h1>
              <p className="text-muted-foreground">
                Gerencie categorias e páginas do guia de marca
              </p>
            </div>
            <Button onClick={handleAddCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          <div className="space-y-8">
            {loading ? (
              <div>Carregando...</div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-semibold">{category.name}</h2>
                      <Badge variant={category.is_active ? 'default' : 'secondary'}>
                        {category.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditCategory(category.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddPage(category.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.pages?.map((page) => (
                        <TableRow key={page.id}>
                          <TableCell>{page.position}</TableCell>
                          <TableCell className="font-medium">{page.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {page.slug}
                          </TableCell>
                          <TableCell>
                            <Badge variant={page.is_active ? 'default' : 'secondary'}>
                              {page.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/admin/brand-guide/${category.slug}/${page.slug}`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeletePage(page.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))
            )}
          </div>
        </div>

        <CategoryPageDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          categoryId={selectedCategoryId}
          pageId={selectedPageId}
          mode={dialogMode}
          onSuccess={handleDialogSuccess}
        />
      </div>
    </SidebarProvider>
  );
}
