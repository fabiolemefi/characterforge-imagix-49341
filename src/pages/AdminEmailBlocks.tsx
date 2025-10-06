import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ArrowLeft, Upload } from 'lucide-react';
import { useEmailBlocks } from '@/hooks/useEmailBlocks';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const CATEGORIES = ['header', 'hero', 'content', 'list', 'footer', 'social'];

const AdminEmailBlocks = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { blocks, reloadBlocks } = useEmailBlocks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importHtml, setImportHtml] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'content',
    html_template: '',
    thumbnail_url: '',
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

  const handleOpenModal = (block?: any) => {
    if (block) {
      setEditingBlock(block);
      setFormData({
        name: block.name,
        description: block.description || '',
        category: block.category,
        html_template: block.html_template,
        thumbnail_url: block.thumbnail_url || '',
      });
      setThumbnailPreview(block.thumbnail_url || '');
      setThumbnailFile(null);
    } else {
      setEditingBlock(null);
      setFormData({
        name: '',
        description: '',
        category: 'content',
        html_template: '',
        thumbnail_url: '',
      });
      setThumbnailPreview('');
      setThumbnailFile(null);
    }
    setIsModalOpen(true);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile) return formData.thumbnail_url || null;

    try {
      const fileExt = thumbnailFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('email-images')
        .upload(filePath, thumbnailFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('email-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do thumbnail:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.html_template.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Nome e HTML são obrigatórios',
      });
      return;
    }

    try {
      const thumbnailUrl = await uploadThumbnail();

      if (editingBlock) {
        const updateData: any = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          html_template: formData.html_template,
        };

        if (thumbnailUrl) {
          updateData.thumbnail_url = thumbnailUrl;
        }

        const { error } = await supabase
          .from('email_blocks')
          .update(updateData)
          .eq('id', editingBlock.id);

        if (error) throw error;

        toast({
          title: 'Bloco atualizado!',
          description: 'O bloco foi atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('email_blocks')
          .insert([{ 
            ...formData, 
            thumbnail_url: thumbnailUrl,
            is_active: true 
          }]);

        if (error) throw error;

        toast({
          title: 'Bloco criado!',
          description: 'Novo bloco foi criado com sucesso.',
        });
      }

      setIsModalOpen(false);
      reloadBlocks();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o bloco "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('email_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Bloco excluído',
        description: 'O bloco foi removido com sucesso.',
      });

      reloadBlocks();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      header: 'Cabeçalho',
      hero: 'Hero',
      content: 'Conteúdo',
      list: 'Lista',
      footer: 'Rodapé',
      social: 'Social',
    };
    return labels[category] || category;
  };

  const handleImportBlocks = async () => {
    if (!importHtml.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'Cole o HTML dos blocos para importar',
      });
      return;
    }

    setIsImporting(true);

    try {
      // Parse blocks from HTML comments
      const blockRegex = /<!-- ={3,} INÍCIO ([A-ZÀ-Ú\s]+) ={3,} -->[\s\S]*?<!-- ={3,} FIM \1 ={3,} -->/gi;
      const matches = [...importHtml.matchAll(blockRegex)];

      if (matches.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nenhum bloco encontrado',
          description: 'Certifique-se de usar os comentários no formato: <!-- === INÍCIO NOME === -->',
        });
        setIsImporting(false);
        return;
      }

      const blocksToInsert = matches.map(match => {
        const blockName = match[1].trim();
        const blockHtml = match[0];
        
        // Map block names to categories
        const categoryMap: Record<string, string> = {
          'HEADER': 'header',
          'CABEÇALHO': 'header',
          'HERO': 'hero',
          'RODAPÉ': 'footer',
          'FOOTER': 'footer',
          'TEXTO PRINCIPAL': 'content',
          'CONTEÚDO': 'content',
          'CONTENT': 'content',
          'BLOCO VANTAGENS': 'list',
          'VANTAGENS': 'list',
          'LISTA': 'list',
          'CTA': 'content',
          'CTA FINAL': 'content',
        };

        const category = categoryMap[blockName.toUpperCase()] || 'content';

        return {
          name: blockName.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          description: `Bloco importado: ${blockName}`,
          category,
          html_template: blockHtml,
          is_active: true,
        };
      });

      setImportProgress({ current: 0, total: blocksToInsert.length });

      // Insert blocks one by one to show progress
      for (let i = 0; i < blocksToInsert.length; i++) {
        const { error } = await supabase
          .from('email_blocks')
          .insert([blocksToInsert[i]]);

        if (error) throw error;

        setImportProgress({ current: i + 1, total: blocksToInsert.length });
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      toast({
        title: 'Blocos importados!',
        description: `${blocksToInsert.length} bloco(s) criado(s) com sucesso.`,
      });

      setIsImportModalOpen(false);
      setImportHtml('');
      setImportProgress({ current: 0, total: 0 });
      reloadBlocks();
    } catch (error: any) {
      console.error('Erro ao importar blocos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao importar',
        description: error.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1">
          <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/plugins')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Blocos de Email</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Blocos
              </Button>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Bloco
              </Button>
            </div>
          </header>

          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              <p className="text-muted-foreground mb-6">
                Gerencie os blocos disponíveis para o Email Builder
              </p>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[150px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-medium">{block.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(block.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {block.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(block)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(block.id, block.name)}
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
            </div>
          </main>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? 'Editar Bloco' : 'Criar Novo Bloco'}
            </DialogTitle>
            <DialogDescription>
              Configure o bloco de email que será usado no builder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Bloco *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Header Principal"
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do bloco..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="thumbnail">Thumbnail (Preview)</Label>
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="cursor-pointer"
              />
              {thumbnailPreview && (
                <div className="mt-2">
                  <img 
                    src={thumbnailPreview} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded border"
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="html">HTML Template *</Label>
              <Textarea
                id="html"
                value={formData.html_template}
                onChange={(e) => setFormData({ ...formData, html_template: e.target.value })}
                placeholder="Cole o HTML do bloco aqui..."
                className="font-mono text-sm"
                rows={12}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingBlock ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Blocos</DialogTitle>
            <DialogDescription>
              Cole o HTML com os blocos separados por comentários no formato: 
              <code className="block mt-2 text-xs bg-muted p-2 rounded">
                &lt;!-- =================== INÍCIO NOME =================== --&gt;
                <br />
                ...conteúdo do bloco...
                <br />
                &lt;!-- =================== FIM NOME =================== --&gt;
              </code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-html">HTML dos Blocos</Label>
              <Textarea
                id="import-html"
                value={importHtml}
                onChange={(e) => setImportHtml(e.target.value)}
                placeholder="Cole aqui o HTML com os blocos comentados..."
                className="font-mono text-sm"
                rows={20}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
              >
                Cancelar
              </Button>
              <Button onClick={handleImportBlocks} disabled={isImporting}>
                <Upload className="h-4 w-4 mr-2" />
                {isImporting 
                  ? `Importando ${importProgress.current}/${importProgress.total}...` 
                  : 'Importar Blocos'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminEmailBlocks;
