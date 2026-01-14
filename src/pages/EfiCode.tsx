import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Copy, Trash2, ExternalLink, Globe, GlobeLock } from 'lucide-react';
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
import { useEfiCodeSites, EfiCodeSite } from '@/hooks/useEfiCodeSites';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EfiCode() {
  const navigate = useNavigate();
  const { sites, isLoading, createSite, deleteSite, duplicateSite } = useEfiCodeSites();
  
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState<EfiCodeSite | null>(null);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDescription, setNewSiteDescription] = useState('');

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

      {/* AlertDialog: Confirmar Exclusão */}
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
    </div>
  );
}
