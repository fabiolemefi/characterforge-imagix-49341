import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, MoreVertical, Edit, Trash2, Mail, Download, Search, ChevronLeft, ChevronRight, Sparkles, Database, Cloud, HardDrive, RefreshCw, Loader, FolderOpen, X } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { downloadEmailHtml } from '@/lib/emailExporter';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateWithAIModal } from '@/components/CreateWithAIModal';
import { DatasetModal } from '@/components/DatasetModal';
import { ScrollArea } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 10;

interface OnlineEmail {
  id: number;
  name: string;
  assetType?: { id: number; name: string };
  modifiedDate?: string;
  status?: { id: number; name: string };
  customerKey?: string;
  category?: { id: number; name: string };
}

interface SfmcCategory {
  id: number;
  name: string;
  parentId?: number;
}

const EmailTemplates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { templates, loading, saveTemplate, deleteTemplate, reloadTemplates } = useEmailTemplates();

  const models = templates.filter(t => t.is_model);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUseModelDialogOpen, setIsUseModelDialogOpen] = useState(false);
  const [isCreateWithAIModalOpen, setIsCreateWithAIModalOpen] = useState(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    preview_text: '',
    description: '',
  });

  // Estados para aba online
  const [activeTab, setActiveTab] = useState<'offline' | 'online'>('offline');
  const [onlineEmails, setOnlineEmails] = useState<OnlineEmail[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlinePage, setOnlinePage] = useState(1);
  const [onlineTotalCount, setOnlineTotalCount] = useState(0);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [loadingEmailId, setLoadingEmailId] = useState<number | null>(null);
  const [deletingEmailId, setDeletingEmailId] = useState<number | null>(null);

  // Estados para seleção múltipla
  const [selectedOfflineIds, setSelectedOfflineIds] = useState<Set<string>>(new Set());
  const [selectedOnlineIds, setSelectedOnlineIds] = useState<Set<number>>(new Set());

  // Estados para ações em lote
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchMoving, setBatchMoving] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [sfmcCategories, setSfmcCategories] = useState<SfmcCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [filterCategory, setFilterCategory] = useState<{ id: number; name: string } | null>(null);

  // Função para comunicar com a extensão SFMC Proxy
  const sendToExtension = (action: string, payload?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random()}`;
      
      const handler = (event: MessageEvent) => {
        if (event.data?.target === 'SFMC_PROXY_RESPONSE' && event.data?.requestId === requestId) {
          window.removeEventListener('message', handler);
          if (event.data.response?.error) {
            reject(new Error(event.data.response.error));
          } else {
            resolve(event.data.response);
          }
        }
      };
      
      window.addEventListener('message', handler);
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Timeout - Extensão não respondeu'));
      }, 30000);
      
      window.postMessage({
        target: 'SFMC_PROXY',
        action,
        payload,
        requestId
      }, '*');
    });
  };

  // Verifica se extensão está conectada
  const checkExtension = async () => {
    try {
      const response = await sendToExtension('CHECK_EXTENSION');
      setExtensionConnected(response.configured === true);
      return response.configured === true;
    } catch {
      setExtensionConnected(false);
      return false;
    }
  };

  // Carrega emails online do SFMC
  const loadOnlineEmails = async (page = 1, search = '', categoryIdFilter: number | null = filterCategory?.id || null) => {
    setOnlineLoading(true);
    try {
      const isConnected = await checkExtension();
      if (!isConnected) {
        toast({
          variant: 'destructive',
          title: 'Extensão não configurada',
          description: 'Configure a extensão SFMC Proxy para acessar emails online'
        });
        return;
      }

      const response = await sendToExtension('LIST_EMAILS', { 
        page, 
        pageSize: ITEMS_PER_PAGE,
        search,
        categoryId: categoryIdFilter
      });

      if (response.success) {
        setOnlineEmails(response.items || []);
        setOnlineTotalCount(response.count || 0);
        setOnlinePage(page);
      } else {
        throw new Error(response.error || 'Erro ao carregar emails');
      }
    } catch (error) {
      console.error('Erro ao carregar emails online:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar emails',
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setOnlineLoading(false);
    }
  };

  // Verifica extensão ao mudar para aba online
  useEffect(() => {
    if (activeTab === 'online') {
      loadOnlineEmails(1, onlineSearchQuery, filterCategory?.id || null);
    }
    // Limpa seleção ao mudar de aba
    setSelectedOfflineIds(new Set());
    setSelectedOnlineIds(new Set());
  }, [activeTab]);

  // Handler para clicar na pasta e filtrar
  const handleCategoryClick = (category: { id: number; name: string }) => {
    setFilterCategory(category);
    loadOnlineEmails(1, onlineSearchQuery, category.id);
  };

  // Handler para limpar filtro de pasta
  const clearCategoryFilter = () => {
    setFilterCategory(null);
    loadOnlineEmails(1, onlineSearchQuery, null);
  };

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

  const onlineTotalPages = Math.ceil(onlineTotalCount / ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleOnlineSearchChange = (value: string) => {
    setOnlineSearchQuery(value);
  };

  const handleOnlineSearch = () => {
    loadOnlineEmails(1, onlineSearchQuery, filterCategory?.id || null);
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

  const getAssetTypeName = (assetType?: { id: number; name: string }) => {
    if (!assetType) return '-';
    switch (assetType.id) {
      case 207: return 'Template';
      case 208: return 'HTML';
      case 209: return 'Texto';
      default: return assetType.name || '-';
    }
  };

  // Função para editar email online
  const handleEditOnlineEmail = async (email: OnlineEmail) => {
    setLoadingEmailId(email.id);
    try {
      toast({
        title: 'Carregando email...',
        description: 'Buscando conteúdo do Marketing Cloud'
      });

      const response = await sendToExtension('GET_EMAIL', { assetId: email.id });

      if (response.success) {
        navigate('/email-builder', {
          state: {
            onlineEmail: {
              id: response.id,
              name: response.name,
              content: response.content,
              views: response.views,
              assetType: response.assetType,
              category: response.category
            }
          }
        });
      } else {
        throw new Error(response.error || 'Erro ao buscar email');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar email',
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoadingEmailId(null);
    }
  };

  // Função para deletar email online
  const handleDeleteOnlineEmail = async (email: OnlineEmail) => {
    if (!confirm(`Deseja realmente excluir o email "${email.name}" do Marketing Cloud?\n\nAtenção: Esta ação não pode ser desfeita!`)) {
      return;
    }

    setDeletingEmailId(email.id);
    try {
      const response = await sendToExtension('DELETE_EMAIL', { assetId: email.id });

      if (response.success) {
        toast({
          title: 'Email excluído',
          description: `"${email.name}" foi removido do Marketing Cloud`
        });
        loadOnlineEmails(onlinePage, onlineSearchQuery);
      } else {
        throw new Error(response.error || 'Erro ao excluir email');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir email',
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setDeletingEmailId(null);
    }
  };

  // Funções de seleção
  const toggleOfflineSelection = (id: string) => {
    setSelectedOfflineIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleOnlineSelection = (id: number) => {
    setSelectedOnlineIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOffline = () => {
    if (selectedOfflineIds.size === paginatedTemplates.length && paginatedTemplates.length > 0) {
      setSelectedOfflineIds(new Set());
    } else {
      setSelectedOfflineIds(new Set(paginatedTemplates.map(t => t.id)));
    }
  };

  const toggleAllOnline = () => {
    if (selectedOnlineIds.size === onlineEmails.length && onlineEmails.length > 0) {
      setSelectedOnlineIds(new Set());
    } else {
      setSelectedOnlineIds(new Set(onlineEmails.map(e => e.id)));
    }
  };

  // Ações em lote - Offline
  const handleBatchDeleteOffline = async () => {
    if (!confirm(`Deseja excluir ${selectedOfflineIds.size} email(s)?\n\nEsta ação não pode ser desfeita!`)) return;

    setBatchDeleting(true);
    try {
      for (const id of selectedOfflineIds) {
        await deleteTemplate(id);
      }
      setSelectedOfflineIds(new Set());
      await reloadTemplates();
      toast({ title: 'Emails excluídos com sucesso' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir emails',
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setBatchDeleting(false);
    }
  };

  // Ações em lote - Online
  const handleBatchDeleteOnline = async () => {
    if (!confirm(`Deseja excluir ${selectedOnlineIds.size} email(s) do Marketing Cloud?\n\nAtenção: Esta ação não pode ser desfeita!`)) return;

    setBatchDeleting(true);
    try {
      for (const id of selectedOnlineIds) {
        await sendToExtension('DELETE_EMAIL', { assetId: id });
      }
      setSelectedOnlineIds(new Set());
      await loadOnlineEmails(onlinePage, onlineSearchQuery, filterCategory?.id || null);
      toast({ title: 'Emails excluídos com sucesso' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir emails',
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setBatchDeleting(false);
    }
  };

  // Carregar categorias do SFMC
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await sendToExtension('LIST_CATEGORIES');
      if (response.success) {
        setSfmcCategories(response.items || []);
      } else {
        throw new Error(response.error || 'Erro ao carregar pastas');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar pastas',
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  // Mover emails online para pasta
  const handleBatchMoveOnline = async (categoryId: number, categoryName: string) => {
    setBatchMoving(true);
    try {
      for (const id of selectedOnlineIds) {
        await sendToExtension('MOVE_ASSET', { assetId: id, categoryId });
      }
      setSelectedOnlineIds(new Set());
      setIsMoveModalOpen(false);
      await loadOnlineEmails(onlinePage, onlineSearchQuery, filterCategory?.id || null);
      toast({ title: `${selectedOnlineIds.size} email(s) movido(s) para "${categoryName}"` });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao mover emails',
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setBatchMoving(false);
    }
  };

  const openMoveModal = () => {
    loadCategories();
    setIsMoveModalOpen(true);
  };

  return (
    <>
    <div className="p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Email Builder</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus templates de email
            </p>
          </div>
          {activeTab === 'offline' && (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsDatasetModalOpen(true)}>
                <Database className="h-4 w-4 mr-2" />
                Dataset
              </Button>
              <Button variant="ghost" onClick={() => setIsUseModelDialogOpen(true)}>
                Usar Modelo
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateWithAIModalOpen(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Criar com IA
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Email
              </Button>
            </div>
          )}
          {activeTab === 'online' && (
            <Button 
              variant="outline" 
              onClick={() => loadOnlineEmails(onlinePage, onlineSearchQuery)}
              disabled={onlineLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${onlineLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'offline' | 'online')} className="mb-4">
          <TabsList>
            <TabsTrigger value="offline" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Emails Offline
            </TabsTrigger>
            <TabsTrigger value="online" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Emails Online
              {extensionConnected && (
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab Offline */}
          <TabsContent value="offline" className="mt-4">
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
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Preview</TableHead>
                      <TableHead>Criado por</TableHead>
                      <TableHead>Atualizado em</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
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
                      <TableHead className="w-[40px]">
                        <Checkbox 
                          checked={selectedOfflineIds.size === paginatedTemplates.length && paginatedTemplates.length > 0}
                          onCheckedChange={toggleAllOffline}
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Preview</TableHead>
                      <TableHead>Criado por</TableHead>
                      <TableHead>Atualizado em</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTemplates.map((template) => (
                      <TableRow key={template.id} className={selectedOfflineIds.has(template.id) ? 'bg-muted/50' : ''}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedOfflineIds.has(template.id)}
                            onCheckedChange={() => toggleOfflineSelection(template.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {template.subject || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {template.preview_text || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.creator?.full_name || template.creator?.email || '-'}
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
          </TabsContent>

          {/* Tab Online */}
          <TabsContent value="online" className="mt-4">
            {!extensionConnected && !onlineLoading ? (
              <div className="text-center py-12 border rounded-lg bg-muted/30">
                <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Extensão não conectada</h3>
                <p className="text-muted-foreground mb-4">
                  Instale e configure a extensão SFMC Proxy para acessar emails do Marketing Cloud
                </p>
                <Button variant="outline" onClick={() => loadOnlineEmails(1, '')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <>
                {/* Search bar */}
                <div className="mb-4">
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar emails no Marketing Cloud..."
                        value={onlineSearchQuery}
                        onChange={(e) => handleOnlineSearchChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleOnlineSearch()}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={handleOnlineSearch} disabled={onlineLoading}>
                      Buscar
                    </Button>
                  </div>
                </div>

                {/* Badge de filtro por pasta */}
                {filterCategory && (
                  <div className="mb-4 flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                      <FolderOpen className="h-3 w-3" />
                      {filterCategory.name}
                      <button 
                        onClick={clearCategoryFilter}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                )}

                {onlineLoading ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Pasta</TableHead>
                          <TableHead>Modificado em</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : onlineEmails.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/30">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      {onlineSearchQuery || filterCategory ? 'Nenhum resultado encontrado' : 'Nenhum email encontrado'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {onlineSearchQuery || filterCategory
                        ? 'Tente buscar com outros termos ou limpar o filtro' 
                        : 'Não há emails no Marketing Cloud'}
                    </p>
                    {(onlineSearchQuery || filterCategory) && (
                      <Button variant="outline" onClick={() => { setOnlineSearchQuery(''); clearCategoryFilter(); }}>
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox 
                              checked={selectedOnlineIds.size === onlineEmails.length && onlineEmails.length > 0}
                              onCheckedChange={toggleAllOnline}
                            />
                          </TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Pasta</TableHead>
                          <TableHead>Modificado em</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {onlineEmails.map((email) => (
                          <TableRow key={email.id} className={selectedOnlineIds.has(email.id) ? 'bg-muted/50' : ''}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedOnlineIds.has(email.id)}
                                onCheckedChange={() => toggleOnlineSelection(email.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{email.name}</TableCell>
                            <TableCell>
                              {email.category ? (
                                <button
                                  onClick={() => handleCategoryClick({ id: email.category!.id, name: email.category!.name })}
                                  className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                                >
                                  <FolderOpen className="h-3 w-3" />
                                  {email.category.name}
                                </button>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {email.modifiedDate 
                                ? format(new Date(email.modifiedDate), 'dd/MM/yyyy HH:mm') 
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" disabled={loadingEmailId === email.id || deletingEmailId === email.id}>
                                    {(loadingEmailId === email.id || deletingEmailId === email.id) ? (
                                      <Loader className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => handleEditOnlineEmail(email)}
                                    disabled={loadingEmailId !== null || deletingEmailId !== null}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeleteOnlineEmail(email)}
                                    disabled={loadingEmailId !== null || deletingEmailId !== null}
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
                    {onlineTotalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="text-sm text-muted-foreground">
                          Mostrando {((onlinePage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(onlinePage * ITEMS_PER_PAGE, onlineTotalCount)} de {onlineTotalCount} emails
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadOnlineEmails(onlinePage - 1, onlineSearchQuery)}
                            disabled={onlinePage === 1 || onlineLoading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="text-sm">
                            Página {onlinePage} de {onlineTotalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadOnlineEmails(onlinePage + 1, onlineSearchQuery)}
                            disabled={onlinePage === onlineTotalPages || onlineLoading}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>

    {/* Footer de ações em lote - Emails Offline */}
    {selectedOfflineIds.size > 0 && activeTab === 'offline' && (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedOfflineIds.size} email(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={handleBatchDeleteOffline}
              disabled={batchDeleting}
            >
              {batchDeleting ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </Button>
            <Button variant="ghost" onClick={() => setSelectedOfflineIds(new Set())}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Footer de ações em lote - Emails Online */}
    {selectedOnlineIds.size > 0 && activeTab === 'online' && (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedOnlineIds.size} email(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={openMoveModal}
              disabled={batchMoving || batchDeleting}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Mover para pasta
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBatchDeleteOnline}
              disabled={batchDeleting || batchMoving}
            >
              {batchDeleting ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </Button>
            <Button variant="ghost" onClick={() => setSelectedOnlineIds(new Set())}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Modal de seleção de pasta */}
    <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mover para pasta</DialogTitle>
          <DialogDescription>
            Selecione a pasta de destino para {selectedOnlineIds.size} email(s)
          </DialogDescription>
        </DialogHeader>
        {loadingCategories ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sfmcCategories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma pasta encontrada
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {sfmcCategories.map((category) => (
                <Button
                  key={category.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleBatchMoveOnline(category.id, category.name)}
                  disabled={batchMoving}
                >
                  {batchMoving ? (
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FolderOpen className="h-4 w-4 mr-2" />
                  )}
                  {category.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>

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
                  <TableHead>Preview</TableHead>
                  <TableHead>Atualizado em</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {model.subject || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {model.preview_text || '-'}
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
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <CreateWithAIModal 
      open={isCreateWithAIModalOpen} 
      onClose={() => setIsCreateWithAIModalOpen(false)} 
    />

    <DatasetModal
      open={isDatasetModalOpen}
      onOpenChange={setIsDatasetModalOpen}
    />
    </>
  );
};

export default EmailTemplates;
