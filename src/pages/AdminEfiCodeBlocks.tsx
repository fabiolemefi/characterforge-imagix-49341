import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  SquareDashed,
  Type,
  Heading,
  MousePointerClick,
  ImageIcon,
  Minus,
  MoveVertical,
  Video,
  Columns,
  FormInput,
  LayoutGrid,
  Link,
  List,
  Quote,
  Table as TableIcon,
  Code,
} from 'lucide-react';
import { useEfiCodeBlocks, EfiCodeBlockFormData } from '@/hooks/useEfiCodeBlocks';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const CATEGORIES = [
  { value: 'layout', label: 'Layout' },
  { value: 'texto', label: 'Texto' },
  { value: 'midia', label: 'Mídia' },
  { value: 'interativo', label: 'Interativo' },
];

const COMPONENT_TYPES = [
  { value: 'Container', label: 'Container' },
  { value: 'Heading', label: 'Heading (Título)' },
  { value: 'Text', label: 'Text (Texto)' },
  { value: 'Button', label: 'Button (Botão)' },
  { value: 'Image', label: 'Image (Imagem)' },
  { value: 'Divider', label: 'Divider (Separador)' },
  { value: 'Spacer', label: 'Spacer (Espaçador)' },
];

const ICON_OPTIONS = [
  { value: 'SquareDashed', label: 'Container', icon: SquareDashed },
  { value: 'Heading', label: 'Título', icon: Heading },
  { value: 'Type', label: 'Texto', icon: Type },
  { value: 'MousePointerClick', label: 'Botão', icon: MousePointerClick },
  { value: 'ImageIcon', label: 'Imagem', icon: ImageIcon },
  { value: 'Minus', label: 'Separador', icon: Minus },
  { value: 'MoveVertical', label: 'Espaçador', icon: MoveVertical },
  { value: 'Video', label: 'Vídeo', icon: Video },
  { value: 'Columns', label: 'Colunas', icon: Columns },
  { value: 'FormInput', label: 'Formulário', icon: FormInput },
  { value: 'LayoutGrid', label: 'Grid', icon: LayoutGrid },
  { value: 'Link', label: 'Link', icon: Link },
  { value: 'List', label: 'Lista', icon: List },
  { value: 'Quote', label: 'Citação', icon: Quote },
  { value: 'Table', label: 'Tabela', icon: TableIcon },
  { value: 'Code', label: 'Código', icon: Code },
];

const defaultFormData: EfiCodeBlockFormData = {
  name: '',
  description: '',
  category: 'layout',
  icon_name: 'SquareDashed',
  component_type: 'Container',
  default_props: {},
  thumbnail_url: '',
  position: 0,
  is_active: true,
};

export default function AdminEfiCodeBlocks() {
  const navigate = useNavigate();
  const { blocks, isLoading, createBlock, updateBlock, deleteBlock, toggleBlockActive } = useEfiCodeBlocks();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EfiCodeBlockFormData>(defaultFormData);
  const [defaultPropsJson, setDefaultPropsJson] = useState('{}');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_admin) {
      navigate('/');
      return;
    }
    setIsAdmin(true);
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
    if (iconOption) {
      const IconComp = iconOption.icon;
      return <IconComp className="h-4 w-4" />;
    }
    return <SquareDashed className="h-4 w-4" />;
  };

  const handleOpenDialog = (block?: typeof blocks[0]) => {
    if (block) {
      setEditingId(block.id);
      setFormData({
        name: block.name,
        description: block.description,
        category: block.category,
        icon_name: block.icon_name,
        component_type: block.component_type,
        default_props: block.default_props,
        thumbnail_url: block.thumbnail_url,
        position: block.position,
        is_active: block.is_active,
      });
      setDefaultPropsJson(JSON.stringify(block.default_props, null, 2));
    } else {
      setEditingId(null);
      setFormData(defaultFormData);
      setDefaultPropsJson('{}');
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      let parsedProps = {};
      try {
        parsedProps = JSON.parse(defaultPropsJson);
      } catch {
        toast.error('JSON de props padrão inválido');
        return;
      }

      const data = { ...formData, default_props: parsedProps };

      if (editingId) {
        await updateBlock.mutateAsync({ id: editingId, ...data });
        toast.success('Bloco atualizado com sucesso');
      } else {
        await createBlock.mutateAsync(data);
        toast.success('Bloco criado com sucesso');
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar bloco');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este bloco?')) return;
    try {
      await deleteBlock.mutateAsync(id);
      toast.success('Bloco excluído');
    } catch (error) {
      toast.error('Erro ao excluir bloco');
      console.error(error);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      await toggleBlockActive.mutateAsync({ id, is_active: !currentState });
      toast.success(currentState ? 'Bloco desativado' : 'Bloco ativado');
    } catch (error) {
      toast.error('Erro ao alterar status');
      console.error(error);
    }
  };

  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin/plugins')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Blocos do Efi Code</h1>
                  <p className="text-muted-foreground">
                    Gerencie os componentes disponíveis no editor
                  </p>
                </div>
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Bloco
              </Button>
            </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Pos</TableHead>
                  <TableHead className="w-12">Ícone</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Componente</TableHead>
                  <TableHead className="w-20">Ativo</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : blocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Nenhum bloco cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  blocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-mono text-sm">{block.position}</TableCell>
                      <TableCell>{getIconComponent(block.icon_name)}</TableCell>
                      <TableCell className="font-medium">{block.name}</TableCell>
                      <TableCell className="capitalize">{block.category}</TableCell>
                      <TableCell className="font-mono text-sm">{block.component_type}</TableCell>
                      <TableCell>
                        <Switch
                          checked={block.is_active}
                          onCheckedChange={() => handleToggleActive(block.id, block.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(block)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(block.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Bloco' : 'Novo Bloco'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Container, Título, Botão..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do bloco..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Posição</Label>
                  <Input
                    type="number"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select
                  value={formData.icon_name}
                  onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((icon) => {
                      const IconComp = icon.icon;
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <IconComp className="h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo do Componente</Label>
                <Select
                  value={formData.component_type}
                  onValueChange={(value) => setFormData({ ...formData, component_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_props">Props Padrão (JSON)</Label>
                <Textarea
                  id="default_props"
                  value={defaultPropsJson}
                  onChange={(e) => setDefaultPropsJson(e.target.value)}
                  placeholder="{}"
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail_url">URL da Thumbnail</Label>
                <Input
                  id="thumbnail_url"
                  value={formData.thumbnail_url || ''}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Bloco ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.name || !formData.component_type}>
                {editingId ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
}
