import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Images,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  useCampaigns,
  useDeleteCampaign,
  ImageCampaign,
} from "@/hooks/useImageCampaigns";
import { CampaignFormDialog } from "@/components/campaigns/CampaignFormDialog";
import { CampaignAssetsManager } from "@/components/campaigns/CampaignAssetsManager";

const customizationModeLabels: Record<string, string> = {
  always: "Sempre IA",
  never: "Só selo",
  user_choice: "Usuário escolhe",
};

export default function AdminImageCampaigns() {
  const [formOpen, setFormOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ImageCampaign | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<ImageCampaign | null>(null);

  const { data: campaigns = [], isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();

  const handleEdit = (campaign: ImageCampaign) => {
    setSelectedCampaign(campaign);
    setFormOpen(true);
  };

  const handleManageAssets = (campaign: ImageCampaign) => {
    setSelectedCampaign(campaign);
    setAssetsOpen(true);
  };

  const handleDelete = (campaign: ImageCampaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (campaignToDelete) {
      await deleteCampaign.mutateAsync(campaignToDelete.id);
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  const handleNewCampaign = () => {
    setSelectedCampaign(null);
    setFormOpen(true);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Gerar Imagens</h1>
                <p className="text-muted-foreground">
                  Gerencie campanhas de geração de imagens
                </p>
              </div>
              <Button onClick={handleNewCampaign}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Campanha
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p>Nenhuma campanha criada ainda.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleNewCampaign}
                >
                  Criar primeira campanha
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          {campaign.title}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`/gerar/${campaign.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            /gerar/{campaign.slug}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {customizationModeLabels[campaign.customization_mode]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {campaign.access_code ? (
                            <Badge variant="secondary">
                              {campaign.access_code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Livre
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={campaign.is_active ? "default" : "secondary"}
                          >
                            {campaign.is_active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEdit(campaign)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleManageAssets(campaign)}
                              >
                                <Images className="mr-2 h-4 w-4" />
                                Gerenciar Assets
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(campaign)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
      </div>

      <CampaignFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        campaign={selectedCampaign}
      />

      {selectedCampaign && (
        <CampaignAssetsManager
          campaignId={selectedCampaign.id}
          open={assetsOpen}
          onOpenChange={setAssetsOpen}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a campanha "{campaignToDelete?.title}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
