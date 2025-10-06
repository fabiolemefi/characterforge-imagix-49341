import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, MoreVertical, Edit, Trash2, Mail, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { Sidebar } from '@/components/Sidebar';
import Header from '@/components/Header';
import { PromoBar } from '@/components/PromoBar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { downloadEmailHtml } from '@/lib/emailExporter';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 10;

const EmailTemplates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { templates, loading, saveTemplate, deleteTemplate } = useEmailTemplates();

  const models = templates.filter(t => t.is_model);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUseModelDialogOpen, setIsUseModelDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    preview_text: '',
    description: '',
  });

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    
    const query = searchQuery.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(query) ||
      template.subject?.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTemplates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTemplates, currentPage]);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Por favor, dê um nome ao seu template',
      });
      return;
    }

    const created = await saveTemplate({
      name: newTemplate.name,
      subject: newTemplate.subject || null,
      preview_text: newTemplate.preview_text || null,
      description: newTemplate.description || null,
      html_content: '',
    });

    if (created) {
      setIsCreateModalOpen(false);
      setNewTemplate({ name: '', subject: '', preview_text: '', description: '' });
      navigate(`/email-builder/${created.id}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir o template "${name}"?`)) {
      await deleteTemplate(id);
    }
  };

  const handleExport = (template: any) => {
    try {
      downloadEmailHtml(
        template.html_content || '',
        template.name,
        template.subject || template.name,
        template.preview_text
      );
      
      toast({
        title: 'Email exportado',
        description: `${template.name} foi exportado como HTML otimizado para email`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar o email',
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <PromoBar />
        <Header />
        
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Email Builder</h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie seus templates de email
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsUseModelDialogOpen(true)}>
                  Usar Modelo
                </Button>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Email
                </Button>
              </div>
            </div>

            {/* Search bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates por nome, assunto ou descrição..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Atualizado em</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/30">
                {searchQuery ? (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Tente buscar com outros termos
                    </p>
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Limpar busca
                    </Button>
                  </>
                ) : (
                  <>
                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum template criado</h3>
                    <p className="text-muted-foreground mb-4">
                      Comece criando seu primeiro template de email
                    </p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Email
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Atualizado em</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.subject || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.description || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(template.updated_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/email-builder/${template.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleExport(template)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Exportar HTML
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(template.id, template.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredTemplates.length)} de {filteredTemplates.length} templates
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-sm">
                        Página {currentPage} de {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Email</DialogTitle>
            <DialogDescription>
              Preencha as informações básicas do seu novo template de email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Email *</Label>
              <Input
                id="name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Ex: Newsletter Mensal"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="subject">Assunto do Email</Label>
              <Input
                id="subject"
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                placeholder="Ex: Novidades deste mês"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="preview">Texto de Preview</Label>
              <Textarea
                id="preview"
                value={newTemplate.preview_text}
                onChange={(e) => setNewTemplate({ ...newTemplate, preview_text: e.target.value })}
                placeholder="Texto que aparece na caixa de entrada..."
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Descrição interna do template..."
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTemplate}>
                Criar e Editar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUseModelDialogOpen} onOpenChange={setIsUseModelDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Escolher Modelo</DialogTitle>
            <DialogDescription>
              Selecione um modelo para utilizar como base para seu novo email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {models.length === 0 ? (
              <p className="text-center text-muted-foreground">Nenhum modelo disponível</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Atualizado em</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {model.subject || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {model.description || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(model.updated_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigate('/email-builder', { state: { modelId: model.id } });
                            setIsUseModelDialogOpen(false);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Usar Modelo
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsUseModelDialogOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplates;
