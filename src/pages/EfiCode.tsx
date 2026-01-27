import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Copy, Trash2, ExternalLink, Globe, GlobeLock, HardDrive, Cloud, RefreshCw, Search, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEfiCodeSites, EfiCodeSite } from '@/hooks/useEfiCodeSites';
import { checkExtensionInstalled, listCloudPages, getCloudPage, deleteCloudPage, CloudPage } from '@/lib/extensionProxy';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 25;

export default function EfiCode() {
  const navigate = useNavigate();
  const { sites, isLoading, createSite, deleteSite, duplicateSite } = useEfiCodeSites();
  
  // Estados para abas
  const [activeTab, setActiveTab] = useState<'offline' | 'online'>('offline');
  
  // Estados offline (existentes)
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState<EfiCodeSite | null>(null);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDescription, setNewSiteDescription] = useState('');

  // Estados online (Cloud Pages SFMC)
  const [onlinePages, setOnlinePages] = useState<CloudPage[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlinePage, setOnlinePage] = useState(1);
  const [onlineTotalCount, setOnlineTotalCount] = useState(0);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [showDeleteOnlineDialog, setShowDeleteOnlineDialog] = useState(false);
  const [selectedOnlinePage, setSelectedOnlinePage] = useState<CloudPage | null>(null);
  const [deletingOnline, setDeletingOnline] = useState(false);
  const [importingPage, setImportingPage] = useState<number | null>(null);

  // Carregar Cloud Pages do SFMC
  const loadOnlinePages = useCallback(async (page = 1, search = '') => {
    setOnlineLoading(true);
    try {
      const isConnected = await checkExtensionInstalled();
      setExtensionConnected(isConnected);
      
      if (!isConnected) {
        setOnlinePages([]);
        setOnlineTotalCount(0);
        return;
      }
      
      const response = await listCloudPages(page, ITEMS_PER_PAGE, search);
      
      if (response.success) {
        setOnlinePages(response.items || []);
        setOnlineTotalCount(response.count || 0);
        setOnlinePage(page);
      } else {
        toast.error(response.error || 'Erro ao carregar Cloud Pages');
      }
    } catch (error) {
      console.error('Erro ao carregar Cloud Pages:', error);
      toast.error('Erro ao conectar com a extensão');
    } finally {
      setOnlineLoading(false);
    }
  }, []);

  // Carregar ao mudar para aba online
  useEffect(() => {
    if (activeTab === 'online') {
      loadOnlinePages(1, onlineSearchQuery);
    }
  }, [activeTab, loadOnlinePages]);

  // Pesquisa com debounce
  useEffect(() => {
    if (activeTab !== 'online') return;
    
    const timer = setTimeout(() => {
      loadOnlinePages(1, onlineSearchQuery);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [onlineSearchQuery, activeTab, loadOnlinePages]);

  const handleCreate = async () => {
    if (!newSiteName.trim()) return;
    
    const result = await createSite.mutateAsync({
      name: newSiteName,
      description: newSiteDescription,
    });
    
    setShowNewDialog(false);
    setNewSiteName('');
    setNewSiteDescription('');
    navigate(`/efi-code/${result.id}`);
  };

  const handleDelete = async () => {
    if (!selectedSite) return;
    await deleteSite.mutateAsync(selectedSite.id);
    setShowDeleteDialog(false);
    setSelectedSite(null);
  };

  const handleDuplicate = async (site: EfiCodeSite) => {
    const result = await duplicateSite.mutateAsync(site);
    navigate(`/efi-code/${result.id}`);
  };

  // Deletar Cloud Page online
  const handleDeleteOnline = async () => {
    if (!selectedOnlinePage) return;
    
    setDeletingOnline(true);
    try {
      const response = await deleteCloudPage(selectedOnlinePage.id);
      
      if (response.success) {
        toast.success('Cloud Page excluída com sucesso');
        loadOnlinePages(onlinePage, onlineSearchQuery);
      } else {
        toast.error(response.error || 'Erro ao excluir Cloud Page');
      }
    } catch (error) {
      toast.error('Erro ao excluir Cloud Page');
    } finally {
      setDeletingOnline(false);
      setShowDeleteOnlineDialog(false);
      setSelectedOnlinePage(null);
    }
  };

  // Importar Cloud Page para edição local
  const handleImportCloudPage = async (cloudPage: CloudPage) => {
    setImportingPage(cloudPage.id);
    try {
      const response = await getCloudPage(cloudPage.id);
      
      if (!response.success) {
        toast.error(response.error || 'Erro ao buscar Cloud Page');
        return;
      }

      // Extrair HTML do conteúdo
      let htmlContent = '';
      if (response.views?.html?.content) {
        htmlContent = response.views.html.content;
      } else if (response.content) {
        htmlContent = response.content;
      }

      // Criar novo site offline com o conteúdo importado
      const result = await createSite.mutateAsync({
        name: `Cópia de ${cloudPage.name}`,
        description: `Importado do Marketing Cloud em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        html_content: htmlContent,
      });

      toast.success('Cloud Page importada com sucesso');
      navigate(`/efi-code/${result.id}`);
    } catch (error) {
      console.error('Erro ao importar Cloud Page:', error);
      toast.error('Erro ao importar Cloud Page');
    } finally {
      setImportingPage(null);
    }
  };

  const onlineTotalPages = Math.ceil(onlineTotalCount / ITEMS_PER_PAGE);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Efi Code</h1>
          <p className="text-muted-foreground mt-1">
            Crie páginas HTML com drag-and-drop visual
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Site
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'offline' | 'online')}>
        <TabsList className="mb-6">
          <TabsTrigger value="offline" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Sites Offline
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Sites Online
            {extensionConnected && (
              <span className="w-2 h-2 rounded-full animate-pulse bg-primary" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Aba Sites Offline (Supabase) */}
        <TabsContent value="offline">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-16 border rounded-lg bg-muted/20">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum site criado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro site com o editor visual
              </p>
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Site
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Atualizado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {site.description || '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {site.is_published ? (
                          <Badge variant="default" className="gap-1">
                            <Globe className="h-3 w-3" />
                            Publicado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <GlobeLock className="h-3 w-3" />
                            Rascunho
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {format(new Date(site.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/efi-code/${site.id}`)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(site)}
                            title="Duplicar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {site.is_published && site.slug && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/site/${site.slug}`, '_blank')}
                              title="Visualizar"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedSite(site);
                              setShowDeleteDialog(true);
                            }}
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
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
          )}
        </TabsContent>

        {/* Aba Sites Online (Marketing Cloud) */}
        <TabsContent value="online">
          {/* Barra de busca e refresh */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar Cloud Pages..."
                value={onlineSearchQuery}
                onChange={(e) => setOnlineSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadOnlinePages(onlinePage, onlineSearchQuery)}
              disabled={onlineLoading}
              title="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${onlineLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {!extensionConnected ? (
            <div className="text-center py-16 border rounded-lg bg-muted/20">
              <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Extensão não conectada</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Para acessar as Cloud Pages do Marketing Cloud, é necessário instalar e configurar a extensão SFMC Proxy.
              </p>
              <Button variant="outline" onClick={() => loadOnlinePages(1, '')}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          ) : onlineLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : onlinePages.length === 0 ? (
            <div className="text-center py-16 border rounded-lg bg-muted/20">
              <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma Cloud Page encontrada</h3>
              <p className="text-muted-foreground">
                {onlineSearchQuery ? 'Tente uma busca diferente' : 'Não há Cloud Pages no Marketing Cloud'}
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Pasta</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Atualizado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {onlinePages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {page.category?.name || '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={page.status?.name === 'Published' ? 'default' : 'secondary'}>
                            {page.status?.name === 'Published' ? 'Publicado' : page.status?.name || 'Rascunho'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {page.modifiedDate 
                            ? format(new Date(page.modifiedDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleImportCloudPage(page)}
                              disabled={importingPage === page.id}
                              title="Importar para edição"
                            >
                              {importingPage === page.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOnlinePage(page);
                                setShowDeleteOnlineDialog(true);
                              }}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
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

              {/* Paginação */}
              {onlineTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((onlinePage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(onlinePage * ITEMS_PER_PAGE, onlineTotalCount)} de {onlineTotalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadOnlinePages(onlinePage - 1, onlineSearchQuery)}
                      disabled={onlinePage <= 1 || onlineLoading}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {onlinePage} de {onlineTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadOnlinePages(onlinePage + 1, onlineSearchQuery)}
                      disabled={onlinePage >= onlineTotalPages || onlineLoading}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Novo Site */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Site</DialogTitle>
            <DialogDescription>
              Dê um nome para seu site e comece a editar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Site</Label>
              <Input
                id="name"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="Meu novo site"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={newSiteDescription}
                onChange={(e) => setNewSiteDescription(e.target.value)}
                placeholder="Uma breve descrição do site"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!newSiteName.trim() || createSite.isPending}
            >
              {createSite.isPending ? 'Criando...' : 'Criar e Editar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar Exclusão Offline */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir site?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O site "{selectedSite?.name}" será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSite.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Confirmar Exclusão Online */}
      <AlertDialog open={showDeleteOnlineDialog} onOpenChange={setShowDeleteOnlineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cloud Page?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A Cloud Page "{selectedOnlinePage?.name}" será permanentemente excluída do Marketing Cloud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOnline}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOnline}
              disabled={deletingOnline}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingOnline ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
