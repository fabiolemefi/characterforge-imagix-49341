import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  Target, 
  Calendar,
  ExternalLink,
  Loader2
} from "lucide-react";
import { 
  useJiraOkrs, 
  useCreateJiraOkr, 
  useUpdateJiraOkr, 
  useDeleteJiraOkr 
} from "@/hooks/useJiraTasks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { JiraOkr, CreateJiraOkrInput } from "@/types/jiraTask";

export default function JiraOkrs() {
  const navigate = useNavigate();
  const { data: okrs, isLoading } = useJiraOkrs();
  const createOkr = useCreateJiraOkr();
  const updateOkr = useUpdateJiraOkr();
  const deleteOkr = useDeleteJiraOkr();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOkr, setEditingOkr] = useState<JiraOkr | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateJiraOkrInput>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      start_date: "",
      end_date: "",
    });
    setEditingOkr(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (okr: JiraOkr) => {
    setEditingOkr(okr);
    setFormData({
      name: okr.name,
      description: okr.description || "",
      start_date: okr.start_date || "",
      end_date: okr.end_date || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingOkr) {
      await updateOkr.mutateAsync({ ...formData, id: editingOkr.id });
    } else {
      await createOkr.mutateAsync(formData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteOkr.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const isSubmitting = createOkr.isPending || updateOkr.isPending;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/jira-tasks")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">OKRs / Épicos</h1>
            <p className="text-muted-foreground">
              Cadastre os OKRs para vincular às tarefas
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo OKR
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : okrs?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum OKR cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre OKRs para vincular às suas tarefas
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro OKR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {okrs?.map((okr) => (
            <Card key={okr.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{okr.name}</CardTitle>
                      {okr.jira_epic_key && (
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => window.open(`https://sejaefi.atlassian.net/browse/${okr.jira_epic_key}`, "_blank")}
                        >
                          {okr.jira_epic_key}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Badge>
                      )}
                    </div>
                    {okr.description && (
                      <CardDescription>{okr.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditDialog(okr)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDeleteId(okr.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(okr.start_date || okr.end_date) && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {okr.start_date && (
                      <span>
                        {format(new Date(okr.start_date), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                    )}
                    {okr.start_date && okr.end_date && <span>→</span>}
                    {okr.end_date && (
                      <span>
                        {format(new Date(okr.end_date), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingOkr ? "Editar OKR" : "Novo OKR"}
            </DialogTitle>
            <DialogDescription>
              {editingOkr 
                ? "Atualize as informações do OKR"
                : "Cadastre um novo OKR para vincular às tarefas"
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Aumentar engajamento no Instagram"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                {!editingOkr && (
                  <p className="text-xs text-muted-foreground">
                    Um épico será criado automaticamente no Jira com este nome
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o objetivo deste OKR..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data de Fim</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingOkr ? (
                  "Salvar Alterações"
                ) : (
                  "Criar OKR"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover OKR?</AlertDialogTitle>
            <AlertDialogDescription>
              Este OKR será desativado e não aparecerá mais na lista.
              As tarefas já criadas não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
