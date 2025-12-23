import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Copy,
  QrCode,
  Pencil,
  Trash2,
  ExternalLink,
  Link2,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useEfiLinks,
  useCreateEfiLink,
  useUpdateEfiLink,
  useDeleteEfiLink,
  EfiLink,
  EfiLinkInsert,
} from "@/hooks/useEfiLinks";
import { EfiLinkFormModal } from "@/components/efilink/EfiLinkFormModal";
import { QRCodeModal } from "@/components/efilink/QRCodeModal";

export default function EfiLinkPage() {
  const { data: links = [], isLoading } = useEfiLinks();
  const createLink = useCreateEfiLink();
  const updateLink = useUpdateEfiLink();
  const deleteLink = useDeleteEfiLink();

  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<EfiLink | null>(null);
  const [deletingLink, setDeletingLink] = useState<EfiLink | null>(null);
  const [qrCodeLink, setQrCodeLink] = useState<EfiLink | null>(null);

  const filteredLinks = links.filter((link) => {
    const query = searchQuery.toLowerCase();
    return (
      link.name?.toLowerCase().includes(query) ||
      link.url_destino?.toLowerCase().includes(query) ||
      link.utm_campaign?.toLowerCase().includes(query) ||
      link.shortened_url?.toLowerCase().includes(query)
    );
  });

  const handleCreate = () => {
    setEditingLink(null);
    setIsFormOpen(true);
  };

  const handleEdit = (link: EfiLink) => {
    setEditingLink(link);
    setIsFormOpen(true);
  };

  const handleSave = (data: Omit<EfiLinkInsert, 'user_id'>) => {
    if (editingLink) {
      updateLink.mutate(
        { id: editingLink.id, ...data },
        { onSuccess: () => setIsFormOpen(false) }
      );
    } else {
      createLink.mutate(data, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deletingLink) {
      deleteLink.mutate(deletingLink.id, {
        onSuccess: () => setDeletingLink(null),
      });
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada!");
    } catch {
      toast.error("Erro ao copiar URL");
    }
  };

  const handleShowQRCode = (link: EfiLink) => {
    const url = link.shortened_url || link.original_url;
    if (url) {
      setQrCodeLink(link);
    } else {
      toast.error("Nenhuma URL disponível para gerar QR Code");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Link2 className="h-8 w-8 text-primary" />
            Efi Link
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere links trackáveis com parâmetros UTM e AppsFlyer
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Link
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, URL ou campanha..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery
            ? "Nenhum link encontrado para esta busca"
            : "Nenhum link criado ainda. Clique em 'Novo Link' para começar."}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>URL Encurtada</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    {link.name || (
                      <span className="text-muted-foreground italic">
                        Sem nome
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {link.utm_campaign || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={link.link_pattern === 'sejaefi' ? 'default' : 'secondary'}>
                      {link.link_pattern === 'sejaefi' ? 'Deeplink' : 'OneLink'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {link.shortened_url ? (
                      <a
                        href={link.shortened_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {link.shortened_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Não encurtada
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(link.created_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleCopyUrl(link.shortened_url || link.original_url || '')
                        }
                        title="Copiar URL"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleShowQRCode(link)}
                        title="Ver QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(link)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingLink(link)}
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

      {/* Form Modal */}
      <EfiLinkFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        link={editingLink}
        onSave={handleSave}
        isSaving={createLink.isPending || updateLink.isPending}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        open={!!qrCodeLink}
        onOpenChange={(open) => !open && setQrCodeLink(null)}
        url={qrCodeLink?.shortened_url || qrCodeLink?.original_url || ''}
        linkName={qrCodeLink?.name}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingLink} onOpenChange={() => setDeletingLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir link?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O link "{deletingLink?.name || 'sem nome'}" será
              permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLink.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
