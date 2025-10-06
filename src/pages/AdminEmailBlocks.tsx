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
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useEmailBlocks } from '@/hooks/useEmailBlocks';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminSidebar } from '@/components/AdminSidebar';
import Header from '@/components/Header';
import { PromoBar } from '@/components/PromoBar';

const CATEGORIES = ['header', 'hero', 'content', 'list', 'footer', 'social'];

const AdminEmailBlocks = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { blocks, reloadBlocks } = useEmailBlocks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'content',
    html_template: '',
  });

  const handleOpenModal = (block?: any) => {
    if (block) {
      setEditingBlock(block);
      setFormData({
        name: block.name,
        description: block.description || '',
        category: block.category,
        html_template: block.html_template,
      });
    } else {
      setEditingBlock(null);
      setFormData({
        name: '',
        description: '',
        category: 'content',
        html_template: '',
      });
    }
    setIsModalOpen(true);
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
      if (editingBlock) {
        const { error } = await supabase
          .from('email_blocks')
          .update(formData)
          .eq('id', editingBlock.id);

        if (error) throw error;

        toast({
          title: 'Bloco atualizado!',
          description: 'O bloco foi atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('email_blocks')
          .insert([{ ...formData, is_active: true }]);

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

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col">
        <PromoBar />
        <Header />
        
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/plugins')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">Blocos de Email</h1>
                  <p className="text-muted-foreground mt-1">
                    Gerencie os blocos disponíveis para o Email Builder
                  </p>
                </div>
              </div>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Bloco
              </Button>
            </div>

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
    </div>
  );
};

export default AdminEmailBlocks;
