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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  FileCode,
  Images,
  Upload,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useEfiCodeBlocks, EfiCodeBlockFormData } from '@/hooks/useEfiCodeBlocks';
import { useEfiCodeConfig } from '@/hooks/useEfiCodeConfig';
import { BlockImportModal } from '@/components/eficode/BlockImportModal';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImageLibraryDialog } from '@/components/eficode/ImageLibraryDialog';

const CATEGORIES = [
  { value: 'layout', label: 'Layout' },
  { value: 'texto', label: 'Texto' },
  { value: 'midia', label: 'Mídia' },
  { value: 'interativo', label: 'Interativo' },
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
  icon_name: 'Code',
  html_content: '',
  position: 0,
  is_active: true,
};

export default function AdminEfiCodeBlocks() {
  const navigate = useNavigate();
  const { blocks, isLoading, createBlock, updateBlock, deleteBlock, toggleBlockActive } = useEfiCodeBlocks();
  const { globalCss, updateConfig, isLoading: isConfigLoading } = useEfiCodeConfig();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCssDialogOpen, setIsCssDialogOpen] = useState(false);
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EfiCodeBlockFormData>(defaultFormData);
  const [cssContent, setCssContent] = useState('');
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
    return <Code className="h-4 w-4" />;
  };

  const handleOpenDialog = (block?: typeof blocks[0]) => {
    if (block) {
      setEditingId(block.id);
      setFormData({
        name: block.name,
        description: block.description,
        category: block.category,
        icon_name: block.icon_name,
        html_content: block.html_content || '',
        thumbnail_url: block.thumbnail_url,
        position: block.position,
        is_active: block.is_active,
      });
    } else {
      setEditingId(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name) {
        toast.error('Nome é obrigatório');
        return;
      }

      if (editingId) {
        await updateBlock.mutateAsync({ id: editingId, ...formData });
        toast.success('Bloco atualizado com sucesso');
      } else {
        await createBlock.mutateAsync(formData);
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

  const handleImportBlocks = async (importedBlocks: Array<{
    name: string;
    description?: string;
    category?: string;
    icon_name?: string;
    html_content: string;
  }>) => {
    for (const block of importedBlocks) {
      await createBlock.mutateAsync({
        name: block.name,
        description: block.description || null,
        category: block.category || 'layout',
        icon_name: block.icon_name || 'Code',
        html_content: block.html_content,
        position: blocks.length,
        is_active: true,
      });
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
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCssContent(globalCss);
                    setIsCssDialogOpen(true);
                  }}
                >
                  <FileCode className="h-4 w-4 mr-2" />
                  CSS Global
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsImageLibraryOpen(true)}
                >
                  <Images className="h-4 w-4 mr-2" />
                  Biblioteca
                </Button>
                
                {/* Dropdown para Novo Bloco */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Bloco
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog()}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Criar Bloco
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsImportModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Pos</TableHead>
                  <TableHead className="w-12">Ícone</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>HTML</TableHead>
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
                      <TableCell>
                        {block.html_content ? (
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] block">
                            {block.html_content.substring(0, 50)}...
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
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

        {/* Dialog de Criar/Editar Bloco */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Bloco' : 'Novo Bloco'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Atualize as informações do bloco HTML.' : 'Crie um novo bloco HTML personalizado.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Hero Section, Card..."
                  />
                </div>

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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Posição</Label>
                  <Input
                    type="number"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                  />
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="html_content" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Código HTML
                </Label>
                <textarea
                  id="html_content"
                  value={formData.html_content || ''}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  placeholder={`<div class="hero-section">
  <h1>Título Principal</h1>
  <p>Subtítulo descritivo</p>
  <a href="#" class="btn">Saiba mais</a>
</div>`}
                  rows={12}
                  className="w-full px-3 py-2 rounded-md border bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ tabSize: 2 }}
                />
                <p className="text-xs text-muted-foreground">
                  Este HTML será renderizado quando o bloco for arrastado para o editor.
                </p>
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
              <Button onClick={handleSubmit} disabled={!formData.name}>
                {editingId ? 'Salvar' : 'Criar Bloco'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSS Global Dialog */}
        <Dialog open={isCssDialogOpen} onOpenChange={setIsCssDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>CSS Global</DialogTitle>
              <DialogDescription>
                Este CSS será incluído automaticamente em todos os sites exportados do Efi Code.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Textarea
                value={cssContent}
                onChange={(e) => setCssContent(e.target.value)}
                placeholder={`/* Adicione seu CSS global aqui */

body {
  font-family: 'Inter', sans-serif;
}

.btn-primary {
  background: linear-gradient(135deg, #00809d, #005f74);
  transition: all 0.3s ease;
}`}
                className="font-mono text-sm min-h-[400px]"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCssDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={async () => {
                  await updateConfig.mutateAsync({ global_css: cssContent });
                  setIsCssDialogOpen(false);
                }}
                disabled={updateConfig.isPending}
              >
                {updateConfig.isPending ? 'Salvando...' : 'Salvar CSS'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Modal */}
        <BlockImportModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onImport={handleImportBlocks}
        />

        {/* Image Library Dialog */}
        <ImageLibraryDialog 
          open={isImageLibraryOpen} 
          onOpenChange={setIsImageLibraryOpen} 
        />
        </main>
      </div>
    </SidebarProvider>
  );
}
